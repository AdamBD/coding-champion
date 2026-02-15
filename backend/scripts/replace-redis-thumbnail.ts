/**
 * Script to replace Redis quest thumbnail with a new image
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { getDb } from '../server/utils/db'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

async function replaceRedisThumbnail() {
  try {
    const db = await getDb()

    // Find Redis quest
    const questResult = await db.query(
      "SELECT id, name FROM quests WHERE name ILIKE '%redis%'"
    )

    if (questResult.rows.length === 0) {
      console.error('No Redis quest found')
      process.exit(1)
    }

    const redisQuest = questResult.rows[0]
    console.log(`Found Redis quest: ${redisQuest.name} (ID: ${redisQuest.id})`)

    // Read the image file from downloads
    // The file name is: "Generated Image January 04, 2026 - 6_40PM"
    // It's likely a PNG file, but could be other formats
    const downloadsPath = resolve(process.env.HOME || process.env.USERPROFILE || '', 'Downloads')
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp']
    let imageBuffer: Buffer | null = null
    let imagePath: string | null = null

    for (const ext of possibleExtensions) {
      const fullPath = resolve(downloadsPath, `Generated Image January 04, 2026 - 6_40PM${ext}`)
      try {
        imageBuffer = readFileSync(fullPath)
        imagePath = fullPath
        console.log(`Found image file: ${fullPath}`)
        break
      } catch (error) {
        // File doesn't exist with this extension, try next
        continue
      }
    }

    if (!imageBuffer || !imagePath) {
      console.error('Could not find image file in Downloads folder')
      console.error(`Looked for: "Generated Image January 04, 2026 - 6_40PM" with extensions: ${possibleExtensions.join(', ')}`)
      console.error(`Downloads path: ${downloadsPath}`)
      process.exit(1)
    }

    console.log(`Image file size: ${imageBuffer.length} bytes`)

    // Update the quest thumbnail_data
    await db.query(
      'UPDATE quests SET thumbnail_data = $1 WHERE id = $2',
      [imageBuffer, redisQuest.id]
    )

    console.log(`✅ Successfully replaced thumbnail for quest ${redisQuest.id}`)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

replaceRedisThumbnail()


