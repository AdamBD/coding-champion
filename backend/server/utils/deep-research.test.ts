import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startDeepResearch, pollDeepResearch } from './deep-research'
import { getDb } from './db'
import { updateDeepResearchStatus } from './chat-session'

// Create mock interactions that will be shared
const mockInteractions = {
  create: vi.fn(),
  get: vi.fn(),
}

// Mock dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    interactions: mockInteractions,
  })),
}))

vi.mock('./db', () => ({
  getDb: vi.fn(),
}))

vi.mock('./chat-session', () => ({
  updateDeepResearchStatus: vi.fn(),
}))

describe('Deep Research Utils', () => {
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      query: vi.fn(),
    }

    vi.mocked(getDb).mockResolvedValue(mockDb as any)
    vi.mocked(updateDeepResearchStatus).mockResolvedValue(undefined)
  })

  describe('Requirement 3: Deep Research Initiation', () => {
    it('should start Deep Research and return interaction ID', async () => {
      const testUrl = 'https://example.com/course'
      const mockInteraction = {
        id: 'interaction_123',
      }

      mockInteractions.create.mockResolvedValue(mockInteraction)

      const interactionId = await startDeepResearch(testUrl)

      expect(mockInteractions.create).toHaveBeenCalledWith({
        input: expect.stringContaining(testUrl),
        agent: 'deep-research-pro-preview-12-2025',
        background: true,
      })
      expect(interactionId).toBe('interaction_123')
    })

    it('should throw error if Deep Research fails to start', async () => {
      const testUrl = 'https://example.com/course'

      mockAi.interactions.create.mockRejectedValue(new Error('API Error'))

      await expect(startDeepResearch(testUrl)).rejects.toThrow('Failed to start Deep Research')
    })
  })

  describe('Requirement 6: Backend Polling Until Completion', () => {
    it('should poll until status is completed', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      // Simulate polling: first in_progress, then completed
      mockInteractions.get
        .mockResolvedValueOnce({
          status: 'in_progress',
          outputs: [],
        })
        .mockResolvedValueOnce({
          status: 'completed',
          outputs: [
            {
              type: 'text',
              text: 'Research report',
            },
          ],
        })

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 1 }] })
        .mockResolvedValueOnce({ rows: [] }) // Progress update
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 2 }] })
        .mockResolvedValueOnce({ rows: [] }) // Status update to completed
        .mockResolvedValueOnce({ rows: [] }) // Final status update

      const result = await pollDeepResearch(interactionId, sessionId)

      expect(mockInteractions.get).toHaveBeenCalledTimes(2)
      expect(result.status).toBe('completed')
      expect(result.report).toBe('Research report')
    })

    it('should update progress in database on each poll', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      mockInteractions.get.mockResolvedValue({
        status: 'in_progress',
        outputs: [],
      })

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 10 }] })
        .mockResolvedValueOnce({ rows: [] }) // Progress update

      // Start polling but don't wait for completion (it will timeout)
      const pollPromise = pollDeepResearch(interactionId, sessionId)

      // Wait a bit to let it poll
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify progress update was attempted
      expect(mockDb.query).toHaveBeenCalled()
    })

    it('should stop polling when status is completed', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      mockInteractions.get.mockResolvedValue({
        status: 'completed',
        outputs: [
          {
            type: 'text',
            text: 'Final report',
          },
        ],
      })

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 50 }] })
        .mockResolvedValueOnce({ rows: [] }) // Status update
        .mockResolvedValueOnce({ rows: [] }) // Final status update

      const result = await pollDeepResearch(interactionId, sessionId)

      expect(result.status).toBe('completed')
      expect(result.report).toBe('Final report')
      // Should only poll once since it's immediately completed
      expect(mockInteractions.get).toHaveBeenCalledTimes(1)
    })

    it('should stop polling when status is failed', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      mockInteractions.get.mockResolvedValue({
        status: 'failed',
        outputs: [],
      })

      mockDb.query.mockResolvedValueOnce({ rows: [{ deep_research_progress: 50 }] })

      const result = await pollDeepResearch(interactionId, sessionId)

      expect(result.status).toBe('failed')
      expect(result.error).toBeDefined()
      expect(mockInteractions.get).toHaveBeenCalledTimes(1)
    })

    it('should timeout after max attempts', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      // Always return in_progress
      mockInteractions.get.mockResolvedValue({
        status: 'in_progress',
        outputs: [],
      })

      mockDb.query.mockResolvedValue({ rows: [{ deep_research_progress: 1 }] })

      const result = await pollDeepResearch(interactionId, sessionId)

      expect(result.status).toBe('failed')
      expect(result.error).toContain('timed out')
    })

    it('should update database status to completed immediately when detected', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      mockInteractions.get.mockResolvedValue({
        status: 'completed',
        outputs: [
          {
            type: 'text',
            text: 'Report',
          },
        ],
      })

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 50 }] })
        .mockResolvedValueOnce({ rows: [] }) // Status update
        .mockResolvedValueOnce({ rows: [] }) // Final status update

      await pollDeepResearch(interactionId, sessionId)

      // Should update status to completed
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE quest_chat_sessions SET deep_research_progress = 100, deep_research_status'),
        ['completed', sessionId]
      )
      expect(updateDeepResearchStatus).toHaveBeenCalledWith(sessionId, interactionId, 'completed')
    })
  })

  describe('Report Extraction', () => {
    it('should extract text report from outputs', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      mockInteractions.get.mockResolvedValue({
        status: 'completed',
        outputs: [
          {
            type: 'text',
            text: 'This is the research report',
          },
        ],
      })

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 50 }] })
        .mockResolvedValueOnce({ rows: [] }) // Status update
        .mockResolvedValueOnce({ rows: [] }) // Final status update

      const result = await pollDeepResearch(interactionId, sessionId)

      expect(result.report).toBe('This is the research report')
    })

    it('should handle missing outputs gracefully', async () => {
      const interactionId = 'interaction_123'
      const sessionId = 'session_456'

      mockInteractions.get.mockResolvedValue({
        status: 'completed',
        outputs: [],
      })

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ deep_research_progress: 50 }] })
        .mockResolvedValueOnce({ rows: [] }) // Status update
        .mockResolvedValueOnce({ rows: [] }) // Final status update

      const result = await pollDeepResearch(interactionId, sessionId)

      expect(result.report).toBe('')
    })
  })
})

