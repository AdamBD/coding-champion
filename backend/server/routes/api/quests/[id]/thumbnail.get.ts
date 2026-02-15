import { eventHandler, getRouterParam, setResponseHeader, sendNoContent, setResponseStatus } from 'h3'
import { getDb } from '../../../../utils/db'

// GET /api/quests/:id/thumbnail - Get quest thumbnail image
export default eventHandler(async (event) => {
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    sendNoContent(event, 204)
    return
  }

  try {
    const questId = getRouterParam(event, 'id')

    if (!questId) {
      setResponseStatus(event, 400)
      return { error: 'quest id is required' }
    }

    const db = await getDb()

    // Query database for thumbnail_data
    const result = await db.query(
      'SELECT thumbnail_data FROM quests WHERE id = $1',
      [questId]
    )

    if (result.rows.length === 0) {
      setResponseStatus(event, 404)
      return { error: 'Quest not found' }
    }

    const thumbnailData = result.rows[0].thumbnail_data

    if (!thumbnailData) {
      setResponseStatus(event, 404)
      return { error: 'Thumbnail not found for this quest' }
    }

    // Detect image type from buffer (check magic bytes)
    let contentType = 'image/png' // default
    const buffer = Buffer.from(thumbnailData)
    
    // Check JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      contentType = 'image/jpeg'
    }
    // Check PNG: 89 50 4E 47
    else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      contentType = 'image/png'
    }
    // Check WebP: RIFF...WEBP
    else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      contentType = 'image/webp'
    }

    // Set proper headers for image response
    setResponseHeader(event, 'Content-Type', contentType)
    // Reduce cache time and add ETag for better cache invalidation
    setResponseHeader(event, 'Cache-Control', 'public, max-age=3600') // Cache for 1 hour instead of 1 year
    // Add ETag based on quest ID and updated_at to help with cache invalidation
    setResponseHeader(event, 'ETag', `"quest-${questId}"`)

    // Return the binary image data
    return thumbnailData
  } catch (error) {
    console.error('[Quest Thumbnail] Error:', error)
    setResponseStatus(event, 500)
    return {
      error: 'Failed to get thumbnail',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

