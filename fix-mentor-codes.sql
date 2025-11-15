-- ============================================
-- FIX MENTOR_CODES TABLE
-- ============================================
-- Run this in Supabase SQL Editor to fix the null constraint issue

-- Option 1: Make region_id nullable (Quick Fix)
-- This allows mentor codes to be created without region_id initially
-- The region_id will be set later when the group is created

ALTER TABLE mentor_codes ALTER COLUMN region_id DROP NOT NULL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the updated schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mentor_codes'
ORDER BY ordinal_position;

-- ============================================
-- NOTES
-- ============================================
/*
This fix allows the mentor code to be created by the trigger
without requiring region_id upfront. The workflow is now:

1. User signs up as mentor → trigger creates mentor_code with NULL region_id
2. create-group.html creates the group → updates mentor_code with group_id
3. Region info comes from the group, not directly from mentor_codes

This is the correct approach since:
- Mentor codes are auto-generated on user creation
- Groups (with region info) are created after user creation
- The region_id in mentor_codes can be derived from the group relationship
*/
