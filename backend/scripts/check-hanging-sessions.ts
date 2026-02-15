/**
 * Script to check for hanging chat sessions and Deep Research interactions
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { getDb } from '../server/utils/db'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

async function checkHangingSessions() {
  try {
    const db = await getDb()

    console.log('🔍 Checking for hanging chat sessions...\n')

    // Check for sessions with running/in_progress Deep Research
    const hangingSessions = await db.query(`
      SELECT 
        session_id,
        title,
        deep_research_status,
        deep_research_interaction_id,
        deep_research_started_at,
        deep_research_progress,
        created_at,
        updated_at,
        EXTRACT(EPOCH FROM (NOW() - deep_research_started_at)) / 60 as minutes_elapsed
      FROM quest_chat_sessions
      WHERE deep_research_status IN ('running', 'in_progress')
      ORDER BY deep_research_started_at DESC
    `)

    if (hangingSessions.rows.length === 0) {
      console.log('✅ No hanging sessions found')
    } else {
      console.log(`⚠️  Found ${hangingSessions.rows.length} potentially hanging session(s):\n`)
      hangingSessions.rows.forEach((session, index) => {
        console.log(`${index + 1}. Session: ${session.session_id}`)
        console.log(`   Title: ${session.title || 'N/A'}`)
        console.log(`   Status: ${session.deep_research_status}`)
        console.log(`   Interaction ID: ${session.deep_research_interaction_id || 'N/A'}`)
        console.log(`   Started: ${session.deep_research_started_at}`)
        console.log(`   Progress: ${session.deep_research_progress}%`)
        console.log(`   Elapsed: ${Math.round(session.minutes_elapsed)} minutes`)
        console.log(`   Created: ${session.created_at}`)
        console.log(`   Updated: ${session.updated_at}`)
        console.log('')
      })
    }

    // Check all recent sessions
    console.log('\n📋 Recent chat sessions (last 10):\n')
    const recentSessions = await db.query(`
      SELECT 
        session_id,
        title,
        deep_research_status,
        deep_research_progress,
        created_at,
        updated_at
      FROM quest_chat_sessions
      ORDER BY created_at DESC
      LIMIT 10
    `)

    recentSessions.rows.forEach((session, index) => {
      console.log(`${index + 1}. ${session.session_id}`)
      console.log(`   Title: ${session.title || 'N/A'}`)
      console.log(`   Deep Research Status: ${session.deep_research_status || 'N/A'}`)
      console.log(`   Progress: ${session.deep_research_progress || 'N/A'}%`)
      console.log(`   Created: ${session.created_at}`)
      console.log('')
    })

    // Check message counts per session
    console.log('\n💬 Message counts per session:\n')
    const messageCounts = await db.query(`
      SELECT 
        qcs.session_id,
        qcs.title,
        COUNT(qcm.id) as message_count
      FROM quest_chat_sessions qcs
      LEFT JOIN quest_chat_messages qcm ON qcs.session_id = qcm.session_id
      GROUP BY qcs.session_id, qcs.title
      ORDER BY message_count DESC
      LIMIT 10
    `)

    messageCounts.rows.forEach((session, index) => {
      console.log(`${index + 1}. ${session.session_id}: ${session.message_count} messages`)
      if (session.title) {
        console.log(`   Title: ${session.title}`)
      }
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkHangingSessions()

