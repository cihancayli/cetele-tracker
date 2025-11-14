-- ============================================
-- CETELE AUTH SYSTEM SETUP
-- ============================================
-- This file extends the existing database with authentication and hierarchy
-- Run this in your Supabase SQL Editor AFTER setup-database.sql

-- ============================================
-- NEW TABLES FOR AUTH SYSTEM
-- ============================================

-- Region codes table (HS and MS)
CREATE TABLE IF NOT EXISTS region_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    region_name TEXT NOT NULL CHECK (region_name IN ('High School', 'Middle School')),
    created_by UUID, -- Reference to admin who created it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentor codes table (auto-generated for each mentor)
CREATE TABLE IF NOT EXISTS mentor_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    mentor_id UUID NOT NULL, -- Reference to users table
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ED (Education Director) code table
CREATE TABLE IF NOT EXISTS ed_code (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated users table with enhanced roles and hierarchy
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ed', 'coordinator', 'mentor', 'student')),

    -- Role-specific fields
    region TEXT CHECK (region IN ('High School', 'Middle School', NULL)),
    is_coordinator BOOLEAN DEFAULT FALSE,
    is_mentor BOOLEAN DEFAULT FALSE,

    -- Relations
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    mentor_id UUID, -- Self-reference to mentor for students

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT student_must_have_student_id CHECK (
        (role = 'student' AND student_id IS NOT NULL) OR
        (role != 'student')
    ),
    CONSTRAINT coordinator_must_have_region CHECK (
        (is_coordinator = TRUE AND region IS NOT NULL) OR
        (is_coordinator = FALSE)
    )
);

-- Update groups table to include mentor and region references
ALTER TABLE groups ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IN ('High School', 'Middle School', NULL));

-- Update students table to link to user account
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate unique mentor code
CREATE OR REPLACE FUNCTION generate_mentor_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate code like MTR-2847
        new_code := 'MTR-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM mentor_codes WHERE code = new_code) INTO code_exists;

        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create mentor code after mentor user is created
CREATE OR REPLACE FUNCTION create_mentor_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create mentor code if user is a mentor
    IF NEW.is_mentor = TRUE OR NEW.role = 'mentor' THEN
        INSERT INTO mentor_codes (code, mentor_id)
        VALUES (generate_mentor_code(), NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create mentor codes
DROP TRIGGER IF EXISTS trigger_create_mentor_code ON users;
CREATE TRIGGER trigger_create_mentor_code
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_mentor_code_for_user();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_codes_mentor ON mentor_codes(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_codes_code ON mentor_codes(code);
CREATE INDEX IF NOT EXISTS idx_region_codes_code ON region_codes(code);
CREATE INDEX IF NOT EXISTS idx_groups_mentor ON groups(mentor_id);
CREATE INDEX IF NOT EXISTS idx_groups_region ON groups(region);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE region_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ed_code ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all for anonymous" ON region_codes FOR ALL USING (true);
CREATE POLICY "Allow all for anonymous" ON mentor_codes FOR ALL USING (true);
CREATE POLICY "Allow all for anonymous" ON ed_code FOR ALL USING (true);

-- ============================================
-- INSERT DEFAULT CODES
-- ============================================

-- Insert ED master code (change this to something secure!)
INSERT INTO ed_code (code) VALUES ('ED-MASTER-2025')
ON CONFLICT DO NOTHING;

-- Insert region codes for High School and Middle School
INSERT INTO region_codes (code, region_name) VALUES
('HS-REGION-2025', 'High School'),
('MS-REGION-2025', 'Middle School')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('region_codes', 'mentor_codes', 'ed_code', 'users')
ORDER BY table_name;

-- Check region codes
SELECT * FROM region_codes;

-- Check ED code
SELECT * FROM ed_code;

-- Test mentor code generation
SELECT generate_mentor_code() AS sample_code;

-- ============================================
-- NOTES
-- ============================================
/*
HIERARCHY:
1. ED (Education Director) - Top level
   - Uses ED master code to sign up
   - Can see all groups across all regions

2. Coordinators (HS & MS)
   - Uses region code + selects "Coordinator" or "Both" during signup
   - Can view all groups in their region
   - Can optionally have their own mentor group

3. Mentors
   - Uses region code + selects "Mentor" during signup
   - Gets auto-generated mentor code (e.g., MTR-2847)
   - Can only view/manage their own group

4. Students
   - Uses mentor code to sign up
   - Can only submit ceteles, no admin access

ONBOARDING FLOW:
1. Admin (you) → gives region codes to coordinators/mentors
2. Coordinators/Mentors → sign up with region code → create group → get mentor code
3. Students → sign up with mentor code → join group

DEFAULT CODES:
- ED Code: ED-MASTER-2025 (change this!)
- HS Region: HS-REGION-2025
- MS Region: MS-REGION-2025
- Mentor codes: Auto-generated (MTR-XXXX)
*/

-- ============================================
-- SETUP COMPLETE!
-- ============================================
