import 'dotenv/config'; 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("URL:", supabaseUrl);
console.log("KEY:", supabaseAnonKey); // เช็คว่าบรรทัดนี้แสดงค่าหรือไม่

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase Env Variables missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);