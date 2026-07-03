import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // ดึงคุกกี้เพื่อตรวจสอบ session
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // ตรวจสอบสิทธิ์: ถ้าไม่มี session ให้ redirect ไปหน้า login
  if (!session) {
    redirect('/login');
  }

  // แสดงผลหน้า Dashboard หากมี session แล้ว
  return (
    <div>
      <h1>ยินดีต้อนรับสู่แดชบอร์ดกลุ่มภารกิจด้านการพยาบาล</h1>
      {/* ใส่เนื้อหา Dashboard ของคุณที่นี่ */}
    </div>
  );
}