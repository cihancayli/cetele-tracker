-- ============================================
-- POPULATE DEBUG DATA FOR CETELE DASHBOARD (FINAL FIX)
-- ============================================
-- Creates:
-- - 1 ED user
-- - 1 Coordinator user (debug@test.com)
-- - 6 Groups
-- - 6 Mentors (1 per group)
-- - 60 Students (10 per group)
-- - 10 Activities
-- - 3 weeks of submissions with realistic data
-- ============================================

-- Clean up existing debug data (handles both table names)
DO $$
BEGIN
    -- Try cetele_submissions first
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cetele_submissions') THEN
        DELETE FROM cetele_submissions WHERE student_id IN (
            SELECT id FROM students WHERE name ~ '^[A-Z][a-z]+ [a-z0-9]{4}$'
        );
    END IF;

    -- Try weekly_submissions
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'weekly_submissions') THEN
        DELETE FROM weekly_submissions WHERE student_id IN (
            SELECT id FROM students WHERE name ~ '^[A-Z][a-z]+ [a-z0-9]{4}$'
        );
    END IF;
END $$;

DELETE FROM students WHERE name ~ '^[A-Z][a-z]+ [a-z0-9]{4}$';
DELETE FROM mentor_codes WHERE code LIKE 'MENTOR-%';
DELETE FROM users WHERE email LIKE '%@debug.cetele%';
DELETE FROM groups WHERE name LIKE '%Group';

-- ============================================
-- USERS (ED + Coordinator + 6 Mentors)
-- ============================================

-- ED User
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'ed_user',
    'ed@debug.cetele',
    'ZGVidWcxMjM=',
    'ed',
    'National',
    true,
    false,
    NOW(),
    NOW()
);

-- Coordinator User
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    'debug_coordinator',
    'debug@test.com',
    'ZGVidWcxMjM=',
    'coordinator',
    'High School',
    true,
    false,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    is_coordinator = true,
    is_mentor = false,
    last_login = NOW();

-- Mentor 1 - Mehmet
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES ('10000000-0000-0000-0000-000000000011', 'mehmet_mentor', 'mehmet@debug.cetele', 'ZGVidWcxMjM=', 'mentor', 'High School', false, true, NOW(), NOW());

-- Mentor 2 - Ahmet
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES ('10000000-0000-0000-0000-000000000012', 'ahmet_mentor', 'ahmet@debug.cetele', 'ZGVidWcxMjM=', 'mentor', 'High School', false, true, NOW(), NOW());

-- Mentor 3 - Mustafa
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES ('10000000-0000-0000-0000-000000000013', 'mustafa_mentor', 'mustafa@debug.cetele', 'ZGVidWcxMjM=', 'mentor', 'High School', false, true, NOW(), NOW());

-- Mentor 4 - Emre
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES ('10000000-0000-0000-0000-000000000014', 'emre_mentor', 'emre@debug.cetele', 'ZGVidWcxMjM=', 'mentor', 'High School', false, true, NOW(), NOW());

-- Mentor 5 - Can
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES ('10000000-0000-0000-0000-000000000015', 'can_mentor', 'can@debug.cetele', 'ZGVidWcxMjM=', 'mentor', 'High School', false, true, NOW(), NOW());

-- Mentor 6 - Burak
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES ('10000000-0000-0000-0000-000000000016', 'burak_mentor', 'burak@debug.cetele', 'ZGVidWcxMjM=', 'mentor', 'High School', false, true, NOW(), NOW());

-- ============================================
-- GROUPS (6 groups)
-- ============================================

INSERT INTO groups (id, name, grade, created_at) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Mehmet Group', '10th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000002', 'Ahmet Group', '11th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000003', 'Mustafa Group', '9th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000004', 'Emre Group', '12th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000005', 'Can Group', '10th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000006', 'Burak Group', '11th Grade', NOW());

-- ============================================
-- MENTOR CODES (1 per mentor)
-- ============================================

INSERT INTO mentor_codes (id, code, mentor_id, group_id, is_active, created_at) VALUES
    ('30000000-0000-0000-0000-000000000001', 'MENTOR-MEHMET', '10000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', true, NOW()),
    ('30000000-0000-0000-0000-000000000002', 'MENTOR-AHMET', '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', true, NOW()),
    ('30000000-0000-0000-0000-000000000003', 'MENTOR-MUSTAFA', '10000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000003', true, NOW()),
    ('30000000-0000-0000-0000-000000000004', 'MENTOR-EMRE', '10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000004', true, NOW()),
    ('30000000-0000-0000-0000-000000000005', 'MENTOR-CAN', '10000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000005', true, NOW()),
    ('30000000-0000-0000-0000-000000000006', 'MENTOR-BURAK', '10000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000006', true, NOW());

