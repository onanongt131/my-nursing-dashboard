// src/app/category/[category]/CategoryClient.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
// ... import ต่างๆ ของคุณ (AddEntryForm, Chart, etc.)

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

  // ... ส่วนแสดงผล (Render) เหมือนเดิม
  // อย่าลืมเช็คสิทธิ์ตอนแสดงปุ่ม AddEntryForm ด้วยครับ:
  // { (userRole === 'executive' || kpi.department_id === userDept) && (
  //    <AddEntryForm ... />
  // )}