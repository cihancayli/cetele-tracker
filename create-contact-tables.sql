-- Create Feature Requests and Contact Messages Tables
-- Run this in Supabase SQL Editor

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

-- Enable Row Level Security
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (submit forms)
CREATE POLICY "Allow insert for anonymous" ON feature_requests
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow insert for anonymous" ON contact_messages
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to read all submissions
CREATE POLICY "Allow read for authenticated" ON feature_requests
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated" ON contact_messages
    FOR SELECT
    USING (auth.role() = 'authenticated');
