import { describe, it, expect, vi, beforeEach } from 'vitest'
import questChatProgressHandler from './quest-chat-progress.get'
import { getDb } from '../../utils/db'
import { getQuery } from 'h3'

// Mock the database module
vi.mock('../../utils/db', () => ({
  getDb: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    getQuery: vi.fn(),
    setResponseHeader: vi.fn(),
    sendNoContent: vi.fn(),
  }
})

describe('Quest Chat Progress GET API - Requirements 5 & 7', () => {
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
    }

    vi.mocked(getQuery).mockReturnValue({
      session_id: 'test_session_123',
      interaction_id: 'interaction_456',
    } as any)

    mockDb = {
      query: vi.fn(),
    }

    vi.mocked(getDb).mockResolvedValue(mockDb as any)
  })

  it('should return progress from database for active Deep Research', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          deep_research_status: 'running',
          deep_research_progress: 45,
          deep_research_started_at: new Date('2026-01-01T10:00:00Z'),
        },
      ],
    })

    const response = await questChatProgressHandler(mockEvent)

    expect(response).toHaveProperty('status', 'running')
    expect(response).toHaveProperty('progress', 45)
  })

  it('should return completed status when Deep Research is done', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          deep_research_status: 'completed',
          deep_research_progress: 100,
          deep_research_started_at: new Date('2026-01-01T10:00:00Z'),
        },
      ],
    })

    const response = await questChatProgressHandler(mockEvent)

    expect(response).toHaveProperty('status', 'completed')
    expect(response).toHaveProperty('progress', 100)
  })

  it('should return failed status when Deep Research fails', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          deep_research_status: 'failed',
          deep_research_progress: 0,
          deep_research_started_at: new Date('2026-01-01T10:00:00Z'),
        },
      ],
    })

    const response = await questChatProgressHandler(mockEvent)

    expect(response).toHaveProperty('status', 'failed')
    expect(response).toHaveProperty('progress', 0)
  })

  it('should auto-fix stale status when progress is 100% but status is running', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [
          {
            deep_research_status: 'running',
            deep_research_progress: 100,
            deep_research_started_at: new Date('2026-01-01T10:00:00Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // Update query

    const response = await questChatProgressHandler(mockEvent)

    expect(mockDb.query).toHaveBeenCalledTimes(2)
    expect(mockDb.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE quest_chat_sessions SET deep_research_status = $1 WHERE session_id = $2',
      ['completed', 'test_session_123']
    )
    expect(response).toHaveProperty('status', 'completed')
    expect(response).toHaveProperty('progress', 100)
  })

    it('should return error when session_id is missing', async () => {
      vi.mocked(getQuery).mockReturnValue({
        interaction_id: 'interaction_456',
      } as any)

      const response = await questChatProgressHandler(mockEvent)

      expect(response).toHaveProperty('error', 'session_id and interaction_id are required')
    })

    it('should return error when interaction_id is missing', async () => {
      vi.mocked(getQuery).mockReturnValue({
        session_id: 'test_session_123',
      } as any)

      const response = await questChatProgressHandler(mockEvent)

      expect(response).toHaveProperty('error', 'session_id and interaction_id are required')
    })

  it('should return error when session not found', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [],
    })

    const response = await questChatProgressHandler(mockEvent)

    expect(response).toHaveProperty('error', 'Session not found')
  })

  it('should handle OPTIONS request', async () => {
    mockEvent.method = 'OPTIONS'
    const response = await questChatProgressHandler(mockEvent)

    expect(response).toBeUndefined()
  })
})

