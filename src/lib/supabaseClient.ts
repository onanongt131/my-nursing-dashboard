import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// สร้างตัวแปรไว้รับค่า client
let client = null;

// ใส่ด่านตรวจที่เข้มงวดที่สุด: ต้องมีค่าจริงและไม่ใช่ค่าว่าง
if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

// ส่งออกเป็น null หากไม่มีค่า เพื่อไม่ให้โปรเจกต์พังตอน Build
export const supabase = client;