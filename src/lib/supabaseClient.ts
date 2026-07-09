import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // แทนที่จะปล่อยให้พัง ให้แสดง Log เตือน
  console.error("Supabase Env Variables missing!");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);