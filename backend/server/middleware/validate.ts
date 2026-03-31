import { eventHandler, createError, getHeader, getRequestURL } from 'h3'
import { verifyToken } from '@clerk/backend'

export default eventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip OPTIONS (CORS preflight), health check, and thumbnail images
  if (event.method === 'OPTIONS') return
  if (path === '/api/health') return
  if (path.match(/^\/api\/quests\/\d+\/thumbnail/)) return

  // Only protect /api routes
  if (!path.startsWith('/api')) return

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  try {
    await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }
})
