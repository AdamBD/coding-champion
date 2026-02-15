import { GoogleGenAI } from '@google/genai'
import type { Chat } from '@google/genai'
import { getSchemaContext } from './schema-context'
import { getDb } from './db'
import { pollDeepResearch } from './deep-research'

// In-memory session storage for active Chat instances
const sessions = new Map<string, ChatSession>()

export interface ChatSession {
  session_id: string
  chat: Chat
  created_at: Date
  expires_at: Date
  schema_sent: boolean // Track if schema context has been sent
  deep_research_interaction_id?: string // Deep Research interaction ID if in progress
  deep_research_status?: 'pending' | 'running' | 'completed' | 'failed' | 'in_progress'
  deep_research_started_at?: Date // Timestamp when Deep Research started
  deep_research_progress?: number // Current progress percentage
}

// Initialize Gemini client (reads GEMINI_API_KEY from env automatically)
const ai = new GoogleGenAI({})

/**
 * Get or create a chat session
 */
export async function getOrCreateChatSession(sessionId?: string): Promise<ChatSession> {
  // Generate session ID if not provided
  const id = sessionId || generateSessionId()

  // Check if session exists in memory and is still valid
  const existing = sessions.get(id)
  if (existing && existing.expires_at > new Date()) {
    return existing
  }

  // Check if session exists in database
  const db = await getDb()
  const userResult = await db.query('SELECT id FROM users LIMIT 1')
  const userId = userResult.rows[0]?.id

  if (!userId) {
    throw new Error('No user found')
  }

  // Try to load from database
  const dbSessionResult = await db.query(
    'SELECT * FROM quest_chat_sessions WHERE session_id = $1',
    [id]
  )

  // Schema is now set via systemInstruction, so we always mark it as sent
  // (it's applied automatically when chat is created)
  const schemaSent = true

  if (dbSessionResult.rows.length === 0) {
    // Create new session in database
    await db.query(
      `INSERT INTO quest_chat_sessions (session_id, user_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (session_id) DO NOTHING`,
      [id, userId]
    )
  }

  // Load conversation history from database if session exists
  let history: Array<{ role: string; parts: Array<{ text: string }> }> = []

  if (dbSessionResult.rows.length > 0) {
    const messagesResult = await db.query(
      `SELECT role, content FROM quest_chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [id]
    )

    // Convert database messages to Gemini Content format
    // History must alternate between 'user' and 'model' roles
    // Note: We include all messages including schema context since it's part of the conversation
    history = messagesResult.rows.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))
  }

  // Get schema context for system instruction
  const schemaContext = getSchemaContext()

  // Create Gemini chat session with restored history and system instruction
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history.length > 0 ? history as any : undefined,
    config: {
      systemInstruction: schemaContext,
    },
  })

  // Load Deep Research status from database if session exists
  let deepResearchInteractionId: string | undefined = undefined
  let deepResearchStatus: 'pending' | 'running' | 'completed' | 'failed' | undefined = undefined
  let deepResearchStartedAt: Date | undefined = undefined
  let deepResearchProgress: number | undefined = undefined

  if (dbSessionResult.rows.length > 0) {
    const dbSession = dbSessionResult.rows[0]
    deepResearchInteractionId = dbSession.deep_research_interaction_id
    deepResearchStatus = dbSession.deep_research_status
    deepResearchStartedAt = dbSession.deep_research_started_at
    deepResearchProgress = dbSession.deep_research_progress
  }

  const session: ChatSession = {
    session_id: id,
    chat,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    schema_sent: schemaSent,
    deep_research_interaction_id: deepResearchInteractionId,
    deep_research_status: deepResearchStatus,
    deep_research_started_at: deepResearchStartedAt,
    deep_research_progress: deepResearchProgress,
  }

  sessions.set(id, session)

  // Resume polling if Deep Research is still running
  if (deepResearchInteractionId &&
    (deepResearchStatus === 'running' || deepResearchStatus === 'pending')) {
    console.log(`[Chat Session] Resuming Deep Research polling for session ${id}, interaction ${deepResearchInteractionId}`)
    // Call resume function (defined below)
    resumeDeepResearchPolling(deepResearchInteractionId, id).catch(err => {
      console.error(`[Chat Session] Error resuming Deep Research:`, err)
    })
  } else if (deepResearchInteractionId && deepResearchStatus === 'completed') {
    // Check if Deep Research completed but report wasn't sent to chat
    // This can happen if the original polling loop didn't complete properly
    console.log(`[Chat Session] Deep Research marked as completed, checking if report was sent...`)
    checkAndProcessCompletedDeepResearch(deepResearchInteractionId, id).catch((err: Error) => {
      console.error(`[Chat Session] Error checking completed Deep Research:`, err)
    })
  }

  return session
}

/**
 * Get chat session by ID
 */
export function getChatSession(sessionId: string): ChatSession | null {
  const session = sessions.get(sessionId)
  if (session && session.expires_at > new Date()) {
    return session
  }
  return null
}

/**
 * Ensure schema context is set (now handled via systemInstruction in chat config)
 * This function is kept for backwards compatibility but schema is set at chat creation
 */
export async function ensureSchemaContext(session: ChatSession): Promise<void> {
  // Schema context is now set via systemInstruction in chat config
  // No need to send as a message - it's automatically applied to all messages
  if (!session.schema_sent) {
    session.schema_sent = true
  }
}

/**
 * Save a message to the database
 */
export async function saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  const db = await getDb()
  await db.query(
    `INSERT INTO quest_chat_messages (session_id, role, content)
     VALUES ($1, $2, $3)`,
    [sessionId, role, content]
  )

  // Update session updated_at timestamp
  await db.query(
    `UPDATE quest_chat_sessions 
     SET updated_at = CURRENT_TIMESTAMP
     WHERE session_id = $1`,
    [sessionId]
  )

  // Auto-generate title from first user message if title is null
  if (role === 'user') {
    const sessionResult = await db.query(
      'SELECT title FROM quest_chat_sessions WHERE session_id = $1',
      [sessionId]
    )

    if (sessionResult.rows[0]?.title === null) {
      // Generate title from first message (truncate to 200 chars)
      const title = content.length > 200
        ? content.substring(0, 197) + '...'
        : content

      await db.query(
        `UPDATE quest_chat_sessions 
         SET title = $1
         WHERE session_id = $2 AND title IS NULL`,
        [title, sessionId]
      )
    }
  }
}

/**
 * Update Deep Research status in database
 */
export async function updateDeepResearchStatus(
  sessionId: string,
  interactionId: string | null,
  status: 'pending' | 'running' | 'completed' | 'failed',
  startedAt?: Date
): Promise<void> {
  const db = await getDb()

  if (status === 'running' && startedAt) {
    // When starting, set the start time and reset progress to 1
    await db.query(
      `UPDATE quest_chat_sessions 
       SET deep_research_interaction_id = $1,
           deep_research_status = $2,
           deep_research_started_at = $3,
           deep_research_progress = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $4`,
      [interactionId, status, startedAt, sessionId]
    )
  } else {
    // For other statuses, just update status
    await db.query(
      `UPDATE quest_chat_sessions 
       SET deep_research_interaction_id = $1,
           deep_research_status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $3`,
      [interactionId, status, sessionId]
    )
  }
}

/**
 * Resume Deep Research polling for an existing interaction
 * This is called when a session is loaded that has an ongoing Deep Research
 */
async function resumeDeepResearchPolling(interactionId: string, sessionId: string): Promise<void> {
  console.log(`[Chat Session] Starting resume polling for interaction ${interactionId}, session ${sessionId}`)

  // Check current status from Gemini API first
  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({})
    const currentResult = await ai.interactions.get(interactionId)

    if (currentResult.status === 'completed') {
      // Already completed! Process it immediately
      console.log(`[Chat Session] Deep Research already completed, processing result...`)
      await processCompletedDeepResearch(interactionId, sessionId, currentResult)
      return
    } else if (currentResult.status === 'failed') {
      // Already failed
      console.log(`[Chat Session] Deep Research already failed`)
      await updateDeepResearchStatus(sessionId, interactionId, 'failed')
      return
    }

    // Still running, resume polling
    console.log(`[Chat Session] Deep Research still ${currentResult.status}, resuming polling...`)
    pollDeepResearch(interactionId, sessionId, async (status, progress) => {
      const currentSession = getChatSession(sessionId)
      if (currentSession) {
        currentSession.deep_research_status = status as any
        await updateDeepResearchStatus(sessionId, interactionId, status as any)
      }
    }).then(async (result) => {
      await processCompletedDeepResearch(interactionId, sessionId, result as any)
    }).catch(async (error: Error) => {
      console.error(`[Chat Session] Error resuming Deep Research polling:`, error)
      const currentSession = getChatSession(sessionId)
      if (currentSession) {
        const errorMessage = `An error occurred while resuming the analysis: ${error.message}`
        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({})
        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: [], // Will be loaded from DB if needed
        })
        const errorResponse = await chat.sendMessage({ message: errorMessage })
        await saveMessage(sessionId, 'assistant', errorResponse.text || errorMessage)
        await updateDeepResearchStatus(sessionId, interactionId, 'failed')
      }
    })
  } catch (error) {
    console.error(`[Chat Session] Error checking Deep Research status during resume:`, error)
  }
}

/**
 * Check if a completed Deep Research has its report sent to chat
 * If not, fetch the result from Gemini API and process it
 * This function is exported so it can be called from API endpoints
 */
export async function checkAndProcessCompletedDeepResearch(interactionId: string, sessionId: string): Promise<void> {
  // Check if there's already an assistant message about Deep Research completion
  const db = await getDb()
  const messagesResult = await db.query(
    `SELECT content FROM quest_chat_messages 
     WHERE session_id = $1 AND role = 'assistant' 
     ORDER BY created_at DESC LIMIT 5`,
    [sessionId]
  )

  // Check if any message contains Deep Research completion text
  const hasReportMessage = messagesResult.rows.some(row =>
    row.content.includes('completed analyzing') ||
    row.content.includes('Here\'s what I found')
  )

  if (hasReportMessage) {
    console.log(`[Chat Session] Deep Research report already sent to chat for session ${sessionId}`)
    return
  }

  // No report message found, fetch from Gemini API and process
  console.log(`[Chat Session] No report message found, fetching from Gemini API for interaction ${interactionId}...`)
  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({})
    console.log(`[Chat Session] Calling ai.interactions.get(${interactionId})...`)
    const result = await ai.interactions.get(interactionId)
    console.log(`[Chat Session] Got result: status=${result.status}, outputs.length=${result.outputs?.length || 0}`)

    if (result.status === 'completed') {
      console.log(`[Chat Session] Processing completed Deep Research...`)
      await processCompletedDeepResearch(interactionId, sessionId, result)
      console.log(`[Chat Session] Completed processing Deep Research`)
    } else {
      console.log(`[Chat Session] Deep Research status is ${result.status}, not completed`)
    }
  } catch (error) {
    console.error(`[Chat Session] Error fetching completed Deep Research:`, error)
    if (error instanceof Error) {
      console.error(`[Chat Session] Error details: ${error.message}`)
      console.error(`[Chat Session] Error stack: ${error.stack}`)
    }
  }
}

/**
 * Process a completed Deep Research result
 */
async function processCompletedDeepResearch(
  interactionId: string,
  sessionId: string,
  result: { status: string; outputs?: Array<{ type: string; text?: string }> }
): Promise<void> {
  console.log(`[Chat Session] Processing completed Deep Research for session ${sessionId}`)

  // Restore session from database if not in memory
  let currentSession = getChatSession(sessionId)
  if (!currentSession) {
    currentSession = await getOrCreateChatSession(sessionId)
  }
  if (!currentSession) {
    console.error(`[Chat Session] Could not restore session ${sessionId} for processing Deep Research result`)
    return
  }

  // Extract report from outputs
  let report = ''
  if (result.outputs && result.outputs.length > 0) {
    const lastOutput = result.outputs[result.outputs.length - 1]
    if (lastOutput.type === 'text' && 'text' in lastOutput) {
      report = lastOutput.text || ''
    } else {
      report = JSON.stringify(lastOutput, null, 2)
    }
  }

  if (result.status === 'completed' && report) {
    // Get the URL from the session (we stored it when starting Deep Research)
    const db = await getDb()
    const sessionResult = await db.query(
      `SELECT m.content FROM quest_chat_messages m 
       WHERE m.session_id = $1 AND m.role = 'user' 
       ORDER BY m.created_at DESC LIMIT 1`,
      [sessionId]
    )
    const userMessage = sessionResult.rows[0]?.content || ''
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/i)
    const url = urlMatch ? urlMatch[0] : 'the course'

    const reportMessage = `I've completed analyzing ${url}. Here's what I found:\n\n${report}\n\nBased on this analysis, I can help you create a quest structure. When you're ready, just ask me to create the quest and I'll generate a structured JSON format with the quest details and steps.`

    const reportResponse = await currentSession.chat.sendMessage({
      message: reportMessage,
    })

    const reportChatResponse = reportResponse.text || reportMessage
    await saveMessage(currentSession.session_id, 'assistant', reportChatResponse)

    currentSession.deep_research_status = 'completed'
    await updateDeepResearchStatus(currentSession.session_id, interactionId, 'completed')
    console.log(`[Chat Session] Deep Research report sent to chat and saved`)
  } else if (result.status === 'completed') {
    // Completed but no report
    const fallbackMessage = `I've completed analyzing the course, but couldn't extract a detailed report. The analysis is complete - I can help you create a quest structure based on this course!`
    const fallbackResponse = await currentSession.chat.sendMessage({
      message: fallbackMessage,
    })
    await saveMessage(currentSession.session_id, 'assistant', fallbackResponse.text || fallbackMessage)
    await updateDeepResearchStatus(currentSession.session_id, interactionId, 'completed')
  }
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): void {
  const now = new Date()
  for (const [id, session] of sessions.entries()) {
    if (session.expires_at <= now) {
      sessions.delete(id)
    }
  }
}

