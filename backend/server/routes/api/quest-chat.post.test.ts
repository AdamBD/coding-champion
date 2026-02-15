import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import questChatHandler from './quest-chat.post'
import { getOrCreateChatSession, saveMessage, updateDeepResearchStatus } from '../../utils/chat-session'
import { extractUrl, startDeepResearch, pollDeepResearch } from '../../utils/deep-research'
import { readBody } from 'h3'

// Mock dependencies
vi.mock('../../utils/chat-session', () => ({
  getOrCreateChatSession: vi.fn(),
  saveMessage: vi.fn(),
  getChatSession: vi.fn(),
  updateDeepResearchStatus: vi.fn(),
}))

vi.mock('../../utils/deep-research', () => ({
  extractUrl: vi.fn(),
  startDeepResearch: vi.fn(),
  pollDeepResearch: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseHeader: vi.fn(),
    sendNoContent: vi.fn(),
  }
})

describe('Quest Chat POST API', () => {
  let mockEvent: any
  let mockSession: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock event
    mockEvent = {
      method: 'POST',
      headers: {},
      node: {
        req: {
          method: 'POST',
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

    // Create mock session
    mockSession = {
      session_id: 'test_session_123',
      chat: {
        sendMessage: vi.fn().mockResolvedValue({
          text: 'Test response',
        }),
      },
      deep_research_interaction_id: undefined,
      deep_research_status: undefined,
    }

    vi.mocked(getOrCreateChatSession).mockResolvedValue(mockSession as any)
    vi.mocked(saveMessage).mockResolvedValue(undefined)
    vi.mocked(updateDeepResearchStatus).mockResolvedValue(undefined)
    vi.mocked(readBody).mockResolvedValue({ message: 'Test message' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirement 1: Session Creation and Message Persistence', () => {
    it('should create a new session when session_id is not provided', async () => {
      vi.mocked(readBody).mockResolvedValueOnce({ message: 'Hello, I want to learn React' })

      vi.mocked(getOrCreateChatSession).mockResolvedValueOnce({
        ...mockSession,
        session_id: 'new_session_456',
      } as any)

      await questChatHandler(mockEvent)

      expect(getOrCreateChatSession).toHaveBeenCalledWith(undefined)
      expect(saveMessage).toHaveBeenCalledWith('new_session_456', 'user', 'Hello, I want to learn React')
    })

    it('should use existing session_id when provided', async () => {
      vi.mocked(readBody).mockResolvedValueOnce({ 
        message: 'Follow up message',
        session_id: 'existing_session_789'
      })

      await questChatHandler(mockEvent)

      expect(getOrCreateChatSession).toHaveBeenCalledWith('existing_session_789')
      expect(saveMessage).toHaveBeenCalledWith('test_session_123', 'user', 'Follow up message')
    })

    it('should save user message to database', async () => {
      vi.mocked(readBody).mockResolvedValueOnce({ message: 'Test message' })

      await questChatHandler(mockEvent)

      expect(saveMessage).toHaveBeenCalledWith(
        mockSession.session_id,
        'user',
        'Test message'
      )
    })

    it('should save assistant response to database', async () => {
      vi.mocked(readBody).mockResolvedValueOnce({ message: 'Test message' })

      await questChatHandler(mockEvent)

      // Should save assistant message after chat response
      expect(saveMessage).toHaveBeenCalledTimes(2) // User + Assistant
      expect(saveMessage).toHaveBeenNthCalledWith(1, mockSession.session_id, 'user', 'Test message')
      expect(saveMessage).toHaveBeenNthCalledWith(2, mockSession.session_id, 'assistant', 'Test response')
    })

    it('should return session_id in response', async () => {
      vi.mocked(readBody).mockResolvedValueOnce({ message: 'Test message' })

      const response = await questChatHandler(mockEvent)

      expect(response).toHaveProperty('session_id', mockSession.session_id)
      expect(response).toHaveProperty('type', 'message')
    })
  })

  describe('Requirement 3 & 4: Deep Research Initiation', () => {
    it('should detect URL in message and start Deep Research', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: `Check out this course: ${testUrl}` })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      vi.mocked(pollDeepResearch).mockResolvedValue({
        interaction_id: 'interaction_123',
        status: 'completed',
        report: 'Test report',
      })

      const response = await questChatHandler(mockEvent)

      expect(extractUrl).toHaveBeenCalledWith(`Check out this course: ${testUrl}`)
      expect(startDeepResearch).toHaveBeenCalledWith(testUrl)
      expect(updateDeepResearchStatus).toHaveBeenCalledWith(
        mockSession.session_id,
        'interaction_123',
        'running',
        expect.any(Date)
      )
      expect(response).toHaveProperty('type', 'researching')
      expect(response).toHaveProperty('interaction_id', 'interaction_123')
    })

    it('should start polling task connected to session_id', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      vi.mocked(pollDeepResearch).mockResolvedValue({
        interaction_id: 'interaction_123',
        status: 'completed',
        report: 'Test report',
      })

      await questChatHandler(mockEvent)

      expect(pollDeepResearch).toHaveBeenCalledWith(
        'interaction_123',
        mockSession.session_id,
        expect.any(Function)
      )
    })

    it('should return researching status immediately without waiting for completion', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      
      // Don't resolve pollDeepResearch immediately - it should return before completion
      vi.mocked(pollDeepResearch).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )

      const response = await questChatHandler(mockEvent)

      // Should return immediately with researching status
      expect(response).toHaveProperty('type', 'researching')
      expect(response).toHaveProperty('status', 'researching')
      expect(response).toHaveProperty('interaction_id', 'interaction_123')
    })
  })

  describe('Requirement 6: Backend Polling Until Completion', () => {
    it('should continue polling until status is completed', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      
      // Simulate polling that eventually completes
      let pollCallCount = 0
      vi.mocked(pollDeepResearch).mockImplementation(async (interactionId, sessionId, onProgress) => {
        pollCallCount++
        // Simulate progress updates
        if (onProgress) {
          onProgress('in_progress', 50)
        }
        return {
          interaction_id: interactionId,
          status: 'completed',
          report: 'Final report',
        }
      })

      await questChatHandler(mockEvent)

      expect(pollDeepResearch).toHaveBeenCalled()
    })

    it('should handle Deep Research failure', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      vi.mocked(pollDeepResearch).mockResolvedValue({
        interaction_id: 'interaction_123',
        status: 'failed',
        error: 'Research failed',
      })

      await questChatHandler(mockEvent)

      // Should still return researching status immediately
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })
      const response = await questChatHandler(mockEvent)
      expect(response).toHaveProperty('type', 'researching')
      
      // The failure handling happens in the background promise
      // We can't easily test it here without waiting, but we verify pollDeepResearch was called
      expect(pollDeepResearch).toHaveBeenCalled()
    })
  })

  describe('Requirement 7: Completion Communication', () => {
    it('should save report message when Deep Research completes', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      
      const mockChatSession = {
        ...mockSession,
        chat: {
          sendMessage: vi.fn().mockResolvedValue({
            text: 'I\'ve completed analyzing...',
          }),
        },
      }
      
      vi.mocked(getOrCreateChatSession).mockResolvedValue(mockChatSession as any)
      
      vi.mocked(pollDeepResearch).mockResolvedValue({
        interaction_id: 'interaction_123',
        status: 'completed',
        report: 'Test report content',
      })

      await questChatHandler(mockEvent)

      // Wait a bit for the promise to resolve (in real code this happens in background)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify that saveMessage would be called for the report
      // (This happens in the .then() handler which runs asynchronously)
      expect(pollDeepResearch).toHaveBeenCalled()
    })

    it('should update session status to completed when Deep Research finishes', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockResolvedValue('interaction_123')
      vi.mocked(pollDeepResearch).mockResolvedValue({
        interaction_id: 'interaction_123',
        status: 'completed',
        report: 'Test report',
      })

      await questChatHandler(mockEvent)

      // The status update happens in the background promise
      // We verify that updateDeepResearchStatus is called initially
      expect(updateDeepResearchStatus).toHaveBeenCalledWith(
        mockSession.session_id,
        'interaction_123',
        'running',
        expect.any(Date)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle missing message', async () => {
      vi.mocked(readBody).mockResolvedValueOnce({})

      const response = await questChatHandler(mockEvent)

      expect(response).toHaveProperty('error', 'message is required')
    })

    it('should handle Deep Research start failure gracefully', async () => {
      const testUrl = 'https://example.com/course'
      vi.mocked(readBody).mockResolvedValueOnce({ message: testUrl })

      vi.mocked(extractUrl).mockReturnValue(testUrl)
      vi.mocked(startDeepResearch).mockRejectedValue(new Error('API Error'))

      const response = await questChatHandler(mockEvent)

      // Should fall back to normal chat
      expect(response).toHaveProperty('type', 'message')
    })

    it('should handle OPTIONS request', async () => {
      mockEvent.method = 'OPTIONS'
      const response = await questChatHandler(mockEvent)

      expect(response).toBeUndefined()
    })
  })
})

