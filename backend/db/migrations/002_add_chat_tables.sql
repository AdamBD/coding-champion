-- Migration: Add chat sessions and messages tables
-- Description: Stores chat sessions and message history for quest creation chats

-- Chat sessions table
CREATE TABLE IF NOT EXISTS quest_chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200), -- Auto-generated from first message or user-provided
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS quest_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL REFERENCES quest_chat_sessions(session_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_chat_sessions_user_id ON quest_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_chat_sessions_created_at ON quest_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quest_chat_messages_session_id ON quest_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_quest_chat_messages_created_at ON quest_chat_messages(created_at);

