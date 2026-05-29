-- SUPER ADMIN FUNCTIONS
-- Run this entire script in your Supabase SQL Editor

-- Enable the pgcrypto extension if not already enabled (needed for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Function to delete a user
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the super admin
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) NOT IN ('rajeshrshiv@gmail.com', 'infodigitalitindia@gmail.com') THEN
    RAISE EXCEPTION 'Not authorized. Only Super Admin can perform this action.';
  END IF;

  -- Delete the user
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 2. Function to update a user's password
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the super admin
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) NOT IN ('rajeshrshiv@gmail.com', 'infodigitalitindia@gmail.com') THEN
    RAISE EXCEPTION 'Not authorized. Only Super Admin can perform this action.';
  END IF;

  -- Update the password (using bcrypt hashing matching Supabase standards)
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;

-- 3. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) TO authenticated;

-- 4. Reload the API schema cache so the app can see these new functions immediately
NOTIFY pgrst, 'reload schema';
