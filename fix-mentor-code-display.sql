-- Diagnostic and fix for mentor code not displaying
-- Run this in Supabase SQL Editor

-- 1. Check if mentor user exists and get their ID
SELECT id, username, email, role
FROM users
WHERE email = 'mentor@test.com';

-- 2. Check if mentor_code exists for this user
SELECT mc.*, g.name as group_name, g.grade
FROM mentor_codes mc
LEFT JOIN groups g ON mc.group_id = g.id
WHERE mc.mentor_id = (SELECT id FROM users WHERE email = 'mentor@test.com');

-- 3. Check available groups (in case we need to assign one)
SELECT id, name, grade
FROM groups
ORDER BY name
LIMIT 5;

-- 4. Create mentor code if missing
-- First, ensure the mentor user has a group_id
DO $$
DECLARE
    v_mentor_id UUID;
    v_group_id UUID;
    v_mentor_code TEXT;
BEGIN
    -- Get mentor user ID
    SELECT id INTO v_mentor_id FROM users WHERE email = 'mentor@test.com';

    IF v_mentor_id IS NULL THEN
        RAISE NOTICE 'Mentor user not found!';
        RETURN;
    END IF;

    -- Get or assign a test group
    SELECT id INTO v_group_id FROM groups ORDER BY created_at LIMIT 1;

    IF v_group_id IS NULL THEN
        -- Create a test group if none exist
        INSERT INTO groups (name, grade, created_at)
        VALUES ('Test Mentor Group', 9, NOW())
        RETURNING id INTO v_group_id;

        RAISE NOTICE 'Created test group with ID: %', v_group_id;
    END IF;

    -- Check if mentor_code already exists
    IF EXISTS (SELECT 1 FROM mentor_codes WHERE mentor_id = v_mentor_id) THEN
        RAISE NOTICE 'Mentor code already exists for this user';
    ELSE
        -- Generate a unique mentor code
        v_mentor_code := 'MENTOR-TEST-' || substring(md5(random()::text) from 1 for 6);

        -- Create mentor code
        INSERT INTO mentor_codes (code, mentor_id, group_id, is_active, created_at)
        VALUES (v_mentor_code, v_mentor_id, v_group_id, true, NOW());

        RAISE NOTICE 'Created mentor code: % for mentor ID: % in group: %', v_mentor_code, v_mentor_id, v_group_id;
    END IF;
END $$;

-- 5. Verify the setup
SELECT
    u.username,
    u.email,
    u.role,
    mc.code as mentor_code,
    mc.group_id as code_group_id,
    g.name as group_name,
    g.grade
FROM users u
LEFT JOIN mentor_codes mc ON mc.mentor_id = u.id
LEFT JOIN groups g ON mc.group_id = g.id
WHERE u.email = 'mentor@test.com';
