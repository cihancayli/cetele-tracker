-- ============================================
-- CETELE REGION-BASED AUTH SYSTEM
-- ============================================
-- This is a COMPLETE replacement for setup-auth-system.sql
-- Each region is completely isolated with its own ED, coordinators, and mentors
-- Run this in your Supabase SQL Editor AFTER setup-database.sql

-- ============================================
-- DROP OLD TABLES (if running fresh)
-- ============================================
DROP TABLE IF EXISTS mentor_codes CASCADE;
DROP TABLE IF EXISTS region_codes CASCADE;
DROP TABLE IF EXISTS ed_code CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- NEW TABLES FOR REGION-BASED SYSTEM
-- ============================================

-- Regions table - Each region is completely separate
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL, -- e.g., "North Carolina", "Georgia", etc.
    ed_code TEXT UNIQUE NOT NULL, -- Unique ED code for this region
    hs_code TEXT UNIQUE NOT NULL, -- High School coordinator/mentor code
    ms_code TEXT UNIQUE NOT NULL, -- Middle School coordinator/mentor code
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table - linked to specific region
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    -- Role and region
    role TEXT NOT NULL CHECK (role IN ('ed', 'coordinator', 'mentor', 'student')),
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    division TEXT CHECK (division IN ('High School', 'Middle School', NULL)), -- For coordinators/mentors

    -- Role flags
    is_coordinator BOOLEAN DEFAULT FALSE,
    is_mentor BOOLEAN DEFAULT FALSE,

    -- Relations
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    mentor_id UUID, -- Reference to mentor for students

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT student_must_have_student_id CHECK (
        (role = 'student' AND student_id IS NOT NULL) OR
        (role != 'student')
    ),
    CONSTRAINT ed_must_have_region CHECK (
        (role = 'ed' AND region_id IS NOT NULL) OR
        (role != 'ed')
    ),
    CONSTRAINT coordinator_must_have_division CHECK (
        (is_coordinator = TRUE AND division IS NOT NULL AND region_id IS NOT NULL) OR
        (is_coordinator = FALSE)
    )
);

-- Mentor codes table (auto-generated for each mentor)
CREATE TABLE mentor_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS division TEXT CHECK (division IN ('High School', 'Middle School', NULL));

-- Update students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE CASCADE;

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
        INSERT INTO mentor_codes (code, mentor_id, region_id)
        VALUES (generate_mentor_code(), NEW.id, NEW.region_id);
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
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region_id);
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_codes_mentor ON mentor_codes(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_codes_code ON mentor_codes(code);
CREATE INDEX IF NOT EXISTS idx_mentor_codes_region ON mentor_codes(region_id);
CREATE INDEX IF NOT EXISTS idx_groups_mentor ON groups(mentor_id);
CREATE INDEX IF NOT EXISTS idx_groups_region ON groups(region_id);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_codes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all for anonymous" ON regions FOR ALL USING (true);
CREATE POLICY "Allow all for anonymous" ON mentor_codes FOR ALL USING (true);

-- ============================================
-- INSERT NORTH CAROLINA REGION WITH CODES
-- ============================================

-- Insert North Carolina region with all codes
INSERT INTO regions (name, ed_code, hs_code, ms_code) VALUES
('North Carolina', 'NC-ED-2025', 'NC-HS-2025', 'NC-MS-2025')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check regions table
SELECT
    name as region_name,
    ed_code as "ED Code",
    hs_code as "High School Code",
    ms_code as "Middle School Code"
FROM regions
ORDER BY name;

-- Check new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('regions', 'mentor_codes', 'users')
ORDER BY table_name;

-- Test mentor code generation
SELECT generate_mentor_code() AS sample_code;

-- ============================================
-- HELPER QUERIES FOR ADMINS
-- ============================================

-- View all users by region
-- SELECT
--     r.name as region,
--     u.username,
--     u.role,
--     u.division,
--     u.is_coordinator,
--     u.is_mentor
-- FROM users u
-- JOIN regions r ON u.region_id = r.id
-- ORDER BY r.name, u.role;

-- View all mentor codes by region
-- SELECT
--     r.name as region,
--     mc.code,
--     u.username as mentor,
--     mc.is_active
-- FROM mentor_codes mc
-- JOIN regions r ON mc.region_id = r.id
-- JOIN users u ON mc.mentor_id = u.id
-- ORDER BY r.name, mc.code;

-- ============================================
-- ADDING NEW REGIONS
-- ============================================

-- Template for adding a new region:
-- INSERT INTO regions (name, ed_code, hs_code, ms_code) VALUES
-- ('Georgia', 'GA-ED-2025', 'GA-HS-2025', 'GA-MS-2025');

-- ============================================
-- NOTES
-- ============================================
/*
REGION STRUCTURE:
Each region is completely isolated with:
- 1 Education Director (ED)
- 1 Middle School Coordinator
- 1 High School Coordinator
- Multiple Mentors under each coordinator
- Coordinators can also have their own mentor groups

NORTH CAROLINA CODES:
- ED Code: NC-ED-2025
- High School Code: NC-HS-2025 (for HS coordinator and mentors)
- Middle School Code: NC-MS-2025 (for MS coordinator and mentors)
- Mentor Codes: Auto-generated (MTR-XXXX)

SIGNUP FLOW:

1. ED Signup:
   - Enters: NC-ED-2025
   - System shows: "Welcome to North Carolina - Education Director"
   - Only ED role available
   - Gets full access to NC region only

2. Coordinator/Mentor Signup:
   - Enters: NC-HS-2025 or NC-MS-2025
   - System shows: "Welcome to North Carolina - [High/Middle] School"
   - Choose: Coordinator, Mentor, or Both
   - Coordinators get division-wide access
   - Mentors get their own group + mentor code

3. Student Signup:
   - Enters: MTR-XXXX (from their mentor)
   - Automatically joins mentor's group
   - Linked to same region as mentor

ISOLATION:
- North Carolina users can ONLY see North Carolina data
- Each region has completely separate:
  - Users
  - Groups
  - Students
  - Weekly submissions
  - Analytics

TO ADD MORE REGIONS:
Just insert a new row in the regions table with unique codes!
*/

-- ============================================
-- SETUP COMPLETE!
-- ============================================
