import { useState, useEffect, useRef } from 'react'
import './ResearchProgress.css'
import { API_BASE_URL, useAuthFetch } from './utils/api'

function ResearchProgress({ sessionId, interactionId, onComplete }) {
  const authFetch = useAuthFetch()
  const [researchProgress, setResearchProgress] = useState(10)
  const [researchStatus, setResearchStatus] = useState('running')
  const [clickerProgress, setClickerProgress] = useState(100)
  const [clicks, setClicks] = useState(0)
  const [confettiParticles, setConfettiParticles] = useState([])
  const clickerIntervalRef = useRef(null)
  const progressPollIntervalRef = useRef(null)
  const isCompletedRef = useRef(false) // Track if we've already completed

  // Check Deep Research progress from database (backend manages polling)
  useEffect(() => {
    if (!sessionId || !interactionId) return
    
    // Reset completion flag when component mounts with new IDs
    isCompletedRef.current = false

    const checkProgress = async () => {
      // Don't check if already completed
      if (isCompletedRef.current) {
        return
      }

      try {
        // Read status from database (backend updates this)
        const response = await authFetch(
          `${API_BASE_URL}/quest-chat-progress?session_id=${sessionId}&interaction_id=${interactionId}`
        )
        const data = await response.json()

        if (!data.error) {
          console.log('[ResearchProgress] Status from backend:', data.status, 'Progress:', data.progress)
          setResearchProgress(data.progress || 1)
          setResearchStatus(data.status || 'in_progress')

          if (data.status === 'completed') {
            // Only process completion once
            if (isCompletedRef.current) {
              return
            }
            isCompletedRef.current = true
            
            console.log('[ResearchProgress] Research completed!')
            setResearchProgress(100)
            setResearchStatus('completed')
            // Stop checking
            if (progressPollIntervalRef.current) {
              clearInterval(progressPollIntervalRef.current)
              progressPollIntervalRef.current = null
            }
            // Wait a moment for backend to save the message, then call onComplete
            setTimeout(() => {
              if (onComplete) {
                onComplete()
              }
            }, 2000)
            return
          } else if (data.status === 'failed') {
            // Only process failure once
            if (isCompletedRef.current) {
              return
            }
            isCompletedRef.current = true
            
            console.log('[ResearchProgress] Research failed!')
            setResearchStatus('failed')
            // Stop checking
            if (progressPollIntervalRef.current) {
              clearInterval(progressPollIntervalRef.current)
              progressPollIntervalRef.current = null
            }
            // Call onComplete to hide the component
            setTimeout(() => {
              if (onComplete) {
                onComplete()
              }
            }, 1000)
            return
          }
          
          // If still active, continue checking
          // Backend manages the actual polling, we just read the status
        } else {
          console.error('[ResearchProgress] Error from API:', data.error)
        }
      } catch (error) {
        console.error('Error checking progress:', error)
      }
    }

    // Check immediately, then every 3 seconds (backend polls every 10s, so 3s is fine)
    checkProgress()
    progressPollIntervalRef.current = setInterval(checkProgress, 3000)

    return () => {
      console.log('[ResearchProgress] Cleaning up polling for session:', sessionId, 'interaction:', interactionId)
      if (progressPollIntervalRef.current) {
        clearInterval(progressPollIntervalRef.current)
        progressPollIntervalRef.current = null
      }
      isCompletedRef.current = false
    }
  }, [sessionId, interactionId, onComplete])

  // Clicker game: bar decreases over time
  useEffect(() => {
    clickerIntervalRef.current = setInterval(() => {
      setClickerProgress((prev) => {
        const newProgress = Math.max(0, prev - 0.5) // Decrease by 0.5% every 100ms
        if (newProgress <= 0) {
          // Bar depleted - reset to 100% but don't penalize
          return 100
        }
        return newProgress
      })
    }, 100) // Update every 100ms

    return () => {
      if (clickerIntervalRef.current) {
        clearInterval(clickerIntervalRef.current)
      }
    }
  }, [])

  const handleClick = () => {
    setClicks((prev) => prev + 1)
    setClickerProgress((prev) => Math.min(100, prev + 5)) // Increase by 5% per click

    // Create confetti particles
    const particles = []
    const colors = ['#4a9eff', '#6bcf7f', '#ffa500'] // XP blue, level green, streak orange
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20
      const distance = 50 + Math.random() * 50
      particles.push({
        id: Date.now() + i,
        left: 50 + Math.cos(angle) * distance,
        offsetX: Math.cos(angle) * distance,
        delay: Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    setConfettiParticles(particles)

    // Clear particles after animation
    setTimeout(() => {
      setConfettiParticles([])
    }, 1000)
  }

  return (
    <div className="research-progress-container">
      <div className="research-progress-section">
        <h3 className="research-progress-title">🔍 ANALYZING COURSE...</h3>
        <div className="research-progress-bar-container">
          <div
            className="research-progress-bar"
            style={{ width: `${researchProgress}%` }}
          >
            <span className="research-progress-text">
              {researchProgress.toFixed(0)}%
            </span>
          </div>
        </div>
        <p className="research-progress-status">
          {researchStatus === 'running' && 'Browsing pages and extracting content...'}
          {researchStatus === 'pending' && 'Starting analysis...'}
          {researchStatus === 'completed' && 'Analysis complete!'}
          {researchStatus === 'failed' && 'Analysis failed'}
        </p>
      </div>

      <div className="clicker-game-section">
        <h3 className="clicker-game-title">⚡ KEEP THE ENERGY UP!</h3>
        <p className="clicker-game-instruction">
          Click to maintain your focus! The bar decreases over time.
        </p>
        <div className="clicker-progress-bar-container">
          <div
            className={`clicker-progress-bar ${clickerProgress < 30 ? 'low' : clickerProgress < 70 ? 'medium' : 'high'}`}
            style={{ width: `${clickerProgress}%` }}
          >
            <span className="clicker-progress-text">
              {clickerProgress.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="clicker-button-wrapper">
          <button
            className="clicker-button"
            onClick={handleClick}
            disabled={researchStatus === 'completed' || researchStatus === 'failed'}
          >
            CLICK ME! ({clicks})
          </button>
          {confettiParticles.map((particle) => {
            const style = {
              left: `${particle.left}%`,
              backgroundColor: particle.color,
              animationDelay: `${particle.delay}s`,
              '--offset-x': `${particle.offsetX}px`,
            }
            return (
              <div
                key={particle.id}
                className="confetti-particle"
                style={style}
                data-offset-x={particle.offsetX}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ResearchProgress

