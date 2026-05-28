-- SQL Script to create the CRM contacts table
-- Run this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile_number TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  state TEXT,
  city TEXT,
  town TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Row Level Security (RLS) policies if needed
-- For this simple CRM, we will allow all operations for anon (assuming a public or internal tool without auth for now, as no auth was mentioned).
-- If you want it secure, you should enable RLS and create policies.
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (Warning: Only do this if it's an internal tool or test. In production, use auth!)
CREATE POLICY "Enable all operations for all users" ON contacts FOR ALL USING (true) WITH CHECK (true);
