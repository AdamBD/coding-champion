-- Coding Champion Database Schema (Minimal Starting Point)

-- Users table - tracks player progress
-- Note: total_xp is calculated from activities (SUM of xp_earned)
-- Note: level is calculated from total_xp (e.g., level = floor(total_xp / 1000) + 1)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL DEFAULT 'player',
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table - logs study sessions
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quests table - defines available quests
CREATE TABLE IF NOT EXISTS quests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  total_xp_reward INTEGER NOT NULL DEFAULT 0,
  link VARCHAR(500),
  thumbnail_url TEXT,
  thumbnail_data BYTEA,
  status VARCHAR(50) DEFAULT 'completed',
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quest steps table - individual steps within a quest
CREATE TABLE IF NOT EXISTS quest_steps (
  id SERIAL PRIMARY KEY,
  quest_id INTEGER REFERENCES quests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quest_id, step_order)
);

-- User quests table - tracks which quests users have started
CREATE TABLE IF NOT EXISTS user_quests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  quest_id INTEGER REFERENCES quests(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  current_step_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, quest_id)
);

-- User quest steps table - tracks completed steps
CREATE TABLE IF NOT EXISTS user_quest_steps (
  id SERIAL PRIMARY KEY,
  user_quest_id INTEGER REFERENCES user_quests(id) ON DELETE CASCADE,
  quest_step_id INTEGER REFERENCES quest_steps(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_quest_id, quest_step_id)
);

-- Insert default user
INSERT INTO users (username) 
VALUES ('player')
ON CONFLICT (username) DO NOTHING;
