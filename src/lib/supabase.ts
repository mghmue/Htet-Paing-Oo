import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

const supabaseUrl = isServer 
  ? process.env.VITE_SUPABASE_URL 
  : import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey = isServer 
  ? process.env.VITE_SUPABASE_ANON_KEY 
  : import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (isServer) {
    console.warn('Supabase URL or Anon Key is missing in process.env');
  } else {
    console.warn('Supabase URL or Anon Key is missing in import.meta.env');
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
