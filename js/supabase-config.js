// Supabase Configuration
const SUPABASE_URL = 'https://fkagbfrkowrhvchnqbqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrYWdiZnJrb3dyaHZjaG5xYnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTczMjAsImV4cCI6MjA3ODY5MzMyMH0.QhIHqXBoAnd-OV96DZJL4Qx-k76L5GHSa35pBaThFpY';

// Initialize Supabase client
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database schema reference:
// Tables needed:
// 1. students (id, name, grade, group_id, created_at)
// 2. groups (id, name, grade, created_at)
// 3. activities (id, name, description, type, created_at)
// 4. weekly_submissions (id, student_id, week_start_date, activity_completions, created_at)
// 5. users (id, email, role, student_id, created_at) - for auth

// SQL Schema to run in Supabase SQL Editor:
const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    student_id UUID REFERENCES students(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON weekly_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON weekly_submissions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Row Level Security Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (you can refine these later)
CREATE POLICY "Allow all for authenticated users" ON groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON activities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON weekly_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access to anonymous users for public viewing
CREATE POLICY "Allow read for anonymous" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON students FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON weekly_submissions FOR SELECT USING (true);

-- Feature Requests table
CREATE TABLE IF NOT EXISTS feature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (submit forms)
CREATE POLICY "Allow insert for anonymous" ON feature_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anonymous" ON contact_messages FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Allow read for authenticated" ON feature_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated" ON contact_messages FOR SELECT USING (auth.role() = 'authenticated');
`;

