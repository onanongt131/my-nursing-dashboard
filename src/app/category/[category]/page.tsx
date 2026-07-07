import { supabase } from '@/lib/supabaseClient';
import CategoryClient from './CategoryClient';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  
  // 1. ด่านตรวจ Supabase
  if (!supabase) {
    return <div>ระบบไม่พร้อมใช้งาน</div>;
  }

  // 2. ดึง Session จาก Server-side
  const { data: { session } } = await supabase.auth.getSession();
  
  // 3. ส่ง session ที่ดึงได้เข้าไปใช้งานใน Client Component
  return <CategoryClient category={category} session={session} />;
}