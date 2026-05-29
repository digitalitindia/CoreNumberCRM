-- Run this script in your Supabase SQL Editor to allow the application to view the list of registered users.
-- This creates a view of the internal auth.users table in the public schema.

CREATE OR REPLACE VIEW public.app_users AS
SELECT id, email, created_at, last_sign_in_at
FROM auth.users;

-- Allow authenticated users to read from this view
GRANT SELECT ON public.app_users TO authenticated;
