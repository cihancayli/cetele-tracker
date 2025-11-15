-- ============================================
-- RESET DATABASE - Clear All User Data
-- ============================================
-- WARNING: This will delete ALL users, students, groups, and submissions!
-- Only run this if you want to start completely fresh.

-- Disable foreign key checks temporarily
BEGIN;

-- Delete all data in reverse order of dependencies
DELETE FROM weekly_submissions;
DELETE FROM mentor_codes;
DELETE FROM students;
DELETE FROM groups;
DELETE FROM users;

-- Reset sequences (auto-increment IDs) if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE students_id_seq RESTART WITH 1;
-- ALTER SEQUENCE groups_id_seq RESTART WITH 1;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that tables are empty
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'mentor_codes', COUNT(*) FROM mentor_codes
UNION ALL
SELECT 'weekly_submissions', COUNT(*) FROM weekly_submissions;

-- Should show 0 for all tables

-- ============================================
-- NOTES
-- ============================================
/*
This script clears all user-generated data but keeps:
- Activities (default spiritual activities)
- Region codes (NC-HS-2025, etc.)
- ED codes (ED-NC-2025, etc.)

After running this, you can create fresh accounts without conflicts.
*/
