// src/app/category/[category]/CategoryClient.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddEntryForm from '@/components/AddEntryForm'; // ตัวอย่าง path การ import

export default function CategoryClient({ session, category }: { session: any, category: string }) {
  const decodedCategory = decodeURIComponent(category);
  const [kpis, setKpis] = useState<any[]>([]);

  // ดึงค่าจาก session ที่ส่งมาจาก page.tsx
  const userRole = session.user.role; 
  const userDept = session.user.department_id;

  async function fetchData() {
    let query = supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('category', decodedCategory);

  // ปรับเงื่อนไขการดึงข้อมูลตามสิทธิ์
      if (userRole !== 'executive') {
      // พนักงาน: ดึงเฉพาะของแผนกตัวเอง OR (ถ้า department_id เป็น null คือ KPI กลาง)
      query = query.or(`department_id.eq.${userDept},department_id.is.null`);
    }

    const { data: kpisData } = await query;
    if (kpisData) setKpis(kpisData);
  }

  useEffect(() => {
    fetchData();
  }, [decodedCategory]);
// ต่อจาก code ส่วนที่คุณส่งมา (หลัง useEffect)

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{decodedCategory}</h1>
      
      {/* วนลูปแสดงข้อมูล KPI */}
      {kpis.map((kpi) => (
        <div key={kpi.id} className="border p-4 mb-4 rounded shadow">
          <h2 className="text-lg font-semibold">{kpi.name}</h2>
          
          {/* 
            เงื่อนไขการ Render AddEntryForm 
            ตรวจสอบให้แน่ใจว่ามีวงเล็บปิดครอบคลุมแบบนี้ครับ
          */}
          {(userRole === 'executive' || kpi.department_id === userDept) && (
             <AddEntryForm kpi={kpi} />
          )}

        </div>
      ))}
    </div>
  );
}
