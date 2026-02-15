import { eventHandler, readBody, setResponseHeader } from 'h3'
import { getDb } from '../../utils/db'

// DELETE /api/quest-steps - Uncomplete a quest step
export default eventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    return { success: true }
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  try {
    const body = await readBody(event) as { quest_step_id?: number }
    const { quest_step_id } = body

    if (!quest_step_id) {
      return { error: 'quest_step_id is required' }
    }

    const db = await getDb()

    const userResult = await db.query('SELECT id FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id

    if (!userId) {
      return { error: 'No user found' }
    }

    // Get quest step info
    const stepResult = await db.query(
      `SELECT qs.*, q.id as quest_id
       FROM quest_steps qs
       JOIN quests q ON qs.quest_id = q.id
       WHERE qs.id = $1`,
      [quest_step_id]
    )

    if (stepResult.rows.length === 0) {
      return { error: 'Quest step not found' }
    }

    const step = stepResult.rows[0]

    // Get user quest
    const userQuestResult = await db.query(
      `SELECT * FROM user_quests 
       WHERE user_id = $1 AND quest_id = $2`,
      [userId, step.quest_id]
    )

    if (userQuestResult.rows.length === 0) {
      return { error: 'Quest not started' }
    }

    const userQuest = userQuestResult.rows[0]

    // Check if step is completed
    const existingStep = await db.query(
      `SELECT * FROM user_quest_steps 
       WHERE user_quest_id = $1 AND quest_step_id = $2`,
      [userQuest.id, quest_step_id]
    )

    if (existingStep.rows.length === 0) {
      return { 
        error: 'Step not completed',
      }
    }

    // Delete the completed step
    await db.query(
      `DELETE FROM user_quest_steps 
       WHERE user_quest_id = $1 AND quest_step_id = $2`,
      [userQuest.id, quest_step_id]
    )

    // Update current step order if needed (move back if this was the furthest step)
    const maxCompletedStepResult = await db.query(
      `SELECT MAX(qs.step_order) as max_order
       FROM user_quest_steps uqs
       JOIN quest_steps qs ON uqs.quest_step_id = qs.id
       WHERE uqs.user_quest_id = $1 AND qs.quest_id = $2`,
      [userQuest.id, step.quest_id]
    )

    const maxOrder = maxCompletedStepResult.rows[0]?.max_order
    const newCurrentStepOrder = maxOrder !== null ? maxOrder + 1 : 1

    await db.query(
      `UPDATE user_quests 
       SET current_step_order = $1,
           completed_at = NULL
       WHERE id = $2`,
      [newCurrentStepOrder, userQuest.id]
    )

    // Remove XP activity (optional - you might want to keep history)
    // For now, we'll leave activities as historical records

    return {
      success: true,
      message: 'Step uncompleted successfully'
    }
  } catch (error) {
    return {
      error: 'Failed to uncomplete quest step',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

