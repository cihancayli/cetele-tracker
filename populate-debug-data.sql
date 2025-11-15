-- ============================================
-- POPULATE DEBUG DATA FOR CETELE DASHBOARD
-- ============================================
-- Creates:
-- - 1 ED user
-- - 1 Coordinator user (debug@test.com)
-- - 6 Groups
-- - 6 Mentors (1 per group)
-- - 60 Students (10 per group)
-- - 10 Activities
-- - 3 weeks of cetele submissions with realistic data
-- ============================================

-- Clean up existing debug data
DELETE FROM cetele_submissions WHERE student_id IN (
    SELECT id FROM students WHERE name LIKE 'Student%'
);
DELETE FROM students WHERE name LIKE 'Student%';
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
    'ZGVidWcxMjM=',  -- base64 of "debug123"
    'ed',
    'National',
    true,
    false,
    NOW(),
    NOW()
);

-- Coordinator User (existing debug user)
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

-- Mentor 1 - Aziz
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000011',
    'aziz_mentor',
    'aziz@debug.cetele',
    'ZGVidWcxMjM=',
    'mentor',
    'High School',
    false,
    true,
    NOW(),
    NOW()
);

-- Mentor 2 - Cihan
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000012',
    'cihan_mentor',
    'cihan@debug.cetele',
    'ZGVidWcxMjM=',
    'mentor',
    'High School',
    false,
    true,
    NOW(),
    NOW()
);

-- Mentor 3 - Fatima
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000013',
    'fatima_mentor',
    'fatima@debug.cetele',
    'ZGVidWcxMjM=',
    'mentor',
    'High School',
    false,
    true,
    NOW(),
    NOW()
);

-- Mentor 4 - Omar
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000014',
    'omar_mentor',
    'omar@debug.cetele',
    'ZGVidWcxMjM=',
    'mentor',
    'High School',
    false,
    true,
    NOW(),
    NOW()
);

-- Mentor 5 - Aisha
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000015',
    'aisha_mentor',
    'aisha@debug.cetele',
    'ZGVidWcxMjM=',
    'mentor',
    'High School',
    false,
    true,
    NOW(),
    NOW()
);

-- Mentor 6 - Yusuf
INSERT INTO users (id, username, email, password_hash, role, region, is_coordinator, is_mentor, created_at, last_login)
VALUES (
    '10000000-0000-0000-0000-000000000016',
    'yusuf_mentor',
    'yusuf@debug.cetele',
    'ZGVidWcxMjM=',
    'mentor',
    'High School',
    false,
    true,
    NOW(),
    NOW()
);

-- ============================================
-- GROUPS (6 groups)
-- ============================================

INSERT INTO groups (id, name, grade, created_at) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Aziz Group', '10th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000002', 'Cihan Group', '11th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000003', 'Fatima Group', '9th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000004', 'Omar Group', '12th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000005', 'Aisha Group', '10th Grade', NOW()),
    ('20000000-0000-0000-0000-000000000006', 'Yusuf Group', '11th Grade', NOW());

-- ============================================
-- MENTOR CODES (1 per mentor)
-- ============================================

INSERT INTO mentor_codes (id, code, mentor_id, group_id, is_active, created_at) VALUES
    ('30000000-0000-0000-0000-000000000001', 'MENTOR-AZIZ', '10000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', true, NOW()),
    ('30000000-0000-0000-0000-000000000002', 'MENTOR-CIHAN', '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', true, NOW()),
    ('30000000-0000-0000-0000-000000000003', 'MENTOR-FATIMA', '10000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000003', true, NOW()),
    ('30000000-0000-0000-0000-000000000004', 'MENTOR-OMAR', '10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000004', true, NOW()),
    ('30000000-0000-0000-0000-000000000005', 'MENTOR-AISHA', '10000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000005', true, NOW()),
    ('30000000-0000-0000-0000-000000000006', 'MENTOR-YUSUF', '10000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000006', true, NOW());

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

