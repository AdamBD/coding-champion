import { eventHandler, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'
import { calculateLevel, xpForNextLevel, xpInCurrentLevel } from '../../utils/level'

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

    const userResult = await db.query('SELECT * FROM users LIMIT 1')
    const user = userResult.rows[0]

    if (!user) {
      return { error: 'No user found' }
    }

    const xpResult = await db.query(
      'SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM activities WHERE user_id = $1',
      [user.id]
    )
    const totalXp = parseInt(xpResult.rows[0].total_xp) || 0

    const level = calculateLevel(totalXp)
    const xpInLevel = xpInCurrentLevel(totalXp)
    const xpNeededForNext = xpForNextLevel(level)
    const progressPercent = Math.round((xpInLevel / 1000) * 10000) / 100

    return {
      user: {
        id: user.id,
        username: user.username,
        current_streak: user.current_streak,
        longest_streak: user.longest_streak,
        last_activity_date: user.last_activity_date,
      },
      stats: {
        total_xp: totalXp,
        level,
        xp_in_current_level: xpInLevel,
        xp_needed_for_next_level: xpNeededForNext,
        progress_percent: progressPercent,
      }
    }
  } catch (error) {
    return {
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

