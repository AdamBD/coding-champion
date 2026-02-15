import { eventHandler, readBody, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// POST /api/user-quests - Start a new quest
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
    const body = await readBody(event) as { quest_id?: number }
    const { quest_id } = body

    if (!quest_id) {
      return { error: 'quest_id is required' }
    }

    const db = await getDb()

    const userResult = await db.query('SELECT id FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id

    if (!userId) {
      return { error: 'No user found' }
    }

    // Check if quest exists
    const questResult = await db.query('SELECT * FROM quests WHERE id = $1', [quest_id])
    if (questResult.rows.length === 0) {
      return { error: 'Quest not found' }
    }

    // Check if user already started this quest
    const existingQuest = await db.query(
      'SELECT * FROM user_quests WHERE user_id = $1 AND quest_id = $2',
      [userId, quest_id]
    )

    if (existingQuest.rows.length > 0) {
      return { 
        error: 'Quest already started',
        user_quest: existingQuest.rows[0]
      }
    }

    // Start the quest
    const userQuestResult = await db.query(
      `INSERT INTO user_quests (user_id, quest_id, current_step_order)
       VALUES ($1, $2, 1)
       RETURNING *`,
      [userId, quest_id]
    )

    return {
      success: true,
      user_quest: userQuestResult.rows[0]
    }
  } catch (error) {
    return {
      error: 'Failed to start quest',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