-- Get existing activities or create new ones
DO $$
DECLARE
    activity_count INT;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM activities WHERE is_active = true;

    IF activity_count < 10 THEN
        DELETE FROM activities;

        INSERT INTO activities (id, name, description, type, order_index, is_active, created_at) VALUES
            ('40000000-0000-0000-0000-000000000001', 'Kuran', 'Quran recitation and memorization', 'spiritual', 1, true, NOW()),
            ('40000000-0000-0000-0000-000000000002', 'Kitap', 'Islamic book reading', 'education', 2, true, NOW()),
            ('40000000-0000-0000-0000-000000000003', 'Teheccud', 'Tahajjud night prayer', 'spiritual', 3, true, NOW()),
            ('40000000-0000-0000-0000-000000000004', 'Salat', 'Five daily prayers', 'spiritual', 4, true, NOW()),
            ('40000000-0000-0000-0000-000000000005', 'Zikr', 'Dhikr and remembrance', 'spiritual', 5, true, NOW()),
            ('40000000-0000-0000-0000-000000000006', 'Dua', 'Personal supplication', 'spiritual', 6, true, NOW()),
            ('40000000-0000-0000-0000-000000000007', 'Sadaka', 'Charity and giving', 'social', 7, true, NOW()),
            ('40000000-0000-0000-0000-000000000008', 'Halaqa', 'Study circle attendance', 'education', 8, true, NOW()),
            ('40000000-0000-0000-0000-000000000009', 'Volunteer', 'Community service', 'social', 9, true, NOW()),
            ('40000000-0000-0000-0000-000000000010', 'Hadith', 'Hadith study and memorization', 'education', 10, true, NOW());
    END IF;
END $$;

-- ============================================
-- STUDENTS (60 students - 10 per group)
-- ============================================

