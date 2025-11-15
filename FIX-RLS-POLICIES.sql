-- ============================================
-- FIX SUPABASE RLS POLICIES FOR DELETE OPERATIONS
-- ============================================
--
-- PROBLEM: Delete operations are blocked because RLS policies
-- only allow operations for authenticated users, but the app
-- uses localStorage sessions with the anonymous 'anon' key.
--
-- SOLUTION: Update RLS policies to allow 'anon' role to perform
-- DELETE, UPDATE, and INSERT operations.
--
-- ⚠️ SECURITY WARNING: This makes your database writable by anyone
-- with the anon key. For production, implement proper Supabase Auth.
-- ============================================

-- First, drop all existing policies that might conflict
DROP POLICY IF EXISTS "Allow all for authenticated users" ON groups;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON students;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON activities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON weekly_submissions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cetele_submissions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON mentor_codes;

DROP POLICY IF EXISTS "Allow read for anonymous" ON groups;
DROP POLICY IF EXISTS "Allow read for anonymous" ON students;
DROP POLICY IF EXISTS "Allow read for anonymous" ON activities;
DROP POLICY IF EXISTS "Allow read for anonymous" ON weekly_submissions;
DROP POLICY IF EXISTS "Allow read for anonymous" ON cetele_submissions;

-- ============================================
-- GROUPS TABLE POLICIES
-- ============================================

CREATE POLICY "Allow all operations for anon and authenticated"
ON groups FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- STUDENTS TABLE POLICIES
-- ============================================

CREATE POLICY "Allow all operations for anon and authenticated"
ON students FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- ACTIVITIES TABLE POLICIES
-- ============================================

CREATE POLICY "Allow all operations for anon and authenticated"
ON activities FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- CETELE_SUBMISSIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Allow all operations for anon and authenticated"
ON cetele_submissions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Also handle legacy table name if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'weekly_submissions') THEN
        DROP POLICY IF EXISTS "Allow all operations for anon and authenticated" ON weekly_submissions;
        CREATE POLICY "Allow all operations for anon and authenticated"
        ON weekly_submissions FOR ALL
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

CREATE POLICY "Allow all operations for anon and authenticated"
ON users FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- MENTOR_CODES TABLE POLICIES
-- ============================================

CREATE POLICY "Allow all operations for anon and authenticated"
ON mentor_codes FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFY POLICIES WERE CREATED
-- ============================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('groups', 'students', 'activities', 'cetele_submissions', 'weekly_submissions', 'users', 'mentor_codes')
ORDER BY tablename, policyname;

-- ============================================
-- TEST THAT POLICIES WORK
-- ============================================

-- Test 1: Check if RLS is enabled (should be true)
SELECT
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'students', 'activities', 'cetele_submissions', 'users', 'mentor_codes');

-- Test 2: Verify 'anon' role is in policies
SELECT
    tablename,
    policyname,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
ORDER BY tablename;

-- ============================================
-- EXPECTED OUTPUT
-- ============================================
-- After running this script, you should see:
-- 1. All tables have RLS enabled (rls_enabled = true)
-- 2. Each table has a policy "Allow all operations for anon and authenticated"
-- 3. The 'roles' column should show {anon, authenticated}
-- 4. The 'cmd' column should show 'ALL' (covers SELECT, INSERT, UPDATE, DELETE)
--
-- Now your delete operations should work!
-- ============================================

-- ============================================
-- ALTERNATIVE: Disable RLS Completely (NOT RECOMMENDED)
-- ============================================
-- If you want to completely disable RLS (⚠️ VERY INSECURE):
--
-- ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cetele_submissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE mentor_codes DISABLE ROW LEVEL SECURITY;
--
-- ⚠️ DO NOT DO THIS IN PRODUCTION!
-- ============================================

-- ============================================
-- PRODUCTION SOLUTION: Proper Supabase Auth
-- ============================================
-- For a secure production setup, you should:
--
-- 1. Use Supabase Auth properly:
--    - Call supabase.auth.signInWithPassword() with real credentials
--    - Store the session in Supabase (not localStorage)
--    - Use auth.uid() in RLS policies
--
-- 2. Example secure policies:
--
--    -- Only coordinators can delete students
--    CREATE POLICY "Coordinators can delete students"
--    ON students FOR DELETE
--    TO authenticated
--    USING (
--      EXISTS (
--        SELECT 1 FROM users
--        WHERE users.id = auth.uid()
--        AND (users.role = 'coordinator' OR users.role = 'ed')
--      )
--    );
--
--    -- Students can only update their own data
--    CREATE POLICY "Students can update own data"
--    ON students FOR UPDATE
--    TO authenticated
--    USING (id IN (
--      SELECT student_id FROM users WHERE id = auth.uid()
--    ));
--
-- 3. Remove anon permissions for write operations
--
-- ============================================
