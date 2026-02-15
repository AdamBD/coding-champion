-- Migration: Add quest generation fields to quests table
-- Date: 2025-01-XX
-- Description: Adds fields needed for AI-generated quests: thumbnail storage, status tracking, and generation timestamp

-- Add thumbnail_url field (optional, for filesystem-stored images)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quests' 
        AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE quests ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- Add thumbnail_data field (for storing image binary data)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quests' 
        AND column_name = 'thumbnail_data'
    ) THEN
        ALTER TABLE quests ADD COLUMN thumbnail_data BYTEA;
    END IF;
END $$;

-- Add status field (track quest generation status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quests' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE quests ADD COLUMN status VARCHAR(50) DEFAULT 'completed';
        -- Set existing quests to 'completed' status
        UPDATE quests SET status = 'completed' WHERE status IS NULL;
    END IF;
END $$;

-- Add generated_at field (timestamp when quest was AI-generated)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quests' 
        AND column_name = 'generated_at'
    ) THEN
        ALTER TABLE quests ADD COLUMN generated_at TIMESTAMP;
    END IF;
END $$;

