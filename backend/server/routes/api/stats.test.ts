import { describe, it, expect, vi, beforeEach } from 'vitest'
import statsHandler from './stats'
import { getDb } from '../../utils/db'

// Mock the database module
vi.mock('../../utils/db', () => ({
  getDb: vi.fn(),
}))

describe('Stats API Route', () => {
  let mockEvent: any
  let mockDb: any

  beforeEach(() => {
    // Create mock event
    mockEvent = {
      method: 'GET',
      url: '/api/stats',
      headers: {},
      node: {
        req: {
          method: 'GET',
          url: '/api/stats',
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

    // Create mock database
    mockDb = {
      query: vi.fn(),
    }

    vi.mocked(getDb).mockResolvedValue(mockDb as any)
  })

  it('should return user stats with XP and level calculations', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      current_streak: 5,
      longest_streak: 10,
      last_activity_date: '2024-01-01',
    }

    mockDb.query
      .mockResolvedValueOnce({ rows: [mockUser] })
      .mockResolvedValueOnce({ rows: [{ total_xp: '2500' }] })

    const response = await statsHandler(mockEvent)

    expect(response).toHaveProperty('user')
    expect(response).toHaveProperty('stats')
    expect(response.user.id).toBe(1)
    expect(response.stats.total_xp).toBe(2500)
    expect(response.stats.level).toBe(3) // floor(2500/1000) + 1
    expect(response.stats.xp_in_current_level).toBe(500) // 2500 - 2000
    expect(response.stats.xp_needed_for_next_level).toBe(3000) // level 3 * 1000
  })

  it('should return error when no user found', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] })

    const response = await statsHandler(mockEvent)

    expect(response).toHaveProperty('error')
    expect(response.error).toBe('No user found')
  })

  it('should handle zero XP correctly', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
    }

    mockDb.query
      .mockResolvedValueOnce({ rows: [mockUser] })
      .mockResolvedValueOnce({ rows: [{ total_xp: '0' }] })

    const response = await statsHandler(mockEvent)

    expect(response.stats.total_xp).toBe(0)
    expect(response.stats.level).toBe(1)
    expect(response.stats.xp_in_current_level).toBe(0)
    expect(response.stats.xp_needed_for_next_level).toBe(1000)
  })

  it('should handle database errors gracefully', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await statsHandler(mockEvent)

    expect(response).toHaveProperty('error')
    expect(response.error).toBe('Failed to get stats')
    expect(response).toHaveProperty('message')
  })

  it('should handle OPTIONS request', async () => {
    mockEvent.method = 'OPTIONS'
    const response = await statsHandler(mockEvent)

    expect(response).toBeUndefined()
  })
})

