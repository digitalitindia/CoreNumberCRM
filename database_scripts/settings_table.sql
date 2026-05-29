-- SQL Script to create the CRM settings table for dynamic States, Cities, and Categories
-- Run this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crm_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_type TEXT NOT NULL, -- 'category', 'state', or 'city'
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(setting_type, setting_value)
);

-- Enable RLS
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (Since app is currently unlocked by default)
CREATE POLICY "Enable all operations for all users on crm_settings" ON crm_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert Default Categories
INSERT INTO crm_settings (setting_type, setting_value) VALUES
('category', 'Real Estate & Builders'),
('category', 'Jewelry & Diamond Merchants'),
('category', 'Visa & Overseas Education Consultants'),
('category', 'Textile Manufacturers & Wholesalers'),
('category', 'Chemical & Pharmaceutical Manufacturers'),
('category', 'Machinery & Industrial Equipment Suppliers'),
('category', 'Hospitals & Multi-Specialty Clinics'),
('category', 'Travel Agencies & Tour Operators'),
('category', 'Logistics, Packers & Movers'),
('category', 'Interior Designers & Architects'),
('category', 'Restaurants, Cafes & Cloud Kitchens'),
('category', 'Event Management & Wedding Planners'),
('category', 'Chartered Accountants & Financial Firms'),
('category', 'Solar Panel Installers & Manufacturers'),
('category', 'Automobile Dealers & Service Centers'),
('category', 'Gyms & Fitness Centers'),
('category', 'E-commerce & Retail Brands'),
('category', 'Corporate Law Firms & Advocates'),
('category', 'Beauty Salons & Spas'),
('category', 'Pest Control Services'),
('category', 'Spa')
ON CONFLICT DO NOTHING;

-- Insert Default States
INSERT INTO crm_settings (setting_type, setting_value) VALUES
('state', 'Madhya Pradesh'),
('state', 'Gujarat')
ON CONFLICT DO NOTHING;

-- Insert Default Cities
INSERT INTO crm_settings (setting_type, setting_value) VALUES
('city', 'Surat'),
('city', 'Ahmedabad'),
('city', 'Indore'),
('city', 'Bhopal')
ON CONFLICT DO NOTHING;
