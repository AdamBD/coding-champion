import { eventHandler, readBody, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'

// GET /api/activities
export default eventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    sendNoContent(event, 204)
    return
  }

  setResponseHeader(event, 'Content-Type', 'application/json')

  if (event.method === 'GET') {
    try {
      const db = await getDb()
      const userResult = await db.query('SELECT id FROM users LIMIT 1')
      const userId = userResult.rows[0]?.id

      if (!userId) {
        return { error: 'No user found' }
      }

      const activitiesResult = await db.query(
        'SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      )

      return { activities: activitiesResult.rows }
    } catch (error) {
      return {
        error: 'Failed to get activities',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // POST /api/activities
  if (event.method === 'POST') {
    try {
      const body = await readBody(event) as { description?: string; xp_earned?: number; duration_minutes?: number }
      const { description, xp_earned, duration_minutes } = body

      if (!description || xp_earned === undefined) {
        return { error: 'description and xp_earned are required' }
      }

      const db = await getDb()

      const userResult = await db.query('SELECT id, last_activity_date, current_streak, longest_streak FROM users LIMIT 1')
      const user = userResult.rows[0]

      if (!user) {
        return { error: 'No user found' }
      }

      const activityResult = await db.query(
        `INSERT INTO activities (user_id, description, xp_earned, duration_minutes) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [user.id, description, xp_earned, duration_minutes || null]
      )
      const activity = activityResult.rows[0]

      const today = new Date().toISOString().split('T')[0]
      const lastActivityDate = user.last_activity_date
        ? new Date(user.last_activity_date).toISOString().split('T')[0]
        : null

      let newStreak = user.current_streak
      let newLongestStreak = user.longest_streak

      if (lastActivityDate === today) {
        // Already logged today
      } else if (lastActivityDate === null || lastActivityDate < today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastActivityDate === yesterdayStr) {
          newStreak = user.current_streak + 1
        } else {
          newStreak = 1
        }

        if (newStreak > user.longest_streak) {
          newLongestStreak = newStreak
        }

        await db.query(
          'UPDATE users SET current_streak = $1, longest_streak = $2, last_activity_date = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          [newStreak, newLongestStreak, today, user.id]
        )
      }

      return {
        success: true,
        activity,
        streak_updated: newStreak !== user.current_streak,
        new_streak: newStreak
      }
    } catch (error) {
      return {
        error: 'Failed to create activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return { error: 'Method not allowed' }
})

