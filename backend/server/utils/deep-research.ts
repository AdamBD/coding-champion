import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({})

export interface DeepResearchResult {
  interaction_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  report?: string
  error?: string
}

/**
 * Start a Deep Research Agent task
 */
export async function startDeepResearch(url: string): Promise<string> {
  const prompt = `Analyze this course/website: ${url}

Please:
1. Extract the complete course structure (all chapters, sections, lessons, and their descriptions)
2. Browse into multiple different pages to get detailed information about what each section covers
3. Understand the learning path and progression
4. Identify key learning objectives and milestones
5. Provide a comprehensive summary of the course content structure

Focus on understanding:
- The overall learning journey
- What students will learn in each section
- The logical progression and dependencies between sections
- Key concepts and skills covered`

  try {
    const interaction = await ai.interactions.create({
      input: prompt,
      agent: 'deep-research-pro-preview-12-2025',
      background: true,
    })

    return interaction.id
  } catch (error) {
    throw new Error(`Failed to start Deep Research: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Poll Deep Research status and get result when complete
 */
export async function pollDeepResearch(
  interactionId: string,
  sessionId: string,
  onProgress?: (status: string, progress: number) => void
): Promise<DeepResearchResult> {
  const maxAttempts = 60 // 10 minutes max (60 attempts × 10 seconds)
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const result = await ai.interactions.get(interactionId)
      attempts++

      // Update progress in database (increment by 1% each poll, max 95%)
      const { getDb } = await import('./db')
      const db = await getDb()
      const sessionResult = await db.query(
        'SELECT deep_research_progress FROM quest_chat_sessions WHERE session_id = $1',
        [sessionId]
      )
      const currentProgress = sessionResult.rows[0]?.deep_research_progress ?? 1

      if (result.status === 'in_progress' || result.status === 'requires_action') {
        const newProgress = Math.min(95, currentProgress + 1)
        if (newProgress > currentProgress) {
          await db.query(
            'UPDATE quest_chat_sessions SET deep_research_progress = $1 WHERE session_id = $2',
            [newProgress, sessionId]
          )
          if (onProgress) {
            onProgress(result.status, newProgress)
          }
        }
      }

      if (result.status === 'completed') {
        // Update database status to completed and progress to 100% IMMEDIATELY
        const { getDb } = await import('./db')
        const { updateDeepResearchStatus } = await import('./chat-session')
        const db = await getDb()
        await db.query(
          'UPDATE quest_chat_sessions SET deep_research_progress = 100, deep_research_status = $1 WHERE session_id = $2',
          ['completed', sessionId]
        )
        await updateDeepResearchStatus(sessionId, interactionId, 'completed')

        // Extract report from outputs
        let report = ''
        console.log(`[Deep Research] Extracting report from ${result.outputs?.length || 0} outputs`)
        if (result.outputs && result.outputs.length > 0) {
          const lastOutput = result.outputs[result.outputs.length - 1]
          console.log(`[Deep Research] Last output type: ${lastOutput.type}, has text: ${'text' in lastOutput}`)
          if (lastOutput.type === 'text' && 'text' in lastOutput) {
            report = lastOutput.text || ''
            console.log(`[Deep Research] Extracted report length: ${report.length}`)
          } else {
            // Fallback: stringify the output
            report = JSON.stringify(lastOutput, null, 2)
            console.log(`[Deep Research] Using JSON fallback, report length: ${report.length}`)
          }
        } else {
          console.log(`[Deep Research] WARNING: No outputs found in completed Deep Research result`)
        }

        console.log(`[Deep Research] Returning completed result with report length: ${report.length}`)
        return {
          interaction_id: interactionId,
          status: 'completed',
          report,
        }
      } else if (result.status === 'failed') {
        return {
          interaction_id: interactionId,
          status: 'failed',
          error: 'Deep Research task failed',
        }
      } else if (result.status === 'in_progress' || result.status === 'requires_action') {
        // Still running, wait (progress already updated above)
        await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      } else {
        // Unknown status, wait and retry
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    } catch (error) {
      // If it's a 404, the interaction might not exist yet, wait and retry
      if (error instanceof Error && error.message.includes('404')) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        continue
      }
      throw error
    }
  }

  // Timeout
  return {
    interaction_id: interactionId,
    status: 'failed',
    error: 'Deep Research timed out after 10 minutes',
  }
}

/**
 * Check if a string is a valid URL
 */
export function isUrl(text: string): boolean {
  try {
    const url = new URL(text.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extract URL from text (finds first URL in the text)
 */
export function extractUrl(text: string): string | null {
  // Try to find URL in the text
  const urlPattern = /https?:\/\/[^\s]+/gi
  const matches = text.match(urlPattern)
  if (matches && matches.length > 0) {
    return matches[0]
  }

  // If no URL pattern found, check if the whole text is a URL
  if (isUrl(text)) {
    return text.trim()
  }

  return null
}

