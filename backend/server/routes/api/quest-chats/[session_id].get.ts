import { eventHandler, getRouterParam, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../../utils/db'
import { getOrCreateChatSession } from '../../../utils/chat-session'

// GET /api/quest-chats/:session_id - Get chat history for a specific session
export default eventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    sendNoContent(event, 204)
    return
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  try {
    const sessionId = getRouterParam(event, 'session_id')

    if (!sessionId) {
      return { error: 'session_id is required' }
    }

    // Trigger session creation/restoration - this will check for completed Deep Research
    // and process it if needed
    console.log(`[Quest Chats GET] Loading session ${sessionId}, triggering getOrCreateChatSession...`)
    await getOrCreateChatSession(sessionId)
    console.log(`[Quest Chats GET] Session loaded, checking messages...`)

    const db = await getDb()

    // Get session info
    const sessionResult = await db.query(
      'SELECT * FROM quest_chat_sessions WHERE session_id = $1',
      [sessionId]
    )

    if (sessionResult.rows.length === 0) {
      return { error: 'Chat session not found' }
    }

    const session = sessionResult.rows[0]

    // Get all messages for this session
    const messagesResult = await db.query(
      `SELECT role, content, created_at 
       FROM quest_chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    )

    return {
      session: {
        id: session.id,
        session_id: session.session_id,
        title: session.title,
        status: session.status,
        created_at: session.created_at,
        updated_at: session.updated_at,
        deep_research_interaction_id: session.deep_research_interaction_id,
        deep_research_status: session.deep_research_status,
      },
      messages: messagesResult.rows.map(row => ({
        role: row.role,
        content: row.content,
        created_at: row.created_at,
      })),
    }
  } catch (error) {
    return {
      error: 'Failed to get chat history',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

