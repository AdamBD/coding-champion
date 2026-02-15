/**
 * Thumbnail Generator Service
 * 
 * Generates quest thumbnails using Nano Banana Pro (Gemini Image Generation).
 * Uses the quest name and description to create RPG-style illustrations.
 */

import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({})

/**
 * Generates a thumbnail image for a quest using Nano Banana Pro.
 * 
 * @param questName - The name of the quest
 * @param questDescription - The description of the quest
 * @returns Promise<Buffer> - The image data as a Buffer
 * @throws Error if image generation fails
 */
export async function generateThumbnail(
  questName: string,
  questDescription?: string
): Promise<Buffer> {
  // Create image prompt from quest name/description
  const prompt = createImagePrompt(questName, questDescription)

  try {
    // Use Nano Banana Pro for image generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
    })

    // Extract image data from response
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates in image generation response')
    }

    const parts = response.candidates[0].content.parts || []

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        // inlineData.data is base64 encoded, convert to Buffer
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64')
        return imageBuffer
      }
    }

    throw new Error('No image data found in response parts')
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate thumbnail: ${error.message}`)
    }
    throw new Error('Failed to generate thumbnail: Unknown error')
  }
}

/**
 * Creates an image prompt from quest name and description.
 * 
 * @param questName - The name of the quest
 * @param questDescription - Optional description of the quest
 * @returns A formatted prompt string for image generation
 */
function createImagePrompt(questName: string, questDescription?: string): string {
  // Extract key concepts from description if available
  let themeDescription = questName.toLowerCase()

  if (questDescription) {
    // Try to extract key concepts (first 100 chars or key words)
    const descWords = questDescription
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4) // Filter out short words
      .slice(0, 10) // Take first 10 meaningful words
      .join(', ')

    if (descWords) {
      themeDescription = `${questName.toLowerCase()}, ${descWords}`
    }
  }
  
  return `create a thumbnail image for a learning course on ${themeDescription}. this course is inside of a platform called coding champion which is a learning platform with a retro 8-bit matte theme hacker vibe. so we want it to have hacker, fantasy, anime 8-bit retro matte vibe to it`
}

