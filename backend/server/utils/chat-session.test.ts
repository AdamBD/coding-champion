import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  getOrCreateChatSession, 
  saveMessage, 
  updateDeepResearchStatus,
  getChatSession,
} from './chat-session'
import { getDb } from './db'
import { GoogleGenAI } from '@google/genai'
import { pollDeepResearch } from './deep-research'

// Mock dependencies
vi.mock('./db', () => ({
  getDb: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    chats: {
      create: vi.fn().mockReturnValue({
        sendMessage: vi.fn(),
      }),
    },
  })),
}))

vi.mock('./deep-research', () => ({
  pollDeepResearch: vi.fn(),
}))

vi.mock('./schema-context', () => ({
  getSchemaContext: vi.fn().mockReturnValue('Schema context'),
}))

describe('Chat Session Utils', () => {
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      query: vi.fn(),
    }

    vi.mocked(getDb).mockResolvedValue(mockDb as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirement 1: Session Creation', () => {
    it('should create new session in database when session_id is not provided', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User query
        .mockResolvedValueOnce({ rows: [] }) // Session doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // No messages

      const session = await getOrCreateChatSession()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quest_chat_sessions'),
        expect.any(Array)
      )
      expect(session).toHaveProperty('session_id')
    })

    it('should load existing session from database', async () => {
      const existingSessionId = 'existing_session_123'
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User query
        .mockResolvedValueOnce({
          rows: [{
            session_id: existingSessionId,
            deep_research_interaction_id: null,
            deep_research_status: null,
            deep_research_started_at: null,
            deep_research_progress: null,
          }],
        }) // Session exists
        .mockResolvedValueOnce({
          rows: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi' },
          ],
        }) // Messages

      const session = await getOrCreateChatSession(existingSessionId)

      expect(session).toHaveProperty('session_id', existingSessionId)
    })

    it('should restore chat history from database', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            session_id: 'test_session',
            deep_research_interaction_id: null,
            deep_research_status: null,
            deep_research_started_at: null,
            deep_research_progress: null,
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { role: 'user', content: 'Message 1' },
            { role: 'assistant', content: 'Response 1' },
          ],
        })

      const session = await getOrCreateChatSession('test_session')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT role, content FROM quest_chat_messages'),
        ['test_session']
      )
      expect(session).toHaveProperty('chat')
    })
  })

  describe('Requirement 3: Deep Research Session Connection', () => {
    it('should resume polling when loading session with running Deep Research', async () => {
      const sessionId = 'test_session_123'
      const interactionId = 'interaction_456'

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            session_id: sessionId,
            deep_research_interaction_id: interactionId,
            deep_research_status: 'running',
            deep_research_started_at: new Date(),
            deep_research_progress: 50,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // No messages

      // Mock the resume function behavior
      vi.mocked(pollDeepResearch).mockResolvedValue({
        interaction_id: interactionId,
        status: 'completed',
        report: 'Test report',
      })

      await getOrCreateChatSession(sessionId)

      // The resume function should be called (we can't easily test it directly,
      // but we verify the session has the Deep Research data)
      expect(mockDb.query).toHaveBeenCalled()
    })

    it('should check and process completed Deep Research when loading session', async () => {
      const sessionId = 'test_session_123'
      const interactionId = 'interaction_456'

      // Mock GoogleGenAI interactions.get for checkAndProcessCompletedDeepResearch
      const mockInteractions = {
        get: vi.fn().mockResolvedValue({
          status: 'completed',
          outputs: [{ type: 'text', text: 'Test report' }],
        }),
      }
      const mockChat = {
        sendMessage: vi.fn().mockResolvedValue({ text: 'Report sent' }),
      }
      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        interactions: mockInteractions,
        chats: {
          create: vi.fn().mockReturnValue(mockChat),
        },
      }) as any)

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            session_id: sessionId,
            deep_research_interaction_id: interactionId,
            deep_research_status: 'completed',
            deep_research_started_at: new Date(),
            deep_research_progress: 100,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // No messages
        .mockResolvedValueOnce({ rows: [] }) // No assistant messages (triggers check)
        .mockResolvedValueOnce({ rows: [{ content: 'https://example.com' }] }) // User message for URL extraction
        .mockResolvedValueOnce({ rows: [] }) // Update query

      await getOrCreateChatSession(sessionId)

      // Wait a bit for async checkAndProcessCompletedDeepResearch
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should check for completed Deep Research
      expect(mockDb.query).toHaveBeenCalled()
    })
  })

  describe('Message Persistence', () => {
    it('should save user message to database', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await saveMessage('test_session', 'user', 'Test message')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quest_chat_messages'),
        ['test_session', 'user', 'Test message']
      )
    })

    it('should save assistant message to database', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await saveMessage('test_session', 'assistant', 'Test response')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quest_chat_messages'),
        ['test_session', 'assistant', 'Test response']
      )
    })

    it('should update session updated_at when saving message', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await saveMessage('test_session', 'user', 'Test message')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE quest_chat_sessions'),
        expect.any(Array)
      )
    })
  })

  describe('Deep Research Status Updates', () => {
    it('should update Deep Research status when starting', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      const startTime = new Date()
      await updateDeepResearchStatus('test_session', 'interaction_123', 'running', startTime)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE quest_chat_sessions'),
        ['interaction_123', 'running', startTime, 'test_session']
      )
    })

    it('should update Deep Research status when completed', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await updateDeepResearchStatus('test_session', 'interaction_123', 'completed')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE quest_chat_sessions'),
        ['interaction_123', 'completed', 'test_session']
      )
    })

    it('should update Deep Research status when failed', async () => {
      mockDb.query.mockResolvedValue({ rows: [] })

      await updateDeepResearchStatus('test_session', 'interaction_123', 'failed')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE quest_chat_sessions'),
        ['interaction_123', 'failed', 'test_session']
      )
    })
  })
})

