'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import GaugeChart from '@/components/GaugeChart';
import KpiCard from '@/components/KpiCard'; // นำเข้า Component KpiCard ที่สร้างไว้
import Link from 'next/link';

export default function DashboardPage() {
  const [missionKpis, setMissionKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // 1. ดึง KPI กลุ่มภารกิจ (ที่ departments_id เป็น null)
      const { data: mKpis } = await supabase
        .from('kpis')
        .select('*, kpi_entries(*)')
        .is('departments_id', null);
      
      // 2. ดึงหน่วยงาน
      const { data: depts } = await supabase
        .from('departments')
        .select('*, kpis(id)');
      
      setMissionKpis(mKpis || []);
      setDepartments(depts || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // คำนวณสถิติสำหรับ GaugeChart
  const stats = useMemo(() => {
    const total = missionKpis.length;
    const passed = missionKpis.filter(kpi => {
      const latest = kpi.kpi_entries?.sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;

    return { passed, total };
  }, [missionKpis]);

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      {/* 1. ส่วนแสดงภาพรวมด้วย GaugeChart */}
      <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
          <p className="text-gray-500 mt-2">ผลการติดตามตัวชี้วัดภาพรวม ({missionKpis.length} ตัวชี้วัด)</p>
        </div>
        <div className="h-40">
           <GaugeChart stats={stats} />
        </div>
      </div>
      
      {/* 2. ส่วนแสดงหน่วยงาน */}
      <h2 className="text-xl font-bold mb-4">แยกตามหน่วยงาน</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {departments.map((dept) => (
          <Link href={`/departments/${dept.id}`} key={dept.id}>
            <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg">{dept.Department}</h3>
              <p className="text-sm text-gray-400 mt-2">
                มี {dept.kpis?.length || 0} ตัวชี้วัด
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* 3. ส่วนแสดง KpiCard ของกลุ่มภารกิจ */}
      <h2 className="text-xl font-bold mb-4">ตัวชี้วัดกลุ่มภารกิจ</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {missionKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </main>
  );
}