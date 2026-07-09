import { supabase } from '@/lib/supabaseClient';
import CategoryClient from './CategoryClient';

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  
  // ตรวจสอบว่าคีย์มีจริงไหมก่อนเรียกใช้
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <div>อยู่ระหว่างการอัปเดตระบบ กรุณาลองใหม่ภายหลัง</div>;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return <CategoryClient category={category} session={session} />;
}