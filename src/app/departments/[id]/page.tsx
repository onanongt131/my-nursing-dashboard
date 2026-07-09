// src/app/dashboard/departments/[id]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import ClientDepartmentView from '@/components/ClientDepartmentView'; // สร้างคอมโพเนนต์นี้เพื่อรองรับกราฟและฟอร์ม

interface DeptPageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentDetailPage({ params }: DeptPageProps) {
  const { id } = await params;

  // 1. ดึงข้อมูลทั้งหมดจาก Server side (ทำงานเร็วกว่า useEffect)
  const [{ data: department }, { data: kpis }] = await Promise.all([
    supabase.from('departments').select('*').eq('id', id).single(),
    supabase.from('kpis').select('*, kpi_entries(*)').eq('departments_id', id)
  ]);

  if (!department) notFound();

  // 2. ส่งข้อมูลไปยัง Client Component เพื่อแสดงผลกราฟและฟอร์ม
  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{department.Department}</h1>
        <p className="text-blue-600 font-medium">มีทั้งหมด {kpis?.length || 0} ตัวชี้วัด</p>
      </div>

      {/* ส่งข้อมูล kpis ไปให้ Client Component จัดการเรื่องกราฟและฟอร์ม */}
      <ClientDepartmentView initialKpis={kpis || []} />
    </main>
  );
}