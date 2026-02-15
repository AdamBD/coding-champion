import { useState, useRef, useEffect } from 'react'
import './QuestChat.css'
import ResearchProgress from './ResearchProgress'
import QuestPreview from './QuestPreview'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Try to parse quest JSON from message content
 * Looks for JSON objects with 'quest' and 'quest_steps' properties
 */
function parseQuestJson(content) {
  try {
    // Try to find JSON in the message (might be wrapped in markdown code blocks or plain JSON)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|(\{[\s\S]*"quest"[\s\S]*\})/)
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[2] || jsonMatch[3]) : content
    
    const parsed = JSON.parse(jsonStr.trim())
    
    // Validate it has the quest structure we expect
    if (parsed && (parsed.quest || parsed.quest_steps)) {
      return parsed
    }
  } catch (e) {
    // Not valid JSON or not a quest structure
    return null
  }
  return null
}

function QuestChat({ onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [showChatList, setShowChatList] = useState(true)
  const [researching, setResearching] = useState(false)
  const [researchInteractionId, setResearchInteractionId] = useState(null)
  const messagesEndRef = useRef(null)
  const isLoadingHistoryRef = useRef(false)

  useEffect(() => {
    fetchChats()
  }, [])

  // Only auto-load history if sessionId is set but we don't have a selectedChat
  // This handles the case where a new session is created from sending a message
  useEffect(() => {
    if (sessionId && !selectedChat && messages.length === 0 && !isLoadingHistoryRef.current) {
      loadChatHistory(sessionId)
    }
  }, [sessionId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchChats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quest-chats`)
      const data = await response.json()
      if (!data.error) {
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const loadChatHistory = async (sid) => {
    if (isLoadingHistoryRef.current) {
      console.log('[QuestChat] Already loading history, skipping...')
      return // Already loading
    }
    
    isLoadingHistoryRef.current = true
    setLoading(true)
    console.log('[QuestChat] Loading chat history for session:', sid)
    try {
      const response = await fetch(`${API_BASE_URL}/quest-chats/${sid}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.message || data.error)
      }
      
      // Update messages
      console.log('[QuestChat] Received messages:', data.messages?.length || 0)
      if (data.messages && data.messages.length > 0) {
        const formattedMessages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }))
        console.log('[QuestChat] Setting messages:', formattedMessages.length)
        setMessages(formattedMessages)
      } else {
        console.log('[QuestChat] No messages found, setting empty array')
        setMessages([])
      }
      
      // Update selected chat
      if (data.session) {
        setSelectedChat(data.session)
        console.log('[QuestChat] Loaded session Deep Research status:', data.session.deep_research_status, 'interaction_id:', data.session.deep_research_interaction_id)
        // Only show progress if Deep Research is actively running or pending (NOT completed or failed)
        if (data.session.deep_research_status === 'running' || 
            data.session.deep_research_status === 'pending' || 
            data.session.deep_research_status === 'in_progress') {
          // If Deep Research is still running, show progress
          console.log('[QuestChat] Restoring Deep Research progress component')
          setResearching(true)
          setResearchInteractionId(data.session.deep_research_interaction_id)
        } else {
          // Clear research state for completed, failed, or no research
          console.log('[QuestChat] Clearing Deep Research state (status:', data.session.deep_research_status, ')')
          setResearching(false)
          setResearchInteractionId(null)
        }
      } else {
        // No session data, clear research state
        setResearching(false)
        setResearchInteractionId(null)
      }
      
      return data
    } catch (error) {
      console.error('Error loading chat history:', error)
      setMessages([])
      setSelectedChat(null)
      throw error
    } finally {
      setLoading(false)
      isLoadingHistoryRef.current = false
    }
  }

  const handleSelectChat = async (chat) => {
    // Clear research state immediately when switching chats
    setResearching(false)
    setResearchInteractionId(null)
    setMessages([])
    setSelectedChat(null)
    
    try {
      // Update session ID first
      setSessionId(chat.session_id)
      
      // Load chat history (this will set loading state and research state if needed)
      await loadChatHistory(chat.session_id)
      
      // Hide sidebar after successful load
      setShowChatList(false)
    } catch (error) {
      console.error('Failed to load chat:', error)
      // Ensure research state is cleared on error
      setResearching(false)
      setResearchInteractionId(null)
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    // Clear research state when starting new chat
    setResearching(false)
    setResearchInteractionId(null)
    setSessionId(null)
    setMessages([])
    setSelectedChat(null)
    setShowChatList(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    try {
      const response = await fetch(`${API_BASE_URL}/quest-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || data.error)
      }

      // Update session ID if provided
      if (data.session_id) {
        if (!sessionId) {
          setSessionId(data.session_id)
        }
        // Refresh chat list to show updated message count
        fetchChats()
      }

      // Handle Deep Research status
      if (data.type === 'researching') {
        setResearching(true)
        setResearchInteractionId(data.interaction_id)
        // Add the initial message about research starting
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.chat_response || 'Analysis started...' },
        ])
      } else if (data.type === 'preview' && data.preview) {
        // Quest structure generated - embed JSON so QuestPreview renders it
        setResearching(false)
        setResearchInteractionId(null)
        const questJson = JSON.stringify(data.preview, null, 2)
        setMessages([
          ...newMessages,
          { role: 'assistant', content: '```json\n' + questJson + '\n```' },
        ])
      } else {
        // Normal message response
        setResearching(false)
        setResearchInteractionId(null)
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.chat_response || 'No response' },
        ])
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Error: ${error.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="quest-chat">
      <div className={`quest-chat-sidebar ${showChatList ? '' : 'hidden'}`}>
        <div className="quest-chat-sidebar-header">
          <h2>CHATS</h2>
          <button className="new-chat-button" onClick={handleNewChat}>
            + NEW
          </button>
        </div>
        <div className="quest-chat-list">
          {chats.map((chat) => (
            <div
              key={chat.session_id}
              className={`quest-chat-item ${selectedChat?.session_id === chat.session_id ? 'active' : ''}`}
              onClick={() => handleSelectChat(chat)}
            >
              <div className="quest-chat-item-title">{chat.title || 'New Chat'}</div>
              <div className="quest-chat-item-meta">
                {chat.message_count} messages • {new Date(chat.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          {chats.length === 0 && (
            <div className="quest-chat-empty">No chats yet. Start a new conversation!</div>
          )}
        </div>
      </div>
      <div className="quest-chat-main">
        <header className="quest-chat-header">
          <div className="quest-chat-header-left">
            {showChatList && (
              <button className="toggle-sidebar-button" onClick={() => setShowChatList(false)}>
                →
              </button>
            )}
            {!showChatList && (
              <button className="toggle-sidebar-button" onClick={() => setShowChatList(true)}>
                ←
              </button>
            )}
            {onBack && (
              <button className="back-button" onClick={onBack}>
                ← BACK TO QUESTS
              </button>
            )}
          </div>
          <div className="quest-chat-header-center">
            <h1>CREATE QUEST</h1>
            <p className="quest-chat-subtitle">
              {selectedChat ? selectedChat.title : 'Chat with AI to generate a new quest'}
            </p>
          </div>
          <div className="quest-chat-header-right">
            {selectedChat && (
              <button className="new-chat-button" onClick={handleNewChat}>
                NEW CHAT
              </button>
            )}
          </div>
        </header>

      <div className="quest-chat-messages">
        {messages.length === 0 && (
          <div className="quest-chat-welcome">
            <p>👋 Hi! I can help you create a quest.</p>
            <p>Send me a URL to a course or describe what you want to learn!</p>
            <p className="quest-chat-example">
              Example: "https://craftinginterpreters.com" or "I want to learn React"
            </p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const questJson = msg.role === 'assistant' ? parseQuestJson(msg.content) : null
          
          return (
            <div key={idx} className={`quest-chat-message ${msg.role}`}>
              {questJson ? (
                <QuestPreview 
                  quest={questJson}
                  onSave={async () => {
                    try {
                      setLoading(true)
                      const response = await fetch(`${API_BASE_URL}/quests`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          quest: questJson,
                          session_id: sessionId,
                        }),
                      })

                      const data = await response.json()

                      if (data.error) {
                        throw new Error(data.message || data.error)
                      }

                      // Add success message to chat
                      const successMessage = `✅ Quest "${data.quest.name}" saved successfully! (ID: ${data.quest_id}, ${data.quest.steps_count} steps, ${data.quest.total_xp_reward} XP total)`
                      setMessages([...messages, { role: 'assistant', content: successMessage }])
                      
                      // Optionally navigate to the quest detail page
                      // window.location.href = `/quests/${data.quest_id}`
                    } catch (error) {
                      const errorMessage = error.message || 'Failed to save quest'
                      // Show error in chat instead of alert for better UX
                      setMessages([...messages, { 
                        role: 'assistant', 
                        content: `❌ Error saving quest: ${errorMessage}\n\nPlease try regenerating the quest or check the console for more details.` 
                      }])
                      // Also log to console for debugging
                      console.error('Quest save error:', error)
                    } finally {
                      setLoading(false)
                    }
                  }}
                />
              ) : (
                <div className="quest-chat-message-content">{msg.content}</div>
              )}
            </div>
          )
        })}
        {researching && researchInteractionId && (
          <ResearchProgress
            sessionId={sessionId}
            interactionId={researchInteractionId}
            onComplete={async () => {
              // Research completed - hide progress component immediately
              console.log('[QuestChat] Research completed, hiding progress component and reloading chat history...')
              setResearching(false)
              setResearchInteractionId(null)
              if (sessionId) {
                // Reload chat history to get the report message
                try {
                  await loadChatHistory(sessionId)
                  // Scroll to bottom to show new message
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                } catch (error) {
                  console.error('[QuestChat] Failed to reload chat history after completion:', error)
                }
              }
            }}
          />
        )}
        {loading && !researching && (
          <div className="quest-chat-message assistant">
            <div className="quest-chat-message-content">
              <span className="typing-indicator">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quest-chat-input-container">
        <textarea
          className="quest-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message or paste a URL..."
          rows={2}
          disabled={loading}
        />
        <button
          className="quest-chat-send-button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          SEND
        </button>
      </div>
      </div>
    </div>
  )
}

export default QuestChat

