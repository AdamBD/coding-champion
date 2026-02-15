/**
 * Script to convert an image to favicon format
 * Usage: node scripts/create-favicon.js [path-to-image]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function createFavicon(imagePath) {
  try {
    // Check if image exists
    if (!existsSync(imagePath)) {
      console.error(`❌ Image not found: ${imagePath}`)
      process.exit(1)
    }

    // Read the image file
    console.log(`📸 Reading image: ${imagePath}`)
    const imageBuffer = readFileSync(imagePath)

    // For now, we'll copy it as favicon.png
    // Modern browsers support PNG favicons
    const faviconPath = resolve(__dirname, '../public/favicon.png')

    console.log(`💾 Writing favicon to: ${faviconPath}`)
    writeFileSync(faviconPath, imageBuffer)

    console.log(`✅ Favicon created successfully!`)
    console.log(`   Location: ${faviconPath}`)
    console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`)
    console.log(`\n📝 Next step: Update index.html to reference /favicon.png`)

  } catch (error) {
    console.error('❌ Error creating favicon:', error)
    process.exit(1)
  }
}

// Get image path from command line or use default Downloads location
const imagePath = process.argv[2] || resolve(process.env.HOME || process.env.USERPROFILE || '', 'Downloads', 'Generated Image January 04, 2026 - 7_53PM.jpeg')

createFavicon(imagePath)