-- Update mentor group_id
UPDATE users SET group_id = '20000000-0000-0000-0000-000000000001' WHERE id = '10000000-0000-0000-0000-000000000011';
UPDATE users SET group_id = '20000000-0000-0000-0000-000000000002' WHERE id = '10000000-0000-0000-0000-000000000012';
UPDATE users SET group_id = '20000000-0000-0000-0000-000000000003' WHERE id = '10000000-0000-0000-0000-000000000013';
UPDATE users SET group_id = '20000000-0000-0000-0000-000000000004' WHERE id = '10000000-0000-0000-0000-000000000014';
UPDATE users SET group_id = '20000000-0000-0000-0000-000000000005' WHERE id = '10000000-0000-0000-0000-000000000015';
UPDATE users SET group_id = '20000000-0000-0000-0000-000000000006' WHERE id = '10000000-0000-0000-0000-000000000016';

-- ============================================
-- ACTIVITIES (10 activities)
-- ============================================

DO $$
DECLARE
    activity_count INT;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM activities WHERE is_active = true;

    IF activity_count < 10 THEN
        DELETE FROM activities;

        INSERT INTO activities (id, name, description, type, order_index, is_active, created_at) VALUES
            ('40000000-0000-0000-0000-000000000001', 'Kuran', 'Quran recitation', 'spiritual', 1, true, NOW()),
            ('40000000-0000-0000-0000-000000000002', 'Kitap', 'Book reading', 'education', 2, true, NOW()),
            ('40000000-0000-0000-0000-000000000003', 'Teheccud', 'Night prayer', 'spiritual', 3, true, NOW()),
            ('40000000-0000-0000-0000-000000000004', 'Salat', 'Daily prayers', 'spiritual', 4, true, NOW()),
            ('40000000-0000-0000-0000-000000000005', 'Zikr', 'Remembrance', 'spiritual', 5, true, NOW()),
            ('40000000-0000-0000-0000-000000000006', 'Dua', 'Supplication', 'spiritual', 6, true, NOW()),
            ('40000000-0000-0000-0000-000000000007', 'Sadaka', 'Charity', 'social', 7, true, NOW()),
            ('40000000-0000-0000-0000-000000000008', 'Halaqa', 'Study circle', 'education', 8, true, NOW()),
            ('40000000-0000-0000-0000-000000000009', 'Volunteer', 'Community service', 'social', 9, true, NOW()),
            ('40000000-0000-0000-0000-000000000010', 'Hadith', 'Hadith study', 'education', 10, true, NOW());
    END IF;
END $$;

-- ============================================
-- STUDENTS (60 students - 10 per group)
-- ============================================

DO $$
DECLARE
    group_record RECORD;
    student_names TEXT[] := ARRAY[
        'Ali', 'Sara', 'Mohamed', 'Fatima', 'Omar', 'Aisha', 'Yusuf', 'Zainab', 'Ibrahim', 'Khadija',
        'Hassan', 'Maryam', 'Ahmed', 'Amina', 'Abdullah', 'Hafsa', 'Khalid', 'Sumaya', 'Bilal', 'Safiya',
        'Hamza', 'Ruqayyah', 'Umar', 'Asma', 'Uthman', 'Hawa', 'Zayd', 'Layla', 'Salman', 'Nusaybah',
        'Talha', 'Umm Salama', 'Saad', 'Sawda', 'Abu Bakr', 'Maymunah', 'Anas', 'Juwayriya', 'Muadh', 'Ramlah',
        'Ubayd', 'Zaynab', 'Malik', 'Umm Habiba', 'Hanzala', 'Safwan', 'Umm Kulthum', 'Jabir', 'Asiya', 'Tariq',
        'Khawla', 'Suhayb', 'Lubaba', 'Usama', 'Barira', 'Ammar', 'Umm Ayman', 'Suhayl', 'Nasiba', 'Thabit'
    ];
    counter INT := 1;
BEGIN
    FOR group_record IN SELECT id, name, grade FROM groups WHERE name LIKE '%Group' LOOP
        FOR i IN 1..10 LOOP
            INSERT INTO students (id, name, grade, group_id, created_at)
            VALUES (
                uuid_generate_v4(),
                student_names[counter] || ' ' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4),
                group_record.grade,
                group_record.id,
                NOW()
            );
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- WEEKLY SUBMISSIONS (3 weeks of data)
-- ============================================

