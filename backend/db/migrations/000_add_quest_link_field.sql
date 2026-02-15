-- Migration: Add link field to quests table
-- Date: (applied in production, documenting retroactively)
-- Description: Adds link field to store URL to course/website for each quest

-- Check if column exists before adding (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quests' 
        AND column_name = 'link'
    ) THEN
        ALTER TABLE quests ADD COLUMN link VARCHAR(500);
    END IF;
END $$;

