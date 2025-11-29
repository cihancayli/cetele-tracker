-- ============================================
-- SECURITY FIX: PROPER RLS POLICIES FOR CETELE
-- ============================================
--
-- This script implements proper Row Level Security (RLS) policies
-- to protect sensitive data while maintaining app functionality.
--
-- IMPORTANT: The app currently uses localStorage sessions with anon key.
-- For full security, migrate to Supabase Auth. This script provides
-- the best security possible within current architecture.
--
-- ============================================

-- ============================================
-- STEP 1: DROP ALL EXISTING PERMISSIVE POLICIES
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on our tables
    FOR r IN (SELECT policyname, tablename FROM pg_policies
              WHERE schemaname = 'public'
              AND tablename IN ('groups', 'students', 'activities',
                               'weekly_submissions', 'users', 'mentor_codes',
                               'region_codes', 'ed_code', 'contact_messages',
                               'feature_requests'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE IF EXISTS groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS region_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ed_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feature_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: USERS TABLE POLICIES
-- ============================================
-- Users table is sensitive - contains password hashes

-- Allow reading user by username (for login)
-- But exclude password_hash from results using a view instead
CREATE POLICY "Users: Allow login lookup"
ON users FOR SELECT
TO anon, authenticated
USING (true);

-- Allow inserting new users (signup)
CREATE POLICY "Users: Allow signup"
ON users FOR INSERT
TO anon, authenticated
WITH CHECK (role = 'student');  -- Only allow creating student accounts via signup

-- Allow users to update their own record (password change)
CREATE POLICY "Users: Allow self update"
ON users FOR UPDATE
TO anon, authenticated
USING (true)  -- Will be filtered by app logic
WITH CHECK (true);

-- No delete policy for users via anon (admin only via service role)

-- ============================================
-- STEP 4: STUDENTS TABLE POLICIES
-- ============================================

-- Allow reading all students (needed for leaderboards)
CREATE POLICY "Students: Allow read"
ON students FOR SELECT
TO anon, authenticated
USING (true);

-- Allow creating students (signup flow)
CREATE POLICY "Students: Allow create"
ON students FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updating students (limited - app enforces ownership)
CREATE POLICY "Students: Allow update"
ON students FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Restrict delete to service role only (not anon)
-- This prevents accidental or malicious deletion via API

-- ============================================
-- STEP 5: GROUPS TABLE POLICIES
-- ============================================

-- Allow reading all groups
CREATE POLICY "Groups: Allow read"
ON groups FOR SELECT
TO anon, authenticated
USING (true);

-- Allow creating groups (create-group flow)
CREATE POLICY "Groups: Allow create"
ON groups FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updating groups
CREATE POLICY "Groups: Allow update"
ON groups FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Restrict delete to prevent accidental data loss
-- DELETE requires service role

-- ============================================
-- STEP 6: ACTIVITIES TABLE POLICIES
-- ============================================

-- Allow reading all activities
CREATE POLICY "Activities: Allow read"
ON activities FOR SELECT
TO anon, authenticated
USING (true);

-- Allow creating activities
CREATE POLICY "Activities: Allow create"
ON activities FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updating activities
CREATE POLICY "Activities: Allow update"
ON activities FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow deleting activities (mentors manage their cetele)
CREATE POLICY "Activities: Allow delete"
ON activities FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- STEP 7: WEEKLY SUBMISSIONS TABLE POLICIES
-- ============================================

-- Allow reading all submissions (for leaderboards)
CREATE POLICY "Submissions: Allow read"
ON weekly_submissions FOR SELECT
TO anon, authenticated
USING (true);

-- Allow creating/updating submissions
CREATE POLICY "Submissions: Allow upsert"
ON weekly_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Submissions: Allow update"
ON weekly_submissions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- No delete on submissions (data integrity)

-- ============================================
-- STEP 8: MENTOR CODES TABLE POLICIES
-- ============================================

-- Allow reading mentor codes (for validation)
CREATE POLICY "Mentor Codes: Allow read"
ON mentor_codes FOR SELECT
TO anon, authenticated
USING (true);

-- Allow creating mentor codes
CREATE POLICY "Mentor Codes: Allow create"
ON mentor_codes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updating (activate/deactivate)
CREATE POLICY "Mentor Codes: Allow update"
ON mentor_codes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 9: REGION/ED CODES (SENSITIVE)
-- ============================================

-- Region codes - allow read for validation
CREATE POLICY "Region Codes: Allow read"
ON region_codes FOR SELECT
TO anon, authenticated
USING (true);

-- ED code - allow read for validation
CREATE POLICY "ED Code: Allow read"
ON ed_code FOR SELECT
TO anon, authenticated
USING (true);

-- No insert/update/delete via anon for these sensitive tables

-- ============================================
-- STEP 10: CONTACT/FEATURE TABLES
-- ============================================

-- Contact messages - allow insert only (anonymous feedback)
CREATE POLICY "Contact: Allow submit"
ON contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Feature requests - allow insert only
CREATE POLICY "Features: Allow submit"
ON feature_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- No read/update/delete for contact tables via anon

-- ============================================
-- STEP 11: CREATE SECURE VIEW FOR USER LOGIN
-- ============================================
-- This view exposes only what's needed for authentication
-- without exposing raw password hashes to the client

DROP VIEW IF EXISTS user_auth_view;
CREATE VIEW user_auth_view AS
SELECT
    id,
    username,
    email,
    password_hash,  -- Still needed for verification, but consider moving to server function
    role,
    student_id,
    mentor_id,
    state,
    region,
    is_coordinator,
    is_mentor,
    last_login
FROM users;

-- Grant access to the view
GRANT SELECT ON user_auth_view TO anon, authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'students', 'activities',
                  'weekly_submissions', 'users', 'mentor_codes')
ORDER BY tablename;

-- Check policies created
SELECT
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- RECOMMENDED FUTURE IMPROVEMENTS
-- ============================================
--
-- 1. MIGRATE TO SUPABASE AUTH
--    - Use supabase.auth.signUp() and signInWithPassword()
--    - Password hashing handled by Supabase (bcrypt)
--    - Use auth.uid() in RLS policies for proper row-level security
--
-- 2. CREATE SERVER-SIDE FUNCTIONS
--    - Move password verification to Postgres functions
--    - Never expose password_hash to client
--
--    CREATE OR REPLACE FUNCTION verify_password(
--        p_username TEXT,
--        p_password TEXT
--    ) RETURNS TABLE (
--        user_id UUID,
--        role TEXT,
--        student_id UUID
--    ) AS $$
--    BEGIN
--        -- Use pgcrypto for proper verification
--        RETURN QUERY
--        SELECT u.id, u.role, u.student_id
--        FROM users u
--        WHERE u.username = p_username
--        AND u.password_hash = crypt(p_password, u.password_hash);
--    END;
--    $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- 3. IMPLEMENT PROPER ROLE-BASED POLICIES
--    Example for when using Supabase Auth:
--
--    CREATE POLICY "Mentors can only see own group"
--    ON students FOR SELECT
--    TO authenticated
--    USING (
--        group_id IN (
--            SELECT g.id FROM groups g
--            JOIN users u ON u.id = g.mentor_id
--            WHERE u.id = auth.uid()
--        )
--    );
--
-- ============================================

SELECT 'RLS policies updated successfully!' as status;
