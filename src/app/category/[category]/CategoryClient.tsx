'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddEntryForm from '@/components/AddEntryForm';

export default function CategoryClient({ session, category }: { session: any, category: string }) {
  const decodedCategory = decodeURIComponent(category);
  const [kpis, setKpis] = useState<any[]>([]);

  const userRole = session.user.role;
  const userDept = session.user.department_id;

  // ในไฟล์ src/app/category/[category]/CategoryClient.tsx

  async function fetchData() {
    // 1. เช็คว่ามี client ไหม (Type Guard)
    if (!supabase) {
      console.error("Supabase client is not initialized.");
      return; // จบการทำงานฟังก์ชันนี้ทันที ถ้าไม่มี supabase
    }

    // 2. ถ้าผ่านตรงนี้มาได้ แปลว่า supabase มีค่าแน่นอน (TypeScript เข้าใจแล้ว)
    let query = supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('category', decodedCategory);

    // 3. กำหนดเงื่อนไข Role
    if (userRole !== 'executive') {
      query = query.or(`department_id.eq.${userDept},department_id.is.null`);
    }

    // 4. ดึงข้อมูล
    const { data: kpisData, error } = await query;
    
    if (error) {
      console.error("Fetch error:", error);
      return;
    }
    
    if (kpisData) {
      setKpis(kpisData);
    }
  }

  useEffect(() => {
    fetchData();
  }, [decodedCategory]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{decodedCategory}</h1>
      {kpis.map((kpi) => (
        <div key={kpi.id} className="border p-4 mb-4 rounded shadow">
          <h2 className="text-lg font-semibold">{kpi.name}</h2>
          {(userRole === 'executive' || kpi.department_id === userDept) && (
          <AddEntryForm 
            kpiId={kpi.id} 
            type={kpi.type || 'general'} 
            onSuccess={fetchData} 
          />
        )}
        </div>
      ))}
    </div>
  );
}