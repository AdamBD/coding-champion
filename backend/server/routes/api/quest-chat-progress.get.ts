import { eventHandler, getQuery, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// GET /api/quest-chat-progress?session_id=xxx&interaction_id=xxx - Get Deep Research progress
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
    const query = getQuery(event)
    const sessionId = query.session_id as string
    const interactionId = query.interaction_id as string

    if (!sessionId || !interactionId) {
      return { error: 'session_id and interaction_id are required' }
    }

    // Read status from database (backend manages polling, frontend just reads)
    try {
      const db = await getDb()
      const sessionResult = await db.query(
        'SELECT deep_research_status, deep_research_progress, deep_research_started_at FROM quest_chat_sessions WHERE session_id = $1',
        [sessionId]
      )
      
      if (sessionResult.rows.length === 0) {
        return { error: 'Session not found' }
      }

      let dbStatus = sessionResult.rows[0].deep_research_status
      let dbProgress = sessionResult.rows[0].deep_research_progress ?? 1
      const startedAt = sessionResult.rows[0].deep_research_started_at
      
      // If progress is 100% but status is still 'running', update it to 'completed'
      // This handles cases where Deep Research completed but status wasn't updated
      if (dbProgress >= 100 && (dbStatus === 'running' || dbStatus === 'in_progress')) {
        console.log(`[Quest Chat Progress] Auto-fixing stale status: progress=100% but status=${dbStatus}, updating to 'completed'`)
        await db.query(
          'UPDATE quest_chat_sessions SET deep_research_status = $1 WHERE session_id = $2',
          ['completed', sessionId]
        )
        dbStatus = 'completed'
      }
      
      // If status is completed/failed, return that
      // Otherwise, return the status and progress from database (backend updates these)
      const status = dbStatus || 'pending'
      const progress = status === 'completed' ? 100 : (status === 'failed' ? 0 : dbProgress)
      
      const elapsedSeconds = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0
      console.log(`[Quest Chat Progress] Status from DB: ${status}, Progress: ${progress}%, Elapsed: ${elapsedSeconds}s`)

      return {
        status: status,
        progress: progress,
        outputs_count: 0, // Not needed, backend handles this
      }
    } catch (error) {
      return {
        error: 'Failed to get progress',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  } catch (error) {
    return {
      error: 'Failed to get progress',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

