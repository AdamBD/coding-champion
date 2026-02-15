import { eventHandler, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// GET /api/quest-chats - Get all chat sessions for the user
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
    const db = await getDb()

    // Get default user (for now, single user app)
    const userResult = await db.query('SELECT id FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id

    if (!userId) {
      return { error: 'No user found' }
    }

    // Get all chat sessions for user, ordered by most recent
    const sessionsResult = await db.query(
      `SELECT 
        s.id,
        s.session_id,
        s.title,
        s.status,
        s.created_at,
        s.updated_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
      FROM quest_chat_sessions s
      LEFT JOIN quest_chat_messages m ON s.session_id = m.session_id
      WHERE s.user_id = $1
      GROUP BY s.id, s.session_id, s.title, s.status, s.created_at, s.updated_at
      ORDER BY COALESCE(MAX(m.created_at), s.updated_at) DESC`,
      [userId]
    )

    return {
      chats: sessionsResult.rows.map(row => ({
        id: row.id,
        session_id: row.session_id,
        title: row.title || 'New Chat',
        status: row.status,
        message_count: parseInt(row.message_count) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_message_at: row.last_message_at,
      })),
    }
  } catch (error) {
    return {
      error: 'Failed to get chat sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

