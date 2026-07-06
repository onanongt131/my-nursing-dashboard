import { createClient } from '@supabase/supabase-js';

// เปลี่ยนจากการใช้ ! เป็นการเช็คและ Log ค่าเพื่อดูว่า Vercel เห็นตัวแปรไหม
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('DEBUG_BUILD: URL is', supabaseUrl ? 'Set' : 'Missing');
console.log('DEBUG_BUILD: Key is', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  // ไม่ให้พังทันที แต่ให้รู้ว่าค่าหาย
  console.error('SUPABASE CONFIGURATION IS MISSING DURING BUILD');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');