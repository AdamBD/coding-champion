import { eventHandler, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// GET /api/user-quests - Get user's quest progress
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

    const userResult = await db.query('SELECT id FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id

    if (!userId) {
      return { error: 'No user found' }
    }

    // Get all user quests with progress
    const userQuestsResult = await db.query(
      `SELECT 
        uq.*,
        q.name as quest_name,
        q.description as quest_description,
        q.total_xp_reward,
        COUNT(DISTINCT uqs.id) as completed_steps,
        COUNT(DISTINCT qs.id) as total_steps
      FROM user_quests uq
      JOIN quests q ON uq.quest_id = q.id
      LEFT JOIN quest_steps qs ON q.id = qs.quest_id
      LEFT JOIN user_quest_steps uqs ON uq.id = uqs.user_quest_id 
        AND uqs.quest_step_id = qs.id
      WHERE uq.user_id = $1
      GROUP BY uq.id, q.id
      ORDER BY uq.started_at DESC`,
      [userId]
    )

    // Get completed steps for each quest
    const userQuests = await Promise.all(
      userQuestsResult.rows.map(async (userQuest) => {
        const completedStepsResult = await db.query(
          `SELECT qs.*, uqs.completed_at
           FROM user_quest_steps uqs
           JOIN quest_steps qs ON uqs.quest_step_id = qs.id
           WHERE uqs.user_quest_id = $1
           ORDER BY qs.step_order ASC`,
          [userQuest.id]
        )

        const allStepsResult = await db.query(
          `SELECT * FROM quest_steps 
           WHERE quest_id = $1 
           ORDER BY step_order ASC`,
          [userQuest.quest_id]
        )

        const completedStepIds = new Set(completedStepsResult.rows.map(s => s.id))
        const steps = allStepsResult.rows.map(step => ({
          ...step,
          completed: completedStepIds.has(step.id)
        }))

        return {
          ...userQuest,
          steps,
          progress_percent: userQuest.total_steps > 0 
            ? Math.round((userQuest.completed_steps / userQuest.total_steps) * 100)
            : 0
        }
      })
    )

    return { user_quests: userQuests }
  } catch (error) {
    return {
      error: 'Failed to get user quests',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

