/**
 * Quest Generator Service
 * 
 * Validates quest structures and generates them from Deep Research reports.
 * Uses Zod for validation and Gemini for structured output when needed.
 */

import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { getSchemaContext } from './schema-context'

const ai = new GoogleGenAI({})

/**
 * Zod schema matching the database structure
 */
export const QuestStepSchema = z.object({
  step_order: z.number().int().positive(),
  name: z.string().max(200).min(1),
  description: z.string().optional(),
  xp_reward: z.number().int().nonnegative(),
})

export const QuestSchema = z.object({
  quest: z.object({
    name: z.string().max(200).min(1),
    description: z.string().optional(),
    total_xp_reward: z.number().int().nonnegative(),
    link: z.string().url().optional().or(z.literal('')),
  }),
  quest_steps: z.array(QuestStepSchema).min(1),
})

export type QuestStructure = z.infer<typeof QuestSchema>

/**
 * Validate quest structure
 * Returns validated data if valid, throws ZodError if invalid
 */
export function validateQuestStructure(data: unknown): QuestStructure {
  return QuestSchema.parse(data)
}

/**
 * Try to validate quest structure
 * Returns { valid: true, data } if valid, { valid: false, error } if invalid
 */
export function tryValidateQuestStructure(data: unknown):
  | { valid: true; data: QuestStructure }
  | { valid: false; error: z.ZodError } {
  const result = QuestSchema.safeParse(data)

  if (result.success) {
    return { valid: true, data: result.data }
  } else {
    return { valid: false, error: result.error }
  }
}

/**
 * Generate quest structure from Deep Research report using Gemini
 * Uses structured output to guarantee valid JSON matching our schema
 * 
 * This is more reliable than Chat API because it uses structured output,
 * guaranteeing the response matches our Zod schema exactly.
 */
export async function generateQuestStructureFromReport(
  researchReport: string,
  url?: string
): Promise<QuestStructure> {
  const schemaContext = getSchemaContext()

  const prompt = `${schemaContext}

Based on this course analysis:

${researchReport}

${url ? `Course URL: ${url}` : ''}

Generate a quest structure that matches the database schema above. 

Requirements:
- Quest name should be clear and descriptive
- Quest description should summarize the learning journey
- Create quest_steps that represent logical learning milestones
- Each step should have:
  - step_order: sequential starting from 1
  - name: specific learning objective
  - description: what the student will learn/do
  - xp_reward: appropriate XP (beginner: 100-300, intermediate: 400-600, advanced: 700-900)
- total_xp_reward should equal the sum of all step xp_reward values
- Include the course URL in the quest.link field if available

Return ONLY valid JSON matching the schema.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(QuestSchema),
      },
    })

    const jsonText = response.text || ''
    const questData = JSON.parse(jsonText)

    // Validate with Zod (should always pass due to structured output, but double-check)
    return QuestSchema.parse(questData)
  } catch (error) {
    throw new Error(
      `Failed to generate quest structure: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Fix invalid quest structure using Gemini
 * Takes the invalid structure and research report, returns fixed structure
 */
export async function fixQuestStructure(
  invalidData: unknown,
  validationError: z.ZodError,
  researchReport?: string
): Promise<QuestStructure> {
  const schemaContext = getSchemaContext()

  // Safely extract error messages
  const errors = validationError.issues || []
  const errorMessages = errors.length > 0
    ? errors.map((err: z.ZodIssue) =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n')
    : 'Validation failed: Invalid quest structure'

  const prompt = `${schemaContext}

I have an invalid quest structure that needs to be fixed:

Invalid Data:
${JSON.stringify(invalidData, null, 2)}

Validation Errors:
${errorMessages}

${researchReport ? `\nOriginal Course Analysis:\n${researchReport}` : ''}

Please fix the structure to match the database schema exactly. Return ONLY valid JSON matching the schema.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(QuestSchema),
      },
    })

    const jsonText = response.text
    if (!jsonText) {
      throw new Error('AI returned empty response. Please try again.')
    }

    let questData
    try {
      questData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('[fixQuestStructure] Failed to parse JSON response:', jsonText)
      throw new Error('AI returned invalid JSON. Please try regenerating the quest.')
    }

    // Validate with Zod
    try {
      return QuestSchema.parse(questData)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.issues || []
        const errorSummary = errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ')
        console.error('[fixQuestStructure] AI returned invalid structure:', JSON.stringify(questData, null, 2))
        console.error('[fixQuestStructure] Validation errors:', errorSummary)
        throw new Error('AI returned an invalid quest structure. Please try regenerating the quest or contact support if this persists.')
      }
      throw validationError
    }
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof Error && (error.message.includes('AI') || error.message.includes('Gemini'))) {
      throw error
    }
    // Otherwise wrap it
    throw new Error(
      `Failed to fix quest structure: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

