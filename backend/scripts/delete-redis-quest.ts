/**
 * Script to delete Redis quest from main user
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

import { getDb } from '../server/utils/db'

async function deleteRedisQuest() {
  try {
    const db = await getDb()

    // Get main user
    const userResult = await db.query('SELECT id FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id

    if (!userId) {
      console.error('No user found')
      process.exit(1)
    }

    console.log(`Found user ID: ${userId}`)

    // Find Redis quest
    const questResult = await db.query(
      "SELECT id, name FROM quests WHERE name ILIKE '%redis%'"
    )

    if (questResult.rows.length === 0) {
      console.log('No Redis quest found')
      process.exit(0)
    }

    const redisQuest = questResult.rows[0]
    console.log(`Found Redis quest: ${redisQuest.name} (ID: ${redisQuest.id})`)

    // Check for any user_quests associated with this quest
    const userQuestsResult = await db.query(
      'SELECT COUNT(*) as count FROM user_quests WHERE quest_id = $1',
      [redisQuest.id]
    )
    const userQuestCount = parseInt(userQuestsResult.rows[0].count)
    
    if (userQuestCount > 0) {
      console.log(`Found ${userQuestCount} user_quest(s) associated with this quest. These will be cascade deleted.`)
    }

    // Check for quest steps
    const stepsResult = await db.query(
      'SELECT COUNT(*) as count FROM quest_steps WHERE quest_id = $1',
      [redisQuest.id]
    )
    const stepsCount = parseInt(stepsResult.rows[0].count)
    console.log(`Quest has ${stepsCount} step(s) that will be cascade deleted.`)

    // Delete the quest itself (this will cascade delete quest_steps, user_quests, and user_quest_steps)
    await db.query('DELETE FROM quests WHERE id = $1', [redisQuest.id])

    console.log('✅ Successfully deleted Redis quest from quests table')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

deleteRedisQuest()

