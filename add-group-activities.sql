-- Migration: Add group-specific activities support
-- This allows each mentor to create custom activities for their group

-- Add group_id column to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Add response_type column to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS response_type TEXT DEFAULT 'boolean' CHECK (response_type IN ('boolean', 'number'));

-- Add index for faster group-based queries
CREATE INDEX IF NOT EXISTS idx_activities_group ON activities(group_id);

-- Activities with NULL group_id are global (visible to all)
-- Activities with a specific group_id are only for that group

COMMENT ON COLUMN activities.group_id IS 'NULL = global activity visible to all groups. Non-null = group-specific activity only visible to that group';
COMMENT ON COLUMN activities.response_type IS 'boolean = Yes/No checkbox, number = Numeric input (e.g., minutes, count)';

-- Example: Create a group-specific activity
-- INSERT INTO activities (name, description, type, order_index, group_id, response_type)
-- VALUES ('Custom Activity', 'Group-specific task', 'custom', 1, '[group_uuid]', 'boolean');
