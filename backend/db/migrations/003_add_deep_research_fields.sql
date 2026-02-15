-- Migration: Add Deep Research fields to quest_chat_sessions
-- Description: Adds columns to track Deep Research interaction ID, status, and start time

DO $$
BEGIN
    -- Add deep_research_interaction_id column if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quest_chat_sessions'
        AND column_name = 'deep_research_interaction_id'
    ) THEN
        ALTER TABLE quest_chat_sessions ADD COLUMN deep_research_interaction_id VARCHAR(255);
    END IF;

    -- Add deep_research_status column if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quest_chat_sessions'
        AND column_name = 'deep_research_status'
    ) THEN
        ALTER TABLE quest_chat_sessions ADD COLUMN deep_research_status VARCHAR(50);
    END IF;

    -- Add deep_research_started_at column if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quest_chat_sessions'
        AND column_name = 'deep_research_started_at'
    ) THEN
        ALTER TABLE quest_chat_sessions ADD COLUMN deep_research_started_at TIMESTAMP;
    END IF;

    -- Add deep_research_progress column if it does not exist (to track poll count)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quest_chat_sessions'
        AND column_name = 'deep_research_progress'
    ) THEN
        ALTER TABLE quest_chat_sessions ADD COLUMN deep_research_progress INTEGER DEFAULT 1;
    END IF;
END $$;