-- Helper function to generate students
DO $$
DECLARE
    group_record RECORD;
    student_names TEXT[] := ARRAY[
        'Ali', 'Sara', 'Mohamed', 'Fatima', 'Omar',
        'Aisha', 'Yusuf', 'Zainab', 'Ibrahim', 'Khadija',
        'Hassan', 'Maryam', 'Ahmed', 'Amina', 'Abdullah',
        'Hafsa', 'Khalid', 'Sumaya', 'Bilal', 'Safiya',
        'Hamza', 'Ruqayyah', 'Umar', 'Asma', 'Uthman',
        'Hawa', 'Zayd', 'Layla', 'Salman', 'Nusaybah',
        'Talha', 'Umm Salama', 'Saad', 'Sawda', 'Abu Bakr',
        'Maymunah', 'Anas', 'Juwayriya', 'Muadh', 'Ramlah',
        'Ubayd', 'Zaynab', 'Malik', 'Umm Habiba', 'Hanzala',
        'Safwan', 'Umm Kulthum', 'Jabir', 'Asiya', 'Tariq',
        'Khawla', 'Suhayb', 'Lubaba', 'Usama', 'Barira',
        'Ammar', 'Umm Ayman', 'Suhayl', 'Nasiba', 'Thabit'
    ];
    grade_levels TEXT[] := ARRAY['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
    counter INT := 1;
    student_id UUID;
BEGIN
    FOR group_record IN SELECT id, name, grade FROM groups LOOP
        FOR i IN 1..10 LOOP
            student_id := uuid_generate_v4();

            INSERT INTO students (id, name, grade, group_id, created_at)
            VALUES (
                student_id,
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
-- CETELE SUBMISSIONS (3 weeks of data)
-- ============================================

-- Generate submissions for 3 weeks
DO $$
DECLARE
    student_record RECORD;
    activity_record RECORD;
    week_offset INT;
    week_start DATE;
    activity_ids UUID[];
    completions JSONB;
    completion_rate FLOAT;
    i INT;
BEGIN
    -- Get all activity IDs
    SELECT ARRAY_AGG(id) INTO activity_ids FROM activities WHERE is_active = true;

    -- For each of the last 3 weeks
    FOR week_offset IN 0..2 LOOP
        week_start := DATE_TRUNC('week', CURRENT_DATE - (week_offset * 7));

        -- For each student
        FOR student_record IN SELECT id, name FROM students LOOP
            -- Random completion rate between 50% and 100%
            completion_rate := 0.5 + (RANDOM() * 0.5);

            -- Build completions JSON
            completions := '{}'::JSONB;

            FOR i IN 1..ARRAY_LENGTH(activity_ids, 1) LOOP
                -- Randomly mark as completed based on completion rate
                IF RANDOM() < completion_rate THEN
                    completions := completions || JSONB_BUILD_OBJECT(
                        activity_ids[i]::TEXT,
                        true
                    );
                ELSE
                    completions := completions || JSONB_BUILD_OBJECT(
                        activity_ids[i]::TEXT,
                        false
                    );
                END IF;
            END LOOP;

            -- Insert submission
            INSERT INTO cetele_submissions (
                id,
                student_id,
                week_start_date,
                activity_completions,
                created_at,
                updated_at
            )
            VALUES (
                uuid_generate_v4(),
                student_record.id,
                week_start,
                completions,
                NOW(),
                NOW()
            )
            ON CONFLICT (student_id, week_start_date) DO UPDATE
            SET activity_completions = EXCLUDED.activity_completions,
                updated_at = NOW();

        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count everything
SELECT 'USERS' AS type, COUNT(*) AS count FROM users WHERE email LIKE '%@debug.cetele%' OR email = 'debug@test.com'
UNION ALL
SELECT 'GROUPS', COUNT(*) FROM groups WHERE name LIKE '%Group'
UNION ALL
SELECT 'STUDENTS', COUNT(*) FROM students WHERE name LIKE 'Student%' OR name ~ '^[A-Z][a-z]+ [a-z0-9]{4}$'
UNION ALL
SELECT 'ACTIVITIES', COUNT(*) FROM activities WHERE is_active = true
UNION ALL
SELECT 'MENTOR CODES', COUNT(*) FROM mentor_codes WHERE code LIKE 'MENTOR-%'
UNION ALL
SELECT 'SUBMISSIONS', COUNT(*) FROM cetele_submissions
ORDER BY type;

-- Show summary by group
SELECT
    g.name AS group_name,
    COUNT(DISTINCT s.id) AS student_count,
    COUNT(DISTINCT cs.id) AS submission_count,
    ROUND(AVG(
        (SELECT COUNT(*)::FLOAT
         FROM JSONB_EACH(cs.activity_completions)
         WHERE value::TEXT = 'true')
    ), 1) AS avg_activities_per_submission
FROM groups g
LEFT JOIN students s ON s.group_id = g.id
LEFT JOIN cetele_submissions cs ON cs.student_id = s.id
WHERE g.name LIKE '%Group'
GROUP BY g.id, g.name
ORDER BY g.name;

-- Show mentor info
SELECT
    u.username AS mentor_name,
    g.name AS group_name,
    mc.code AS mentor_code,
    COUNT(DISTINCT s.id) AS students_in_group
FROM users u
JOIN mentor_codes mc ON mc.mentor_id = u.id
JOIN groups g ON g.id = mc.group_id
LEFT JOIN students s ON s.group_id = g.id
WHERE u.role = 'mentor'
GROUP BY u.id, u.username, g.name, mc.code
ORDER BY u.username;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DEBUG DATA POPULATED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  ED:          ed@debug.cetele / debug123';
    RAISE NOTICE '  Coordinator: debug@test.com / debug123';
    RAISE NOTICE '  Mentor:      aziz@debug.cetele / debug123 (and 5 others)';
    RAISE NOTICE '';
    RAISE NOTICE 'Data Created:';
    RAISE NOTICE '  - 8 Users (1 ED, 1 Coordinator, 6 Mentors)';
    RAISE NOTICE '  - 6 Groups';
    RAISE NOTICE '  - 60 Students (10 per group)';
    RAISE NOTICE '  - 10 Activities';
    RAISE NOTICE '  - 6 Mentor Codes';
    RAISE NOTICE '  - 180 Submissions (3 weeks × 60 students)';
    RAISE NOTICE '';
    RAISE NOTICE 'Test at: http://localhost:8000/login.html';
    RAISE NOTICE '============================================';
END $$;
