import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ResearchProgress from './ResearchProgress'

// Mock fetch globally
global.fetch = vi.fn()

describe('ResearchProgress Component - Requirements 5 & 7', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('Requirement 5: Frontend Polling', () => {
    it('should poll progress endpoint when component mounts', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'running',
          progress: 50,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `http://localhost:3000/api/quest-chat-progress?session_id=${sessionId}&interaction_id=${interactionId}`
        )
      })
    })

    it('should poll every 3 seconds while active', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'running',
          progress: 50,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      // Initial poll
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Advance timer by 3 seconds
      vi.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should stop polling when status is completed', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'completed',
          progress: 100,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })

      // Advance timer - should not poll again
      vi.advanceTimersByTime(3000)

      // Should only have polled once (the initial check)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should stop polling when status is failed', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'failed',
          progress: 0,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })

      // Should not poll again after failure
      vi.advanceTimersByTime(3000)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should update progress bar based on backend response', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'running',
          progress: 75,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        const progressBar = screen.getByText(/75%/)
        expect(progressBar).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 7: Completion Detection', () => {
    it('should call onComplete when status changes to completed', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'completed',
          progress: 100,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should not call onComplete multiple times', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'completed',
          progress: 100,
        }),
      })

      render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1)
      })

      // Advance timer - should not call again
      vi.advanceTimersByTime(3000)
      expect(mockOnComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Component Cleanup', () => {
    it('should stop polling when component unmounts', async () => {
      const mockOnComplete = vi.fn()
      const sessionId = 'session_123'
      const interactionId = 'interaction_456'

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'running',
          progress: 50,
        }),
      })

      const { unmount } = render(
        <ResearchProgress
          sessionId={sessionId}
          interactionId={interactionId}
          onComplete={mockOnComplete}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      unmount()

      // Advance timer - should not poll after unmount
      vi.advanceTimersByTime(3000)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})

