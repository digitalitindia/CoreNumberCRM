-- SQL Script to update the CRM contacts table with new features and Security (RLS)
-- Run this script in your Supabase SQL Editor

-- 1. Add New Columns
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS person_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Enable Row Level Security (If not already enabled)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 3. Delete old public policy if it exists (so we can secure it)
DROP POLICY IF EXISTS "Enable all operations for all users" ON contacts;

-- 4. Create new secure policy: Only authenticated users can access the data
CREATE POLICY "Enable all operations for authenticated users only" 
ON contacts 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
