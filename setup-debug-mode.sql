-- ========================================
-- DEBUG MODE SETUP FOR CETELE TRACKER
-- ========================================
-- Run this SQL in your Supabase SQL Editor to create test data
-- This allows one-click login for testing purposes

-- Clean up existing debug data (if any)
DELETE FROM weekly_submissions WHERE student_id IN (
    SELECT id FROM students WHERE name LIKE 'Debug %'
);
DELETE FROM users WHERE email LIKE 'debug%@test.com' OR username LIKE 'debug_%';
DELETE FROM students WHERE name LIKE 'Debug %';
DELETE FROM mentor_codes WHERE code LIKE 'DEBUG-%';
DELETE FROM groups WHERE name LIKE 'Debug %';

-- Create Debug Test Group
INSERT INTO groups (id, name, grade, state, region, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Debug Test Group',
    '10th Grade',
    'Test State',
    'High School',
    NOW()
);

-- Create Debug Students
INSERT INTO students (id, name, grade, group_id, state, created_at)
VALUES
    (
        '00000000-0000-0000-0000-000000000002',
        'Debug Student 1',
        '10th Grade',
        '00000000-0000-0000-0000-000000000001',
        'Test State',
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'Debug Student 2',
        '10th Grade',
        '00000000-0000-0000-0000-000000000001',
        'Test State',
        NOW()
    );

-- Create Debug Admin/Coordinator User
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, last_login)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'debug_coordinator',
    'debug@test.com',
    'ZGVidWcxMjM=',  -- base64 of "debug123"
    'coordinator',
    'High School',
    true,
    NOW()
);

-- Create Debug ED User
INSERT INTO users (id, username, email, password_hash, role, last_login)
VALUES (
    '00000000-0000-0000-0000-000000000011',
    'debug_ed',
    'debug-ed@test.com',
    'ZGVidWcxMjM=',  -- base64 of "debug123"
    'ed',
    NOW()
);

-- Create Debug Mentor User
INSERT INTO users (id, username, email, password_hash, role, region, is_mentor, last_login)
VALUES (
    '00000000-0000-0000-0000-000000000012',
    'debug_mentor',
    'debug-mentor@test.com',
    'ZGVidWcxMjM=',  -- base64 of "debug123"
    'mentor',
    'High School',
    true,
    NOW()
);

-- Update the group with mentor_id
UPDATE groups
SET mentor_id = '00000000-0000-0000-0000-000000000012'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Create Debug Mentor Code
INSERT INTO mentor_codes (code, mentor_id, group_id, is_active, created_at)
VALUES (
    'DEBUG-TEST',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    true,
    NOW()
);

-- Create Debug Student Users
INSERT INTO users (id, username, email, password_hash, role, student_id, mentor_id, region)
VALUES
    (
        '00000000-0000-0000-0000-000000000020',
        'debug_student1',
        'debug-student1@test.com',
        'ZGVidWcxMjM=',  -- base64 of "debug123"
        'student',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000012',
        'High School'
    ),
    (
        '00000000-0000-0000-0000-000000000021',
        'debug_student2',
        'debug-student2@test.com',
        'ZGVidWcxMjM=',  -- base64 of "debug123"
        'student',
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000012',
        'High School'
    );

-- Update students with user_id
UPDATE students SET user_id = '00000000-0000-0000-0000-000000000020' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE students SET user_id = '00000000-0000-0000-0000-000000000021' WHERE id = '00000000-0000-0000-0000-000000000003';

-- Create some sample activities if they don't exist
INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'Kitab', '35 pages', 'reading', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Kitab');

INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'Risale Sohbet 1', 'First session', 'discussion', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Risale Sohbet 1');

INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'Risale Sohbet 2', 'Second session', 'discussion', 3, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Risale Sohbet 2');

INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'Kuran', '7 pages', 'reading', 4, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Kuran');

INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'Kaset/Video', '60 minutes', 'media', 5, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Kaset/Video');

INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'Teheccud', '3 times', 'prayer', 6, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Teheccud');

INSERT INTO activities (name, description, type, order_index, created_at)
SELECT 'SWB/Dhikr', '101/day', 'prayer', 7, NOW()
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'SWB/Dhikr');

-- Add sample weekly submission for testing
INSERT INTO weekly_submissions (student_id, week_start_date, activity_completions, created_at)
SELECT
    '00000000-0000-0000-0000-000000000002',
    DATE_TRUNC('week', CURRENT_DATE),
    '{"Kitab": true, "Kuran": true, "Teheccud": false, "SWB/Dhikr": true, "Risale Sohbet 1": true, "Risale Sohbet 2": false, "Kaset/Video": true}'::jsonb,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM weekly_submissions
    WHERE student_id = '00000000-0000-0000-0000-000000000002'
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)
);

-- Display debug credentials
SELECT
    '=== DEBUG MODE CREDENTIALS ===' as info,
    '' as details
UNION ALL
SELECT
    'ADMIN/COORDINATOR LOGIN' as info,
    '----------------------' as details
UNION ALL
SELECT
    'Email: debug@test.com' as info,
    'Password: debug123' as details
UNION ALL
SELECT
    'Username: debug_coordinator' as info,
    'Role: coordinator' as details
UNION ALL
SELECT '' as info, '' as details
UNION ALL
SELECT
    'ED LOGIN' as info,
    '--------' as details
UNION ALL
SELECT
    'Email: debug-ed@test.com' as info,
    'Password: debug123' as details
UNION ALL
SELECT
    'Username: debug_ed' as info,
    'Role: ed' as details
UNION ALL
SELECT '' as info, '' as details
UNION ALL
SELECT
    'MENTOR LOGIN' as info,
    '------------' as details
UNION ALL
SELECT
    'Email: debug-mentor@test.com' as info,
    'Password: debug123' as details
UNION ALL
SELECT
    'Username: debug_mentor' as info,
    'Role: mentor' as details
UNION ALL
SELECT '' as info, '' as details
UNION ALL
SELECT
    'STUDENT LOGIN' as info,
    '-------------' as details
UNION ALL
SELECT
    'Username: debug_student1' as info,
    'Password: debug123' as details
UNION ALL
SELECT
    'OR' as info,
    '' as details
UNION ALL
SELECT
    'Username: debug_student2' as info,
    'Password: debug123' as details
UNION ALL
SELECT '' as info, '' as details
UNION ALL
SELECT
    'MENTOR CODE FOR SIGNUP' as info,
    '---------------------' as details
UNION ALL
SELECT
    'Code: DEBUG-TEST' as info,
    '' as details;
