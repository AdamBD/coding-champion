import { describe, it, expect, vi, beforeEach } from 'vitest'
import questsHandler from './quests.get'
import { getDb } from '../../utils/db'

// Mock the database module
vi.mock('../../utils/db', () => ({
  getDb: vi.fn(),
}))

describe('Quests API Route', () => {
  let mockEvent: any
  let mockDb: any

  beforeEach(() => {
    // Create mock event
    mockEvent = {
      method: 'GET',
      url: '/api/quests',
      headers: {},
      node: {
        req: {
          method: 'GET',
          url: '/api/quests',
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

  it('should return quests with steps for GET request', async () => {
    // Mock database responses
    mockDb.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Test Quest',
            description: 'Test Description',
            total_xp_reward: 1000,
            link: 'https://example.com',
            thumbnail_url: null,
            thumbnail_data: null,
            status: 'completed',
            generated_at: null,
            step_count: '2',
            created_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            quest_id: 1,
            step_order: 1,
            name: 'Step 1',
            description: 'First step',
            xp_reward: 100,
          },
          {
            id: 2,
            quest_id: 1,
            step_order: 2,
            name: 'Step 2',
            description: 'Second step',
            xp_reward: 200,
          },
        ],
      })

    const response = await questsHandler(mockEvent)

    expect(response).toHaveProperty('quests')
    expect(response.quests).toHaveLength(1)
    expect(response.quests[0]).toHaveProperty('steps')
    expect(response.quests[0].steps).toHaveLength(2)
    expect(response.quests[0].name).toBe('Test Quest')
    expect(response.quests[0]).toHaveProperty('link')
    expect(response.quests[0]).toHaveProperty('thumbnail_url')
    expect(response.quests[0]).toHaveProperty('status')
  })

  it('should return empty array when no quests exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] })

    const response = await questsHandler(mockEvent)

    expect(response).toHaveProperty('quests')
    expect(response.quests).toHaveLength(0)
  })

  it('should handle database errors gracefully', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await questsHandler(mockEvent)

    expect(response).toHaveProperty('error')
    expect(response.error).toBe('Failed to get quests')
    expect(response).toHaveProperty('message')
  })

  it('should handle OPTIONS request', async () => {
    mockEvent.method = 'OPTIONS'
    const response = await questsHandler(mockEvent)

    expect(response).toBeUndefined()
  })
})

