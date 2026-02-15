import { describe, it, expect, vi, beforeEach } from 'vitest'
import questChatsHandler from './quest-chats.get'
import { getDb } from '../../utils/db'

// Mock the database module
vi.mock('../../utils/db', () => ({
  getDb: vi.fn(),
}))

describe('Quest Chats GET API - Requirement 2', () => {
  let mockEvent: any
  let mockDb: any

  beforeEach(() => {
    mockEvent = {
      method: 'GET',
      headers: {},
      node: {
        req: {
          method: 'GET',
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

    mockDb = {
      query: vi.fn(),
    }

    vi.mocked(getDb).mockResolvedValue(mockDb as any)
  })

    it('should return list of all chat sessions for the user', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }], // User query
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              session_id: 'session_2',
              title: 'Chat 2',
              status: 'active',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-03'),
              message_count: '3',
              last_message_at: new Date('2026-01-03'),
            },
            {
              id: 1,
              session_id: 'session_1',
              title: 'Chat 1',
              status: 'active',
              created_at: new Date('2026-01-01'),
              updated_at: new Date('2026-01-02'),
              message_count: '5',
              last_message_at: new Date('2026-01-02'),
            },
          ],
        })

      const response = await questChatsHandler(mockEvent)

      expect(response).toHaveProperty('chats')
      expect(response.chats).toHaveLength(2)
      expect(response.chats[0]).toHaveProperty('session_id', 'session_2') // Most recent first
      expect(response.chats[0]).toHaveProperty('message_count', 3)
    })

  it('should return empty array when no chats exist', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{ id: 1 }], // User query
      })
      .mockResolvedValueOnce({
        rows: [],
      })

    const response = await questChatsHandler(mockEvent)

    expect(response).toHaveProperty('chats')
    expect(response.chats).toHaveLength(0)
  })

  it('should handle missing user gracefully', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [], // No user
    })

    const response = await questChatsHandler(mockEvent)

    expect(response).toHaveProperty('error', 'No user found')
  })

  it('should handle OPTIONS request', async () => {
    mockEvent.method = 'OPTIONS'
    const response = await questChatsHandler(mockEvent)

    expect(response).toBeUndefined()
  })
})

