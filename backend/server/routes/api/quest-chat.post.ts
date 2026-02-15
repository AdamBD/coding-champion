import { eventHandler, readBody, setResponseHeader, sendNoContent } from 'h3'
import { getOrCreateChatSession, saveMessage, getChatSession, updateDeepResearchStatus } from '../../utils/chat-session'
import { extractUrl, startDeepResearch, pollDeepResearch } from '../../utils/deep-research'
import { generateQuestStructureFromReport } from '../../utils/quest-generator'
import { getDb } from '../../utils/db'

// POST /api/quest-chat - Chat message handler
export default eventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    sendNoContent(event, 204)
    return
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  try {
    const body = await readBody(event) as { message?: string; session_id?: string }
    const { message, session_id } = body

    if (!message || typeof message !== 'string') {
      return { error: 'message is required' }
    }

    // Get or create chat session
    // Schema context is automatically set via systemInstruction in chat config
    const session = await getOrCreateChatSession(session_id)

    // Save user message to database
    await saveMessage(session.session_id, 'user', message)

    // Check if message contains a URL
    const url = extractUrl(message)
    console.log(`[Quest Chat] Message: "${message.substring(0, 100)}..."`)
    console.log(`[Quest Chat] Extracted URL: ${url || 'none'}`)

    if (url) {
      // URL detected - start Deep Research
      console.log(`[Quest Chat] URL detected: ${url}`)
      try {
        console.log(`[Quest Chat] Starting Deep Research for: ${url}`)
        const interactionId = await startDeepResearch(url)
        console.log(`[Quest Chat] Deep Research started with interaction ID: ${interactionId}`)

        // Store interaction ID in session
        session.deep_research_interaction_id = interactionId
        session.deep_research_status = 'running'
        const researchStartTime = new Date()
        await updateDeepResearchStatus(session.session_id, interactionId, 'running', researchStartTime)

        // Don't send a chat message here - we'll send it when Deep Research completes
        // Just return status immediately so user knows research has started

        // Start background polling (don't await - return immediately)
        // Backend manages all polling and updates database
        pollDeepResearch(interactionId, session.session_id, async (status, progress) => {
          // Update session status and progress in memory and database
          const currentSession = getChatSession(session.session_id)
          if (currentSession) {
            currentSession.deep_research_status = status as any
            await updateDeepResearchStatus(session.session_id, interactionId, status as any)
          }
        }).then(async (result) => {
          console.log(`[Quest Chat] Deep Research promise resolved with status: ${result.status}, has report: ${!!result.report}, report length: ${result.report?.length || 0}`)

          // Restore session from database if not in memory (session might have expired)
          let currentSession = getChatSession(session.session_id)
          if (!currentSession) {
            console.log(`[Quest Chat] Session not in memory, restoring from database: ${session.session_id}`)
            currentSession = await getOrCreateChatSession(session.session_id)
          }

          if (!currentSession) {
            console.error(`[Quest Chat] ERROR: Could not restore session ${session.session_id} from database`)
            return
          }

          if (result.status === 'completed' && result.report) {
            console.log(`[Quest Chat] Sending Deep Research report to chat (report length: ${result.report.length})`)

            // Send Deep Research report to chat
            // Don't ask it to generate SQL - just present the report and wait for user to ask for quest creation
            const reportMessage = `I've completed analyzing ${url}. Here's what I found:\n\n${result.report}\n\nBased on this analysis, I can help you create a quest structure. When you're ready, just ask me to create the quest and I'll generate it in a structured format.`

            const reportResponse = await currentSession.chat.sendMessage({
              message: reportMessage,
            })

            const reportChatResponse = reportResponse.text || reportMessage
            console.log(`[Quest Chat] Report sent to chat, saving to database...`)

            // Save report to database
            await saveMessage(currentSession.session_id, 'assistant', reportChatResponse)
            console.log(`[Quest Chat] Report saved to database successfully`)

            // Update session status in memory and database
            currentSession.deep_research_status = 'completed'
            await updateDeepResearchStatus(currentSession.session_id, interactionId, 'completed')
          } else if (result.status === 'failed') {
            const errorMessage = `I encountered an error while analyzing ${url}: ${result.error || 'Unknown error'}. Please try again or provide more details about the course.`

            const errorResponse = await currentSession.chat.sendMessage({
              message: errorMessage,
            })

            const errorChatResponse = errorResponse.text || errorMessage
            await saveMessage(currentSession.session_id, 'assistant', errorChatResponse)

            currentSession.deep_research_status = 'failed'
            await updateDeepResearchStatus(currentSession.session_id, interactionId, 'failed')
          } else {
            console.log(`[Quest Chat] Deep Research completed but condition failed - status: ${result.status}, has report: ${!!result.report}, report length: ${result.report?.length || 0}`)
            // Even if report is empty, send a message to the user
            if (result.status === 'completed') {
              const fallbackMessage = `I've completed analyzing ${url}, but couldn't extract a detailed report. The analysis is complete - I can help you create a quest structure based on this course!`
              const fallbackResponse = await currentSession.chat.sendMessage({
                message: fallbackMessage,
              })
              const fallbackChatResponse = fallbackResponse.text || fallbackMessage
              await saveMessage(currentSession.session_id, 'assistant', fallbackChatResponse)
              console.log(`[Quest Chat] Sent fallback message to chat`)
            }
          }
        }).catch(async (error) => {
          console.error(`[Quest Chat] Error in Deep Research completion handler:`, error)

          // Restore session from database if not in memory
          let currentSession = getChatSession(session.session_id)
          if (!currentSession) {
            console.log(`[Quest Chat] Session not in memory during error, restoring from database: ${session.session_id}`)
            currentSession = await getOrCreateChatSession(session.session_id)
          }
          if (!currentSession) return

          const errorMessage = `An error occurred during analysis: ${error.message}`
          const errorResponse = await currentSession.chat.sendMessage({
            message: errorMessage,
          })
          await saveMessage(currentSession.session_id, 'assistant', errorResponse.text || errorMessage)
          currentSession.deep_research_status = 'failed'
          await updateDeepResearchStatus(session.session_id, interactionId, 'failed')
        })

        return {
          type: 'researching',
          session_id: session.session_id,
          interaction_id: interactionId,
          status: 'researching',
          chat_response: `I've started analyzing the course at ${url}. This may take a few minutes. I'll let you know when the analysis is complete!`,
          message: 'Deep Research started. Analysis in progress...',
        }
      } catch (error) {
        // If Deep Research fails to start, log error and continue with normal chat
        console.error(`[Quest Chat] Failed to start Deep Research:`, error)
        const errorMsg = `I detected a URL (${url}), but couldn't start the analysis. ${error instanceof Error ? error.message : 'Unknown error'}. Let me try to help you create a quest anyway!`

        const response = await session.chat.sendMessage({
          message: errorMsg,
        })

        const chatResponse = response.text || errorMsg
        await saveMessage(session.session_id, 'assistant', chatResponse)

        return {
          type: 'message',
          session_id: session.session_id,
          chat_response: chatResponse,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    // Backend polling handles Deep Research completion in background
    // No need to check here - status is updated in database by background polling

    // Check if user wants to generate quest (after Deep Research completed)
    const wantsQuestGeneration = /create.*quest|generate.*quest|make.*quest|build.*quest/i.test(message)

    if (wantsQuestGeneration) {
      // Check if Deep Research has completed for this session
      const db = await getDb()
      const sessionResult = await db.query(
        'SELECT deep_research_status, deep_research_interaction_id FROM quest_chat_sessions WHERE session_id = $1',
        [session.session_id]
      )

      const deepResearchStatus = sessionResult.rows[0]?.deep_research_status
      const hasCompletedResearch = deepResearchStatus === 'completed'

      if (hasCompletedResearch) {
        // Get Deep Research report from chat history
        const messagesResult = await db.query(
          `SELECT content FROM quest_chat_messages 
           WHERE session_id = $1 AND role = 'assistant'
           ORDER BY created_at DESC LIMIT 20`,
          [session.session_id]
        )

        // Find the Deep Research report
        const reportMessage = messagesResult.rows.find(row =>
          row.content.includes('completed analyzing') ||
          row.content.includes('Here\'s what I found')
        )

        if (reportMessage) {
          // Extract the report and URL
          const reportMatch = reportMessage.content.match(/Here's what I found:\n\n([\s\S]*?)\n\nBased on this analysis/)
          const researchReport = reportMatch ? reportMatch[1] : reportMessage.content

          // Extract URL from user messages
          const userMessagesResult = await db.query(
            `SELECT content FROM quest_chat_messages 
             WHERE session_id = $1 AND role = 'user'
             ORDER BY created_at DESC LIMIT 5`,
            [session.session_id]
          )
          const urlMatch = userMessagesResult.rows[0]?.content?.match(/https?:\/\/[^\s]+/i)
          const url = urlMatch ? urlMatch[0] : undefined

          try {
            // Use generateContent with structured output (more reliable than Chat API)
            console.log('[Quest Chat] Generating quest structure using generateContent with structured output')
            const questStructure = await generateQuestStructureFromReport(researchReport, url)

            // Format as JSON string for chat - use clean format that parseQuestJson can reliably extract
            const questJson = JSON.stringify(questStructure, null, 2)
            const questMessage = `Here's the quest structure I generated:\n\n\`\`\`json\n${questJson}\n\`\`\`\n\nYou can review it and click "SAVE QUEST" when you're ready!`

            // Send to chat session to keep context, but save our original clean message to DB
            // (Gemini rewrites the message and can mangle the JSON format)
            try {
              await session.chat.sendMessage({ message: questMessage })
            } catch (chatErr) {
              console.warn('[Quest Chat] Failed to send quest to chat session (non-critical):', chatErr)
            }

            await saveMessage(session.session_id, 'assistant', questMessage)

            return {
              type: 'preview',
              session_id: session.session_id,
              preview: questStructure,
              chat_response: questMessage,
            }
          } catch (error) {
            console.error('[Quest Chat] Error generating quest structure:', error)
            // Fall back to normal chat
          }
        }
      }
    }

    // Normal chat message (no URL detected or quest generation failed)
    if (!url) {
      console.log(`[Quest Chat] No URL detected in message, proceeding with normal chat`)
    }
    const response = await session.chat.sendMessage({
      message: message,
    })

    // Extract text response
    const chatResponse = response.text || 'No response'

    // Save assistant response to database
    await saveMessage(session.session_id, 'assistant', chatResponse)

    return {
      type: 'message',
      session_id: session.session_id,
      chat_response: chatResponse,
    }
  } catch (error) {
    return {
      error: 'Failed to process chat message',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

