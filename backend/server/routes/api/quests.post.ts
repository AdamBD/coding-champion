import { eventHandler, readBody, setResponseHeader, sendNoContent } from 'h3'
import { getDb } from '../../utils/db'
import { tryValidateQuestStructure, fixQuestStructure, QuestStructure } from '../../utils/quest-generator'
import { getOrCreateChatSession } from '../../utils/chat-session'
import { generateThumbnail } from '../../utils/thumbnail-generator'

// POST /api/quests - Save a quest (with validation and Gemini fallback)
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
    const body = await readBody(event) as {
      quest?: unknown
      session_id?: string
    }

    const { quest, session_id } = body

    if (!quest) {
      return { error: 'quest data is required' }
    }

    // Step 1: Try to validate the quest structure
    const validation = tryValidateQuestStructure(quest)

    let questData: QuestStructure

    if (validation.valid) {
      // ✅ Structure is valid - save directly (no LLM call!)
      console.log('[Quest Save] Quest structure is valid, saving directly')
      questData = validation.data
    } else {
      // ❌ Structure is invalid - use Gemini to fix it
      console.log('[Quest Save] Quest structure is invalid, using Gemini to fix')
      console.log('[Quest Save] Validation errors:', validation.error.issues)
      console.log('[Quest Save] Received quest structure:', JSON.stringify(quest, null, 2))

      // Get Deep Research report from chat history if available
      let researchReport: string | undefined
      if (session_id) {
        try {
          await getOrCreateChatSession(session_id)
          const db = await getDb()
          const messagesResult = await db.query(
            `SELECT content FROM quest_chat_messages 
             WHERE session_id = $1 AND role = 'assistant'
             ORDER BY created_at DESC LIMIT 20`,
            [session_id]
          )

          // Find the Deep Research report
          const reportMessage = messagesResult.rows.find(row =>
            row.content.includes('completed analyzing') ||
            row.content.includes('Here\'s what I found')
          )

          if (reportMessage) {
            // Extract the report from the message (it's embedded in the chat message)
            const reportMatch = reportMessage.content.match(/Here's what I found:\n\n([\s\S]*?)\n\nBased on this analysis/)
            researchReport = reportMatch ? reportMatch[1] : reportMessage.content
          }
        } catch (error) {
          console.error('[Quest Save] Error fetching research report:', error)
          // Continue without report
        }
      }

      // Use Gemini to fix the structure
      try {
        questData = await fixQuestStructure(quest, validation.error, researchReport)
        console.log('[Quest Save] Gemini fixed the quest structure')
        console.log('[Quest Save] Fixed quest structure:', JSON.stringify(questData, null, 2))
      } catch (fixError) {
        console.error('[Quest Save] Error fixing quest structure:', fixError)
        return {
          error: 'Failed to save quest',
          message: `Failed to fix quest structure: ${fixError instanceof Error ? fixError.message : 'Unknown error'}`,
        }
      }
    }

    // Ensure questData is valid
    if (!questData || !questData.quest) {
      console.error('[Quest Save] Invalid questData after validation/fixing:', questData)
      return {
        error: 'Failed to save quest',
        message: 'Invalid quest structure',
      }
    }

    // Step 2: Ensure quest_steps exists and is an array
    if (!questData.quest_steps || !Array.isArray(questData.quest_steps) || questData.quest_steps.length === 0) {
      console.error('[Quest Save] Invalid quest_steps:', questData.quest_steps)
      return {
        error: 'Failed to save quest',
        message: 'Quest must have at least one step',
      }
    }

    // Step 3: Ensure total_xp_reward matches sum of step rewards
    const calculatedTotalXp = questData.quest_steps.reduce((sum, step) => sum + step.xp_reward, 0)
    if (questData.quest.total_xp_reward !== calculatedTotalXp) {
      console.log(`[Quest Save] Fixing total_xp_reward: ${questData.quest.total_xp_reward} -> ${calculatedTotalXp}`)
      questData.quest.total_xp_reward = calculatedTotalXp
    }

    // Step 4: Save to database
    const db = await getDb()

    // Get user ID
    const userResult = await db.query('SELECT id FROM users LIMIT 1')
    const userId = userResult.rows[0]?.id

    if (!userId) {
      return { error: 'No user found' }
    }

    // Insert quest
    const questResult = await db.query(
      `INSERT INTO quests (name, description, total_xp_reward, link, status, generated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        questData.quest.name,
        questData.quest.description || null,
        questData.quest.total_xp_reward,
        questData.quest.link || null,
        'completed',
        new Date(),
      ]
    )

    const questId = questResult.rows[0].id

    // Insert quest steps
    for (const step of questData.quest_steps) {
      await db.query(
        `INSERT INTO quest_steps (quest_id, step_order, name, description, xp_reward)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          questId,
          step.step_order,
          step.name,
          step.description || null,
          step.xp_reward,
        ]
      )
    }

    console.log(`[Quest Save] Successfully saved quest ${questId} with ${questData.quest_steps.length} steps`)

    // Step 5: Generate thumbnail (non-blocking - don't fail quest save if this fails)
    let thumbnailGenerated = false
    try {
      console.log(`[Quest Save] Generating thumbnail for quest ${questId}...`)
      const thumbnailBuffer = await generateThumbnail(
        questData.quest.name,
        questData.quest.description || undefined
      )

      // Update quest record with thumbnail_data
      await db.query(
        `UPDATE quests SET thumbnail_data = $1 WHERE id = $2`,
        [thumbnailBuffer, questId]
      )

      thumbnailGenerated = true
      console.log(`[Quest Save] Thumbnail generated and saved for quest ${questId}`)
    } catch (error) {
      // Log error but don't fail the quest save
      console.error(`[Quest Save] Failed to generate thumbnail for quest ${questId}:`, error)
      console.error(`[Quest Save] Quest saved successfully, but thumbnail generation failed`)
    }

    return {
      success: true,
      quest_id: questId,
      thumbnail_generated: thumbnailGenerated,
      quest: {
        id: questId,
        name: questData.quest.name,
        description: questData.quest.description,
        total_xp_reward: questData.quest.total_xp_reward,
        link: questData.quest.link,
        steps_count: questData.quest_steps.length,
      },
    }
  } catch (error) {
    console.error('[Quest Save] Error:', error)
    return {
      error: 'Failed to save quest',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

