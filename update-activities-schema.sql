-- ============================================
-- UPDATE ACTIVITIES TABLE SCHEMA
-- ============================================
-- Add columns to support custom group activities

-- Add new columns to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'checkbox';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS target INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS unit TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activities_group_id ON activities(group_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activities'
ORDER BY ordinal_position;
