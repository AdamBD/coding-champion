import { useState, useEffect } from 'react'
import './Quests.css'
import { API_BASE_URL, useAuthFetch } from './utils/api'

function Quests({ onSelectQuest, userQuests, onBack, onNavigateToChat }) {
  const authFetch = useAuthFetch()
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchQuests()
  }, [])

  const fetchQuests = async () => {
    try {
      setLoading(true)
      const response = await authFetch(`${API_BASE_URL}/quests`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || data.error)
      }

      // Merge with user quest data to show progress
      const questsWithProgress = data.quests.map(quest => {
        const userQuest = userQuests?.find(uq => uq.quest_id === quest.id)
        return {
          ...quest,
          started: !!userQuest,
          progress: userQuest?.progress_percent || 0,
          completed: !!userQuest?.completed_at
        }
      })

      setQuests(questsWithProgress)
    } catch (err) {
      setError(err.message || 'Failed to load quests')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="quests-page">
        <div className="loading">[ LOADING QUESTS... ]</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quests-page">
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="quests-page">
      <header className="quests-header">
        {onBack && (
          <button className="back-button" onClick={onBack}>← BACK TO HUD</button>
        )}
        <h1>QUESTS</h1>
        <p className="quests-subtitle">Choose your learning path</p>
        {onNavigateToChat && (
          <button className="create-quest-button" onClick={onNavigateToChat}>
            + CREATE NEW QUEST
          </button>
        )}
      </header>

      <div className="quests-gallery">
        {quests.map(quest => (
          <div
            key={quest.id}
            className={`quest-card ${quest.started ? 'started' : ''} ${quest.completed ? 'completed' : ''}`}
            onClick={() => onSelectQuest(quest)}
          >
            <img
              src={`${API_BASE_URL}/quests/${quest.id}/thumbnail?t=${Date.now()}`}
              alt={quest.name}
              className="quest-card-thumbnail"
              onError={(e) => {
                // Hide image if thumbnail doesn't exist (404)
                e.target.style.display = 'none'
              }}
            />
            <div className="quest-card-header">
              <h2>{quest.name}</h2>
              {quest.completed && <span className="quest-badge completed-badge">COMPLETE</span>}
              {quest.started && !quest.completed && <span className="quest-badge started-badge">IN PROGRESS</span>}
            </div>
            <p className="quest-card-description">{quest.description}</p>
            {quest.link && (
              <div className="quest-card-link">
                <a 
                  href={quest.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="quest-card-link-button"
                >
                  OPEN RESOURCE →
                </a>
              </div>
            )}
            <div className="quest-card-footer">
              <div className="quest-stats">
                <span>{quest.step_count} Steps</span>
                <span>{quest.total_xp_reward.toLocaleString()} XP</span>
              </div>
              {quest.started && (
                <div className="quest-progress-bar">
                  <div 
                    className="quest-progress-fill" 
                    style={{ width: `${quest.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Quests

