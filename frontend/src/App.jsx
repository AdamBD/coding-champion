import { useState, useEffect } from 'react'
import { SignedIn, SignedOut, SignIn, useUser, useClerk } from '@clerk/clerk-react'
import './App.css'
import Quests from './Quests'
import QuestDetail from './QuestDetail'
import QuestChat from './QuestChat'
import { API_BASE_URL, useAuthFetch } from './utils/api'

function AppInner() {
  const authFetch = useAuthFetch()
  const { user } = useUser()
  const { openUserProfile } = useClerk()
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [userQuests, setUserQuests] = useState([])
  const [description, setDescription] = useState('')
  const [xpEarned, setXpEarned] = useState('')
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentView, setCurrentView] = useState('home') // 'home', 'quests', 'quest-detail', 'quest-chat'
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousView, setPreviousView] = useState(null)
  const [previousQuest, setPreviousQuest] = useState(null)

  // Fetch stats and activities on mount
  useEffect(() => {
    fetchData()
  }, [])

  // Fetch user quests
  useEffect(() => {
    fetchUserQuests()
  }, [])

  // Parallax effect for hero image
  useEffect(() => {
    const handleScroll = () => {
      const heroImage = document.getElementById('hero-image')
      if (heroImage) {
        const scrolled = window.pageYOffset
        const parallaxSpeed = 0.5
        heroImage.style.transform = `translateY(${scrolled * parallaxSpeed}px)`
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch stats and activities in parallel
      const [statsResponse, activitiesResponse] = await Promise.all([
        authFetch(`${API_BASE_URL}/stats`),
        authFetch(`${API_BASE_URL}/activities`)
      ])

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch stats')
      }
      if (!activitiesResponse.ok) {
        throw new Error('Failed to fetch activities')
      }

      const statsData = await statsResponse.json()
      const activitiesData = await activitiesResponse.json()

      if (statsData.error) {
        throw new Error(statsData.message || statsData.error)
      }
      if (activitiesData.error) {
        throw new Error(activitiesData.message || activitiesData.error)
      }

      setStats(statsData)
      setActivities(activitiesData.activities || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description || !xpEarned) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await authFetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          xp_earned: parseInt(xpEarned),
          duration_minutes: duration ? parseInt(duration) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to create activity')
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.message || result.error)
      }

      // Refresh data after successful submission
      await fetchData()

      // Reset form
      setDescription('')
      setXpEarned('')
      setDuration('')
    } catch (err) {
      setError(err.message || 'Failed to log activity')
      console.error('Error creating activity:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const fetchUserQuests = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/user-quests`)
      const data = await response.json()
      if (!data.error) {
        setUserQuests(data.user_quests || [])
      }
    } catch (err) {
      console.error('Error fetching user quests:', err)
    }
  }

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchUserQuests()])
  }

  const handleSelectQuest = (quest) => {
    setPreviousView(currentView)
    setPreviousQuest(selectedQuest)
    setIsTransitioning(true)
    setTimeout(() => {
      setSelectedQuest(quest)
      setCurrentView('quest-detail')
      setTimeout(() => {
        setIsTransitioning(false)
        setPreviousView(null)
        setPreviousQuest(null)
      }, 300)
    }, 300)
  }

  const handleViewChange = (newView) => {
    setPreviousView(currentView)
    setPreviousQuest(selectedQuest)
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentView(newView)
      if (newView !== 'quest-detail') {
        setSelectedQuest(null)
      }
      setTimeout(() => {
        setIsTransitioning(false)
        setPreviousView(null)
        setPreviousQuest(null)
      }, 300)
    }, 300)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get current active quest
  const activeQuest = userQuests?.find(uq => !uq.completed_at)
  const currentStep = activeQuest?.steps?.find(step => 
    !step.completed && step.step_order >= (activeQuest.current_step_order || 1)
  )

  // Render function for each view
  const renderView = (view, quest, isExiting = false) => {
    if (view === 'quests') {
      return (
        <div key="quests" className={`page-transition ${isExiting ? 'fade-out' : 'fade-in'}`}>
          <Quests 
            onSelectQuest={handleSelectQuest}
            userQuests={userQuests}
            onBack={() => handleViewChange('home')}
            onNavigateToChat={() => handleViewChange('quest-chat')}
          />
        </div>
      )
    }

    if (view === 'quest-detail' && quest) {
      return (
        <div key="quest-detail" className={`page-transition ${isExiting ? 'fade-out' : 'fade-in'}`}>
          <QuestDetail
            quest={quest}
            onBack={() => handleViewChange('quests')}
            onRefresh={handleRefresh}
          />
        </div>
      )
    }

    if (view === 'quest-chat') {
      return (
        <div key="quest-chat" className={`page-transition ${isExiting ? 'fade-out' : 'fade-in'}`}>
          <QuestChat
            onBack={() => handleViewChange('quests')}
          />
        </div>
      )
    }

    if (view === 'home') {
      return (
        <div key="home" className={`page-transition ${isExiting ? 'fade-out' : 'fade-in'}`}>
          {renderHomeView()}
        </div>
      )
    }

    return null
  }

  const renderHomeView = () => {
    if (loading) {
      return (
        <div className="app">
          <div className="loading">[ INITIALIZING HUD... ]</div>
        </div>
      )
    }

    if (error && !stats) {
      return (
        <div className="app">
          <div className="error">
            <h2>[ SYSTEM ERROR ]</h2>
            <p>{error}</p>
            <button onClick={fetchData}>[ RETRY ]</button>
          </div>
        </div>
      )
    }

    return (
      <div className="app">
        {/* Hero Image */}
        <section className="hero-section">
          <div className="hero-image-container">
            <img 
              src="/hero-image.jpg" 
              alt="Coding Champion" 
              className="hero-image"
              id="hero-image"
              onError={(e) => {
                console.error('Hero image failed to load')
                e.target.style.display = 'none'
              }}
            />
          </div>
        </section>

        {/* Header/Navigation */}
        <header>
          <h1>CODING CHAMPION</h1>
          <nav className="main-nav">
            <button onClick={() => handleViewChange('quests')}>QUESTS</button>
            <button onClick={() => handleViewChange('quest-chat')}>CREATE QUEST</button>
          </nav>
          <div className="user-section">
            <button className="user-button" onClick={() => openUserProfile()}>
              {user?.firstName}
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>[ ERROR ] {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <main>
          {/* Stats HUD */}
          {stats && (
            <section className="stats-section">
              <div className="stats-card">
                <div className="level-badge">
                  <span className="level-label">LEVEL</span>
                  <span className="level-number">{stats.stats.level}</span>
                </div>
                
                <div className="xp-info">
                  <div className="xp-total">
                    <span className="xp-label">TOTAL XP</span>
                    <span className="xp-value">{stats.stats.total_xp.toLocaleString()}</span>
                  </div>
                  <div className="xp-progress">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${stats.stats.progress_percent}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {stats.stats.xp_in_current_level} / 1000 XP TO LEVEL {stats.stats.level + 1}
                    </div>
                  </div>
                </div>

                <div className="streak-info">
                  <div className="streak-item">
                    <span className="streak-label">CURRENT STREAK</span>
                    <span className="streak-value">{stats.user.current_streak} DAYS</span>
                  </div>
                  <div className="streak-item">
                    <span className="streak-label">LONGEST STREAK</span>
                    <span className="streak-value">{stats.user.longest_streak} DAYS</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Active Quest HUD */}
          {activeQuest && (
            <section className="quest-hud-section">
              <div className="quest-hud-card">
                <div className="quest-hud-header">
                  <h2>ACTIVE QUEST</h2>
                  <button 
                    className="quest-hud-link"
                    onClick={() => {
                      authFetch(`${API_BASE_URL}/quests`)
                        .then(r => r.json())
                        .then(data => {
                          const quest = data.quests.find(q => q.id === activeQuest.quest_id)
                          if (quest) {
                            handleSelectQuest(quest)
                          }
                        })
                    }}
                  >
                    VIEW →
                  </button>
                </div>
                <div className="quest-hud-content">
                  <h3>{activeQuest.quest_name}</h3>
                  <div className="quest-hud-progress">
                    <div className="quest-hud-progress-bar">
                      <div 
                        className="quest-hud-progress-fill" 
                        style={{ width: `${activeQuest.progress_percent}%` }}
                      ></div>
                    </div>
                    <span>{activeQuest.progress_percent}% Complete</span>
                  </div>
                  {currentStep && (
                    <div className="quest-hud-next-step">
                      <span className="quest-hud-step-label">NEXT STEP</span>
                      <span className="quest-hud-step-name">{currentStep.name}</span>
                      <span className="quest-hud-step-xp">+{currentStep.xp_reward} XP</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Log Activity Form */}
          <section className="activity-section">
            <h2>LOG SESSION</h2>
            <form onSubmit={handleSubmit} className="activity-form">
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Built a compiler parser..."
                  required
                  disabled={submitting}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="xp">XP Earned</label>
                  <input
                    id="xp"
                    type="number"
                    value={xpEarned}
                    onChange={(e) => setXpEarned(e.target.value)}
                    placeholder="100"
                    min="1"
                    required
                    disabled={submitting}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="duration">Duration (min)</label>
                  <input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="120"
                    min="1"
                    disabled={submitting}
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'SUBMITTING...' : 'SUBMIT'}
              </button>
            </form>
          </section>

          {/* Recent Activities */}
          <section className="activities-section">
            <h2>ACTIVITY LOG</h2>
            <div className="activities-list">
              {activities.length === 0 ? (
                <p className="no-activities">No activities yet.<br/>Start logging your study sessions!</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="activity-card">
                    <div className="activity-header">
                      <span className="activity-xp">+{activity.xp_earned} XP</span>
                      <span className="activity-date">{formatDate(activity.created_at)}</span>
                    </div>
                    <div className="activity-description">{activity.description}</div>
                    {activity.duration_minutes && (
                      <div className="activity-duration">
                        {activity.duration_minutes} minutes
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    )
  }

  // Handle navigation views with transitions
  if (currentView === 'quests') {
    return (
      <div className="page-container">
        {previousView && previousView !== 'quests' && renderView(previousView, previousQuest, true)}
        {renderView('quests', null, false)}
      </div>
    )
  }

  if (currentView === 'quest-detail' && selectedQuest) {
    return (
      <div className="page-container">
        {previousView && previousView !== 'quest-detail' && renderView(previousView, previousQuest, true)}
        {renderView('quest-detail', selectedQuest, false)}
      </div>
    )
  }

  if (currentView === 'quest-chat') {
    return (
      <div className="page-container">
        {previousView && previousView !== 'quest-chat' && renderView(previousView, previousQuest, true)}
        {renderView('quest-chat', null, false)}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">[ INITIALIZING HUD... ]</div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="app">
        <div className="error">
          <h2>[ SYSTEM ERROR ]</h2>
          <p>{error}</p>
          <button onClick={fetchData}>[ RETRY ]</button>
        </div>
      </div>
    )
  }

  // Home view
  return (
    <div className="page-container">
      {previousView && previousView !== 'home' && renderView(previousView, previousQuest, true)}
      {renderView('home', null, false)}
    </div>
  )
}

function App() {
  return (
    <>
      <SignedOut>
        <div className="auth-screen">
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <AppInner />
      </SignedIn>
    </>
  )
}

export default App