DO $$
DECLARE
    student_record RECORD;
    week_offset INT;
    week_start DATE;
    activity_ids UUID[];
    completions JSONB;
    completion_rate FLOAT;
    i INT;
    table_name TEXT;
BEGIN
    -- Determine which table name to use
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cetele_submissions') THEN
        table_name := 'cetele_submissions';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE tablename = 'weekly_submissions') THEN
        table_name := 'weekly_submissions';
    ELSE
        RAISE EXCEPTION 'Neither cetele_submissions nor weekly_submissions table exists!';
    END IF;

    -- Get all activity IDs
    SELECT ARRAY_AGG(id) INTO activity_ids FROM activities WHERE is_active = true;

    -- For each of the last 3 weeks
    FOR week_offset IN 0..2 LOOP
        week_start := DATE_TRUNC('week', CURRENT_DATE - (week_offset * 7));

        -- For each student
        FOR student_record IN SELECT id FROM students WHERE name ~ '^[A-Z][a-z]+ [a-z0-9]{4}$' LOOP
            completion_rate := 0.5 + (RANDOM() * 0.5);
            completions := '{}'::JSONB;

            FOR i IN 1..ARRAY_LENGTH(activity_ids, 1) LOOP
                completions := completions || JSONB_BUILD_OBJECT(
                    activity_ids[i]::TEXT,
                    CASE WHEN RANDOM() < completion_rate THEN true ELSE false END
                );
            END LOOP;

            -- Insert using the correct table name
            IF table_name = 'cetele_submissions' THEN
                INSERT INTO cetele_submissions (id, student_id, week_start_date, activity_completions, created_at, updated_at)
                VALUES (uuid_generate_v4(), student_record.id, week_start, completions, NOW(), NOW())
                ON CONFLICT (student_id, week_start_date) DO UPDATE
                SET activity_completions = EXCLUDED.activity_completions, updated_at = NOW();
            ELSE
                INSERT INTO weekly_submissions (id, student_id, week_start_date, activity_completions, created_at)
                VALUES (uuid_generate_v4(), student_record.id, week_start, completions, NOW())
                ON CONFLICT (student_id, week_start_date) DO UPDATE
                SET activity_completions = EXCLUDED.activity_completions;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Created submissions in table: %', table_name;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    user_count INT;
    group_count INT;
    student_count INT;
    activity_count INT;
    mentor_code_count INT;
    submission_count INT;
    table_name TEXT;
BEGIN
    -- Count basic entities
    SELECT COUNT(*) INTO user_count FROM users WHERE email LIKE '%@debug.cetele%' OR email = 'debug@test.com';
    SELECT COUNT(*) INTO group_count FROM groups WHERE name LIKE '%Group';
    SELECT COUNT(*) INTO student_count FROM students WHERE name ~ '^[A-Z][a-z]+ [a-z0-9]{4}$';
    SELECT COUNT(*) INTO activity_count FROM activities WHERE is_active = true;
    SELECT COUNT(*) INTO mentor_code_count FROM mentor_codes WHERE code LIKE 'MENTOR-%';

    -- Determine which table has submissions
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cetele_submissions') THEN
        table_name := 'cetele_submissions';
        SELECT COUNT(*) INTO submission_count FROM cetele_submissions;
    ELSIF EXISTS (SELECT FROM pg_tables WHERE tablename = 'weekly_submissions') THEN
        table_name := 'weekly_submissions';
        SELECT COUNT(*) INTO submission_count FROM weekly_submissions;
    ELSE
        table_name := 'NONE';
        submission_count := 0;
    END IF;

    -- Display results
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'USERS: %', user_count;
    RAISE NOTICE 'GROUPS: %', group_count;
    RAISE NOTICE 'STUDENTS: %', student_count;
    RAISE NOTICE 'ACTIVITIES: %', activity_count;
    RAISE NOTICE 'MENTOR CODES: %', mentor_code_count;
    RAISE NOTICE 'SUBMISSIONS (table: %): %', table_name, submission_count;
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DEBUG DATA POPULATED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Login: debug@test.com / debug123';
    RAISE NOTICE '60 students | 6 groups | 180 submissions';
    RAISE NOTICE 'Test at: http://localhost:8000/login.html';
    RAISE NOTICE '============================================';
END $$;
