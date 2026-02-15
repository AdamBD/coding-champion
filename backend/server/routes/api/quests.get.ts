import { eventHandler, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// GET /api/quests - Get all available quests
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

    // Get all quests with their step counts
    const questsResult = await db.query(`
      SELECT 
        q.*,
        COUNT(qs.id) as step_count
      FROM quests q
      LEFT JOIN quest_steps qs ON q.id = qs.quest_id
      GROUP BY q.id
      ORDER BY q.created_at ASC
    `)

    // For each quest, get the steps
    const quests = await Promise.all(
      questsResult.rows.map(async (quest) => {
        const stepsResult = await db.query(
          `SELECT * FROM quest_steps 
           WHERE quest_id = $1 
           ORDER BY step_order ASC`,
          [quest.id]
        )
        return {
          ...quest,
          steps: stepsResult.rows
        }
      })
    )

    return { quests }
  } catch (error) {
    return {
      error: 'Failed to get quests',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

