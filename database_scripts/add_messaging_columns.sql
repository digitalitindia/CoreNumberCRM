-- SQL Script to add messaging tracking columns to the CRM contacts table
-- Run this script in your Supabase SQL Editor

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_messaged_at TIMESTAMP WITH TIME ZONE;
