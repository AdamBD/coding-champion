import { eventHandler, readBody, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// POST /api/quest-steps - Complete a quest step
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

    // Check if step is already completed
    const existingStep = await db.query(
      `SELECT * FROM user_quest_steps 
       WHERE user_quest_id = $1 AND quest_step_id = $2`,
      [userQuest.id, quest_step_id]
    )

    if (existingStep.rows.length > 0) {
      return { 
        error: 'Step already completed',
        user_quest_step: existingStep.rows[0]
      }
    }

    // Complete the step
    const userQuestStepResult = await db.query(
      `INSERT INTO user_quest_steps (user_quest_id, quest_step_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userQuest.id, quest_step_id]
    )

    // Update current step order if needed
    if (step.step_order >= userQuest.current_step_order) {
      await db.query(
        `UPDATE user_quests 
         SET current_step_order = $1
         WHERE id = $2`,
        [step.step_order + 1, userQuest.id]
      )
    }

    // Check if quest is complete
    const totalStepsResult = await db.query(
      `SELECT COUNT(*) as total FROM quest_steps WHERE quest_id = $1`,
      [step.quest_id]
    )
    const totalSteps = parseInt(totalStepsResult.rows[0].total)

    const completedStepsResult = await db.query(
      `SELECT COUNT(*) as completed 
       FROM user_quest_steps uqs
       JOIN quest_steps qs ON uqs.quest_step_id = qs.id
       WHERE uqs.user_quest_id = $1 AND qs.quest_id = $2`,
      [userQuest.id, step.quest_id]
    )
    const completedSteps = parseInt(completedStepsResult.rows[0].completed)

    let questCompleted = false
    if (completedSteps >= totalSteps) {
      await db.query(
        `UPDATE user_quests 
         SET completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userQuest.id]
      )
      questCompleted = true
    }

    // Create an activity for completing the step
    await db.query(
      `INSERT INTO activities (user_id, description, xp_earned)
       VALUES ($1, $2, $3)`,
      [userId, `Completed: ${step.name}`, step.xp_reward]
    )

    return {
      success: true,
      user_quest_step: userQuestStepResult.rows[0],
      quest_completed: questCompleted,
      xp_earned: step.xp_reward
    }
  } catch (error) {
    return {
      error: 'Failed to complete quest step',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

