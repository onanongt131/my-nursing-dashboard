// src/app/dashboard/departments/[id]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import ClientDepartmentView from '@/components/ClientDepartmentView';
import LogoutButton from '@/components/LogoutButton';

interface DeptPageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentDetailPage({ params }: DeptPageProps) {
  const { id } = await params;

  // 1. ดึงข้อมูล
  const [{ data: department }, { data: kpis }] = await Promise.all([
    supabase.from('departments').select('*').eq('id', id).single(),
    supabase.from('kpis').select('*, kpi_entries(*)').eq('departments_id', id)
  ]);

  if (!department) notFound();

  // 2. Render
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">{department.Department}</h1>
        <div className="flex gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <Home className="w-4 h-4" /> หน้าหลัก
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="p-6">
        {/* ส่งข้อมูล kpis ไปให้ Client Component จัดการเรื่องกราฟและฟอร์ม */}
        <ClientDepartmentView initialKpis={kpis || []} />
      </section>
    </main>
  );
}