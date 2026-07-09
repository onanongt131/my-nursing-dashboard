// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ป้องกันไม่ให้การสร้าง Client พังถ้าค่าเป็น undefined
if (!supabaseUrl || !supabaseAnonKey) {
  // ไม่ให้ error จนพังตอน build แต่ให้ส่งค่าหลอกไปก่อน
  console.warn("Supabase Env Variables missing!");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseAnonKey || "placeholder-key"
);