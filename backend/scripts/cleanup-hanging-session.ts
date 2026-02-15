/**
 * Script to cleanup hanging chat sessions
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { getDb } from '../server/utils/db'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

async function cleanupHangingSession(sessionId?: string) {
  try {
    const db = await getDb()

    if (sessionId) {
      // Clean up specific session
      console.log(`🧹 Cleaning up session: ${sessionId}\n`)
      
      const result = await db.query(
        `UPDATE quest_chat_sessions 
         SET deep_research_status = 'failed',
             updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $1
         RETURNING session_id, title, deep_research_status`,
        [sessionId]
      )

      if (result.rows.length > 0) {
        console.log(`✅ Updated session ${sessionId}`)
        console.log(`   Title: ${result.rows[0].title}`)
        console.log(`   New Status: ${result.rows[0].deep_research_status}`)
      } else {
        console.log(`❌ Session ${sessionId} not found`)
      }
    } else {
      // Clean up all hanging sessions
      console.log('🧹 Cleaning up all hanging sessions...\n')
      
      const result = await db.query(
        `UPDATE quest_chat_sessions 
         SET deep_research_status = 'failed',
             updated_at = CURRENT_TIMESTAMP
         WHERE deep_research_status IN ('running', 'in_progress')
           AND deep_research_started_at < NOW() - INTERVAL '30 minutes'
         RETURNING session_id, title, deep_research_status`
      )

      if (result.rows.length > 0) {
        console.log(`✅ Updated ${result.rows.length} hanging session(s):\n`)
        result.rows.forEach((session, index) => {
          console.log(`${index + 1}. ${session.session_id}`)
          console.log(`   Title: ${session.title || 'N/A'}`)
          console.log(`   Status: ${session.deep_research_status}`)
          console.log('')
        })
      } else {
        console.log('✅ No hanging sessions to clean up')
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

// Get session ID from command line args or clean up all
const sessionId = process.argv[2]
cleanupHangingSession(sessionId)

