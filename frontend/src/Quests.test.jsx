import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Quests from './Quests'

// Mock the fetch API
global.fetch = vi.fn()

describe('Quests Component', () => {
  const mockQuests = [
    {
      id: 1,
      name: 'Test Quest 1',
      description: 'First test quest',
      step_count: 3,
      total_xp_reward: 1000,
      link: 'https://example.com/quest1',
    },
    {
      id: 2,
      name: 'Test Quest 2',
      description: 'Second test quest',
      step_count: 5,
      total_xp_reward: 2000,
    },
  ]

  const mockUserQuests = [
    {
      quest_id: 1,
      progress_percent: 50,
      completed_at: null,
    },
    {
      quest_id: 2,
      progress_percent: 100,
      completed_at: '2024-01-01',
    },
  ]

  const mockOnSelectQuest = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ quests: mockQuests }),
    })
  })

  it('should show loading state initially', () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    expect(screen.getByText('[ LOADING QUESTS... ]')).toBeInTheDocument()
  })

  it('should render quests list after loading', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      expect(screen.getByText('QUESTS')).toBeInTheDocument()
      expect(screen.getByText('Test Quest 1')).toBeInTheDocument()
      expect(screen.getByText('Test Quest 2')).toBeInTheDocument()
    })
  })

  it('should render quest descriptions', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      expect(screen.getByText('First test quest')).toBeInTheDocument()
      expect(screen.getByText('Second test quest')).toBeInTheDocument()
    })
  })

  it('should render quest stats', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      expect(screen.getByText('3 Steps')).toBeInTheDocument()
      expect(screen.getByText('1,000 XP')).toBeInTheDocument()
      expect(screen.getByText('5 Steps')).toBeInTheDocument()
      expect(screen.getByText('2,000 XP')).toBeInTheDocument()
    })
  })

  it('should show IN PROGRESS badge for started quests', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={mockUserQuests} />)
    
    await waitFor(() => {
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
    })
  })

  it('should show COMPLETE badge for completed quests', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={mockUserQuests} />)
    
    await waitFor(() => {
      expect(screen.getByText('COMPLETE')).toBeInTheDocument()
    })
  })

  it('should call onSelectQuest when quest card is clicked', async () => {
    const user = userEvent.setup()
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Quest 1')).toBeInTheDocument()
    })
    
    const questCard = screen.getByText('Test Quest 1').closest('.quest-card')
    await user.click(questCard)
    
    expect(mockOnSelectQuest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Test Quest 1' })
    )
  })

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByText('← BACK TO HUD')).toBeInTheDocument()
    })
    
    const backButton = screen.getByText('← BACK TO HUD')
    await user.click(backButton)
    
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('should not show back button when onBack is not provided', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      expect(screen.getByText('QUESTS')).toBeInTheDocument()
    })
    
    expect(screen.queryByText('← BACK TO HUD')).not.toBeInTheDocument()
  })

  it('should render quest link when provided', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      const link = screen.getByText('OPEN RESOURCE →')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/quest1')
    })
  })

  it('should handle fetch errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Failed to fetch quests' }),
    })

    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={[]} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch quests/i)).toBeInTheDocument()
    })
  })

  it('should display progress bar for started quests', async () => {
    render(<Quests onSelectQuest={mockOnSelectQuest} userQuests={mockUserQuests} />)
    
    await waitFor(() => {
      const progressBars = document.querySelectorAll('.quest-progress-bar')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })
})

