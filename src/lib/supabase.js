import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded keys if Vercel Environment Variables are missing!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://inxxlsfnhvriwogxocmz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Cixyl5fSlKJWA2jNPjJuhA_hHbwM15x';

// Initialize the client
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
