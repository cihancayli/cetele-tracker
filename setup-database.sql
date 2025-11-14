-- ============================================
-- CETELE TRACKER DATABASE SETUP
-- ============================================
-- Copy this entire file and run it in your Supabase SQL Editor
-- URL: https://fkagbfrkowrhvchnqbqt.supabase.co

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE TABLES
-- ============================================

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    group_id UUID REFERENCES groups(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly submissions table
CREATE TABLE IF NOT EXISTS weekly_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    activity_completions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, week_start_date)
);

-- Users table for authentication (future use)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    student_id UUID REFERENCES students(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON weekly_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON weekly_submissions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for authenticated users" ON groups;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON students;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON activities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON weekly_submissions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow read for anonymous" ON groups;
DROP POLICY IF EXISTS "Allow read for anonymous" ON students;
DROP POLICY IF EXISTS "Allow read for anonymous" ON activities;
DROP POLICY IF EXISTS "Allow read for anonymous" ON weekly_submissions;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON activities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON weekly_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');

-- Allow full access for anonymous users (for easy initial setup - can be restricted later)
CREATE POLICY "Allow read for anonymous" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON students FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON weekly_submissions FOR SELECT USING (true);

-- Allow anonymous writes for initial setup
CREATE POLICY "Allow insert for anonymous" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anonymous" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anonymous" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anonymous" ON weekly_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for anonymous" ON weekly_submissions FOR UPDATE USING (true);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default activities
INSERT INTO activities (name, description, type, order_index) VALUES
('Kitap', '35 pages', 'reading', 1),
('Risale Sohbet 1', 'First session', 'discussion', 2),
('Risale Sohbet 2', 'Second session', 'discussion', 3),
('Kuran', '7 pages', 'reading', 4),
('Kaset/Video', '60 minutes', 'media', 5),
('Teheccud', '3 times', 'prayer', 6),
('SWB/Dhikr', '101/day', 'prayer', 7)
ON CONFLICT DO NOTHING;

-- Insert sample groups (optional - you can delete these)
INSERT INTO groups (name, grade) VALUES
('10th Grade', '10th'),
('11th Grade', '11th')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after the setup to verify everything worked:

-- Check tables were created
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('groups', 'students', 'activities', 'weekly_submissions', 'users')
ORDER BY tablename;

-- Check activities were inserted
SELECT * FROM activities ORDER BY order_index;

-- Check groups were inserted
SELECT * FROM groups ORDER BY name;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- You can now run the application locally
