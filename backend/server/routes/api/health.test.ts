import { describe, it, expect, vi, beforeEach } from 'vitest'
import healthHandler from './health'

describe('Health API Route', () => {
  let mockEvent: any

  beforeEach(() => {
    // Create a simple mock event
    mockEvent = {
      method: 'GET',
      url: '/api/health',
      headers: {},
      node: {
        req: {
          method: 'GET',
          url: '/api/health',
          headers: {},
        },
        res: {
          statusCode: 200,
          headers: {},
          setHeader: vi.fn(),
          getHeader: vi.fn(),
          removeHeader: vi.fn(),
          writeHead: vi.fn(),
          end: vi.fn(),
        },
      },
      context: {},
    }
  })

  it('should return ok status for GET request', async () => {
    mockEvent.method = 'GET'
    const response = await healthHandler(mockEvent)

    expect(response).toEqual({
      status: 'ok',
      message: 'Coding Champion API is running',
    })
  })

  it('should handle OPTIONS request', async () => {
    mockEvent.method = 'OPTIONS'
    const response = await healthHandler(mockEvent)

    // OPTIONS should return no content (204) - response is undefined
    expect(response).toBeUndefined()
  })

  it('should set CORS headers', async () => {
    mockEvent.method = 'GET'
    await healthHandler(mockEvent)

    // Verify setHeader was called for CORS headers
    expect(mockEvent.node.res.setHeader).toHaveBeenCalled()
  })
})

