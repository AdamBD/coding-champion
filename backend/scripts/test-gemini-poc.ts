/**
 * Gemini API Proof of Concept - Deep Research Test
 * 
 * Testing Deep Research agent for multi-page course analysis
 * 
 * Run with: npx tsx scripts/test-gemini-poc.ts
 * 
 * Requires:
 * - npm install @google/genai dotenv
 * - GEMINI_API_KEY in .env file
 */

import { config } from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env file
config()

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables')
  console.log('Add it to backend/.env file: GEMINI_API_KEY=your_key_here')
  process.exit(1)
}

// Initialize client
const ai = new GoogleGenAI({})

/**
 * Test: Deep Research Agent - Analyze course and browse sublinks
 * Based on: https://ai.google.dev/gemini-api/docs/deep-research
 */
async function testDeepResearch() {
  const courseUrl = 'https://craftinginterpreters.com/contents.html'

  const prompt = `Analyze this course website: ${courseUrl}

Please:
1. Extract the complete course structure (all chapters and their descriptions)
2. Browse into at least 3 different chapter pages to get detailed information about what each chapter covers
3. Provide a summary of the course content structure

Focus on understanding the learning path and what students will learn in each section.`

  try {
    console.log('🚀 Starting Deep Research agent...')
    console.log(`📚 Analyzing: ${courseUrl}\n`)

    // Start Deep Research task in background
    const interaction = await ai.interactions.create({
      input: prompt,
      agent: 'deep-research-pro-preview-12-2025',
      background: true,
    })

    console.log(`✅ Research started: ${interaction.id}`)
    console.log('⏳ Polling for results (this may take several minutes)...\n')

    // Poll for results
    let attempts = 0
    const maxAttempts = 60 // 10 minutes max (10s intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds

      const result = await ai.interactions.get(interaction.id)
      attempts++

      if (result.status === 'completed') {
        console.log('✅ Research completed!\n')
        console.log('📄 Final Report:')
        console.log('='.repeat(60))
        if (result.outputs && result.outputs.length > 0) {
          const lastOutput = result.outputs[result.outputs.length - 1]
          // Check if it's TextContent
          if (lastOutput.type === 'text' && 'text' in lastOutput) {
            console.log(lastOutput.text || 'No text content')
          } else {
            console.log(JSON.stringify(lastOutput, null, 2))
          }
        } else {
          console.log(JSON.stringify(result, null, 2))
        }
        console.log('='.repeat(60))
        return
      } else if (result.status === 'failed') {
        console.error('❌ Research failed')
        console.error('Full result:', JSON.stringify(result, null, 2))
        return
      } else {
        console.log(`⏳ Status: ${result.status} (attempt ${attempts}/${maxAttempts})`)
        // Show progress if available
        if (result.outputs && result.outputs.length > 0) {
          const latestOutput = result.outputs[result.outputs.length - 1]
          if (latestOutput.type === 'text' && 'text' in latestOutput && latestOutput.text) {
            console.log(`   Latest: ${latestOutput.text.substring(0, 100)}...`)
          }
        }
      }
    }

    console.log('⏰ Timeout: Research took longer than expected')
    console.log('Last status:', await ai.interactions.get(interaction.id))
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', JSON.stringify(error, null, 2))
  }
}

/**
 * Test: Generate image using Nano Banana (gemini-2.5-flash-image) or Nano Banana Pro (gemini-3-pro-image-preview)
 * Based on: https://ai.google.dev/gemini-api/docs/nanobanana
 */
async function testImageGeneration() {
  const prompt = 'A modern, colorful illustration representing a coding quest or learning journey, RPG game style, vibrant colors, featuring a character on an adventure path'

  try {
    // Try Nano Banana Pro first, then Nano Banana
    const modelNames = [
      'gemini-3-pro-image-preview', // Nano Banana Pro
      'gemini-2.5-flash-image', // Nano Banana
    ]

    let response: any = null
    let lastError: any = null

    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`)
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        })
        console.log(`✅ Success with model: ${modelName}`)
        break
      } catch (e: any) {
        lastError = e
        console.log(`❌ Failed: ${e.message?.substring(0, 100)}`)
        continue
      }
    }

    if (!response) {
      throw lastError || new Error('All models failed')
    }

    // Extract and save image data from response.candidates[0].content.parts
    // Based on: https://ai.google.dev/gemini-api/docs/nanobanana
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts || []

      for (const part of parts) {
        if (part.inlineData) {
          // inlineData.data is base64 encoded
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64')
          const outputPath = path.join(process.cwd(), 'test-image.png')
          fs.writeFileSync(outputPath, imageBuffer)
          console.log(`✅ Image saved to: ${outputPath}`)
          return
        }
      }

      console.log('⚠️  No inlineData found in response parts')
    } else {
      console.log('⚠️  No candidates in response')
    }
  } catch (error: any) {
    console.error('Error:', error.message)
    console.error('Full error:', JSON.stringify(error, null, 2))
  }
}

// Run test
testDeepResearch().catch(console.error)
