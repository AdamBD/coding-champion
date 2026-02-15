import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuestDetail from './QuestDetail'

// Mock the fetch API
global.fetch = vi.fn()

describe('QuestDetail Component', () => {
  const mockQuest = {
    id: 1,
    name: 'Test Quest',
    description: 'This is a test quest',
    step_count: 3,
    total_xp_reward: 1000,
    link: 'https://example.com',
    steps: [
      {
        id: 1,
        step_order: 1,
        name: 'Step 1',
        description: 'First step',
        xp_reward: 100,
      },
      {
        id: 2,
        step_order: 2,
        name: 'Step 2',
        description: 'Second step',
        xp_reward: 200,
      },
    ],
  }

  const mockOnBack = vi.fn()
  const mockOnRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user_quests: [] }),
    })
  })

  it('should render quest name', async () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    await waitFor(() => {
      expect(screen.getByText('Test Quest')).toBeInTheDocument()
    })
  })

  it('should render quest description', async () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    await waitFor(() => {
      expect(screen.getByText('This is a test quest')).toBeInTheDocument()
    })
  })

  it('should show start quest button when quest not started', async () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    await waitFor(() => {
      expect(screen.getByText('START QUEST')).toBeInTheDocument()
    })
  })

  it('should render quest metadata', async () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    await waitFor(() => {
      expect(screen.getByText('3 Steps')).toBeInTheDocument()
      expect(screen.getByText('1,000 XP Total')).toBeInTheDocument()
    })
  })

  it('should render quest link when provided', async () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    await waitFor(() => {
      const link = screen.getByText('OPEN RESOURCE →')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com')
    })
  })

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByText('← BACK')).toBeInTheDocument()
    })
    
    const backButton = screen.getByText('← BACK')
    await user.click(backButton)
    
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('should show loading state initially', () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    expect(screen.getByText('[ LOADING... ]')).toBeInTheDocument()
  })

  it('should display steps list', async () => {
    render(<QuestDetail quest={mockQuest} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByText('ALL STEPS')).toBeInTheDocument()
      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
    })
  })
})

