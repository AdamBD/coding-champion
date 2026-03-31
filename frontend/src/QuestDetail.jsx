import { useState, useEffect, useRef } from 'react'
import './QuestDetail.css'
import { extractDominantColor } from './utils/colorExtractor'
import { API_BASE_URL, useAuthFetch } from './utils/api'

// Final Fantasy Victory Fanfare - Classic quest completion/level up sound
// This is the iconic "Victory Fanfare" that plays when you win battles or level up in Final Fantasy
// 
// To add the sound:
// 1. Download the classic Final Fantasy Victory Fanfare from:
//    - https://www.myinstants.com/en/instant/final-fantasy-victory-fanfare/ (click download)
//    - Or search for "Final Fantasy victory fanfare" on freesound.org or similar sites
// 2. Rename it to "ff-victory.mp3" and place it in: frontend/public/sounds/ff-victory.mp3
// 3. The sound will automatically play when quest steps are completed!
const QUEST_SUCCESS_SOUND = '/sounds/ff-victory.mp3'

function QuestDetail({ quest, onBack, onRefresh }) {
  const authFetch = useAuthFetch()
  const [userQuest, setUserQuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const [uncompleting, setUncompleting] = useState(null)
  const [error, setError] = useState(null)
  const [showWinAnimation, setShowWinAnimation] = useState(false)
  const [completedStepId, setCompletedStepId] = useState(null)
  const [confettiPieces, setConfettiPieces] = useState([])
  const [particles, setParticles] = useState([])
  const [dominantColor, setDominantColor] = useState(null)
  const successSoundRef = useRef(null)
  const thumbnailRef = useRef(null)

  useEffect(() => {
    if (quest) {
      fetchUserQuest()
    }
  }, [quest])

  // Extract dominant color from thumbnail when it loads
  useEffect(() => {
    if (!quest) {
      setDominantColor(null)
      return
    }
    
    const extractColorFromThumbnail = () => {
      const thumbnailUrl = `${API_BASE_URL}/quests/${quest.id}/thumbnail`
      
      // Try to extract color from the thumbnail
      extractDominantColor(thumbnailUrl)
        .then(color => {
          console.log(`[QuestDetail] Extracted color for quest ${quest.id}:`, color)
          setDominantColor(color)
        })
        .catch(error => {
          console.error(`[QuestDetail] Failed to extract color for quest ${quest.id}:`, error)
          // Don't set default color - let it stay null so no glow shows if extraction fails
          // This way quests without thumbnails won't show a glow
          setDominantColor(null)
        })
    }

    // Handle thumbnail load event
    const handleThumbnailLoad = () => {
      console.log(`[QuestDetail] Thumbnail loaded for quest ${quest.id}`)
      extractColorFromThumbnail()
    }

    // Check if image is already loaded (cached)
    const timer = setTimeout(() => {
      if (thumbnailRef.current) {
        if (thumbnailRef.current.complete && thumbnailRef.current.naturalWidth > 0) {
          // Image already loaded
          console.log(`[QuestDetail] Image already loaded for quest ${quest.id}`)
          extractColorFromThumbnail()
        } else {
          // Image not loaded yet, wait for onLoad event
          thumbnailRef.current.addEventListener('load', handleThumbnailLoad, { once: true })
        }
      }
    }, 100)
    
    return () => {
      clearTimeout(timer)
      if (thumbnailRef.current) {
        thumbnailRef.current.removeEventListener('load', handleThumbnailLoad)
      }
    }
  }, [quest])

  // Note: Audio element is created fresh each time it plays to avoid caching issues
  // No need to pre-initialize since we create it on-demand

  const fetchUserQuest = async () => {
    try {
      setLoading(true)
      const response = await authFetch(`${API_BASE_URL}/user-quests`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || data.error)
      }

      const found = data.user_quests?.find(uq => uq.quest_id === quest.id)
      setUserQuest(found)
    } catch (err) {
      setError(err.message || 'Failed to load quest progress')
    } finally {
      setLoading(false)
    }
  }

  const startQuest = async () => {
    try {
      setError(null)
      const response = await authFetch(`${API_BASE_URL}/user-quests`, {
        method: 'POST',
        body: JSON.stringify({ quest_id: quest.id })
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || data.error)
      }

      await fetchUserQuest()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to start quest')
    }
  }

  const completeStep = async (stepId) => {
    try {
      setCompleting(stepId)
      setError(null)
      const response = await authFetch(`${API_BASE_URL}/quest-steps`, {
        method: 'POST',
        body: JSON.stringify({ quest_step_id: stepId })
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || data.error)
      }

      // Generate random confetti and particle positions covering the entire screen
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const centerX = viewportWidth / 2
      const centerY = viewportHeight / 2
      
      const newConfetti = Array.from({ length: 80 }, (_, i) => {
        // Start from center, spread across entire screen
        const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.5
        const distance = Math.random() * Math.max(viewportWidth, viewportHeight) * 0.8
        const startX = centerX + (Math.random() - 0.5) * viewportWidth * 0.3
        const startY = centerY + (Math.random() - 0.5) * viewportHeight * 0.3
        
        return {
          id: i,
          startX: `${startX}px`,
          startY: `${startY}px`,
          x: Math.cos(angle) * distance + (Math.random() - 0.5) * viewportWidth * 0.2,
          y: Math.sin(angle) * distance + Math.random() * viewportHeight * 0.5,
          delay: Math.random() * 0.6,
          color: ['var(--color-xp)', 'var(--color-level)', 'var(--color-streak)', 'var(--text-accent)', 'var(--text-primary)'][i % 5]
        }
      })
      
      const newParticles = Array.from({ length: 30 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 30
        const distance = Math.random() * Math.max(viewportWidth, viewportHeight) * 0.6
        
        return {
          id: i,
          startX: `${centerX}px`,
          startY: `${centerY}px`,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          delay: Math.random() * 0.4,
        }
      })
      
      setConfettiPieces(newConfetti)
      setParticles(newParticles)
      
      // Play success sound - create fresh audio element to avoid caching
      try {
        // Create a new audio element each time to ensure we get the latest file
        const audio = new Audio(`${QUEST_SUCCESS_SOUND}?t=${Date.now()}`)
        audio.volume = 0.7
        audio.play().catch(err => {
          // Handle autoplay restrictions - user interaction may be required
          console.log('Audio play failed (may need user interaction):', err)
        })
        // Keep reference for cleanup if needed
        successSoundRef.current = audio
      } catch (err) {
        console.log('Could not play quest success sound:', err)
      }
      
      // Trigger win animation
      setCompletedStepId(stepId)
      setShowWinAnimation(true)
      
      // Hide animation after it completes
      setTimeout(() => {
        setShowWinAnimation(false)
        setCompletedStepId(null)
        setConfettiPieces([])
        setParticles([])
      }, 3000)

      await fetchUserQuest()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to complete step')
    } finally {
      setCompleting(null)
    }
  }

  const uncompleteStep = async (stepId) => {
    try {
      setUncompleting(stepId)
      setError(null)
      const response = await authFetch(`${API_BASE_URL}/quest-steps`, {
        method: 'DELETE',
        body: JSON.stringify({ quest_step_id: stepId })
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || data.error)
      }

      await fetchUserQuest()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to uncomplete step')
    } finally {
      setUncompleting(null)
    }
  }

  if (loading) {
    return (
      <div className="quest-detail-page">
        <div className="loading">[ LOADING... ]</div>
      </div>
    )
  }

  const currentStep = userQuest?.steps?.find(step => 
    !step.completed && step.step_order >= (userQuest.current_step_order || 1)
  ) || quest.steps?.[0]

  const progress = userQuest 
    ? Math.round((userQuest.completed_steps / userQuest.total_steps) * 100)
    : 0

  // Calculate earned XP from completed steps
  const earnedXp = userQuest?.steps
    ? userQuest.steps
        .filter(step => step.completed)
        .reduce((total, step) => total + (step.xp_reward || 0), 0)
    : 0

  return (
    <div 
      className="quest-detail-page"
      style={dominantColor ? {
        '--quest-glow-color': dominantColor,
      } : {}}
    >
      {/* Win Animation Overlay */}
      {showWinAnimation && (
        <div className="win-animation-overlay">
          <div className="win-animation-container">
            <div className="win-text">STEP COMPLETE!</div>
            <div className="win-xp">+{quest.steps?.find(s => s.id === completedStepId)?.xp_reward || 0} XP</div>
            <div className="confetti-container">
              {confettiPieces.map((piece) => (
                <div
                  key={piece.id}
                  className="confetti"
                  style={{
                    '--start-x': piece.startX,
                    '--start-y': piece.startY,
                    '--random-x': `${piece.x}px`,
                    '--random-y': `${piece.y}px`,
                    '--delay': `${piece.delay}s`,
                    'background': piece.color,
                    top: piece.startY,
                    left: piece.startX,
                    animationDelay: piece.delay + 's'
                  }}
                ></div>
              ))}
            </div>
            <div className="particles-container">
              {particles.map((particle) => (
                <div
                  key={particle.id}
                  className="particle"
                  style={{
                    '--start-x': particle.startX,
                    '--start-y': particle.startY,
                    '--random-x': `${particle.x}px`,
                    '--random-y': `${particle.y}px`,
                    '--delay': `${particle.delay}s`,
                    top: particle.startY,
                    left: particle.startX,
                    animationDelay: particle.delay + 's'
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="quest-detail-header">
        <button className="back-button" onClick={onBack}>← BACK</button>
        <h1>{quest.name}</h1>
      </header>

      {error && (
        <div className="error-banner">
          <span>[ ERROR ] {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="quest-detail-content">
        <div className="quest-overview">
          <img
            ref={thumbnailRef}
            src={`${API_BASE_URL}/quests/${quest.id}/thumbnail?t=${Date.now()}`}
            alt={quest.name}
            className="quest-detail-thumbnail"
            onLoad={() => {
              console.log(`[QuestDetail] Thumbnail onLoad event for quest ${quest.id}`)
              const thumbnailUrl = `${API_BASE_URL}/quests/${quest.id}/thumbnail?t=${Date.now()}`
              extractDominantColor(thumbnailUrl)
                .then(color => {
                  console.log(`[QuestDetail] Extracted color for quest ${quest.id}:`, color)
                  setDominantColor(color)
                })
                .catch(error => {
                  console.error(`[QuestDetail] Failed to extract color for quest ${quest.id}:`, error)
                  setDominantColor(null)
                })
            }}
            onError={(e) => {
              // Hide image if thumbnail doesn't exist (404)
              console.log(`[QuestDetail] Thumbnail not found for quest ${quest.id}`)
              e.target.style.display = 'none'
              // Don't set dominant color if thumbnail fails to load
              setDominantColor(null)
            }}
          />
          <p className="quest-description">{quest.description}</p>
          {quest.link && (
            <div className="quest-link-section">
              <a 
                href={quest.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="quest-link-button"
              >
                OPEN RESOURCE →
              </a>
            </div>
          )}
          <div className="quest-meta">
            <span>{quest.step_count} Steps</span>
            <span>{quest.total_xp_reward.toLocaleString()} XP Total</span>
            {userQuest && (
              <>
                <span>{progress}% Complete</span>
                <span>{userQuest.completed_steps} / {userQuest.total_steps} Steps</span>
                <span>{earnedXp.toLocaleString()} / {quest.total_xp_reward.toLocaleString()} XP</span>
              </>
            )}
          </div>
          {userQuest && (
            <div className="quest-progress-bar-large">
              <div 
                className="quest-progress-fill-large" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>

        {!userQuest ? (
          <div className="quest-start-section">
            <button className="start-quest-button" onClick={startQuest}>
              START QUEST
            </button>
          </div>
        ) : (
          <div className="quest-current-section">
            <h2>CURRENT STEP</h2>
            {currentStep && (
              <div className="current-step-card">
                <div className="current-step-header">
                  <span className="step-number">STEP {currentStep.step_order}</span>
                  <span className="step-xp">+{currentStep.xp_reward} XP</span>
                </div>
                <h3>{currentStep.name}</h3>
                <p>{currentStep.description}</p>
                <button
                  className="complete-step-button"
                  onClick={() => completeStep(currentStep.id)}
                  disabled={completing === currentStep.id}
                >
                  {completing === currentStep.id ? 'COMPLETING...' : 'MARK AS COMPLETE'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="quest-steps-section">
          <h2>ALL STEPS</h2>
          <div className="steps-list">
            {quest.steps?.map((step, index) => {
              const isCompleted = userQuest?.steps?.find(s => s.id === step.id)?.completed
              const isCurrent = userQuest && step.id === currentStep?.id && !isCompleted

              return (
                <div
                  key={step.id}
                  className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <div className="step-indicator">
                    {isCompleted ? '✓' : step.step_order}
                  </div>
                  <div className="step-content">
                    <div className="step-header">
                      <h3>{step.name}</h3>
                      <span className="step-xp-small">+{step.xp_reward} XP</span>
                    </div>
                    <p>{step.description}</p>
                    {isCompleted && userQuest && (
                      <button
                        className="uncomplete-step-button"
                        onClick={() => uncompleteStep(step.id)}
                        disabled={uncompleting === step.id}
                      >
                        {uncompleting === step.id ? 'UNCOMPLETING...' : 'UNCOMPLETE'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestDetail

