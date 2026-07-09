import { supabase } from '@/lib/supabaseClient';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ตรวจสอบข้อมูลใน Console ของ Vercel หรือ Terminal
  const { data: kpi, error } = await supabase
    .from('kpis')
    .select('*, kpi_entries(*)')
    .eq('id', id) // ตรวจสอบว่าคอลัมน์ใน DB คือ 'id' จริงๆ หรือไม่
    .single();

  if (error) {
    console.error("Supabase Error details:", error);
    return <div className="p-10 text-red-600">Error: {error.message}</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <h2 className="font-bold text-lg text-gray-700">KPI Detail</h2>
        <div className="flex gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <Home className="w-4 h-4" /> หน้าหลัก
          </Link>
          <LogoutButton />
        </div>
      </header>
      <div className="p-8">
        <h1>{kpi.Name}</h1> {/* ตรวจสอบชื่อคอลัมน์ให้ตรงกับฐานข้อมูล */}
      </div>
    </main>
  );
}