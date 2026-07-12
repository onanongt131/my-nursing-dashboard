'use client';
export const dynamic = 'force-dynamic'; 

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
// 🔥 เพิ่มการอิมพอร์ตไลบรารีดึงข้อมูลของ Supabase เข้ามาที่นี่
import { createClient } from '@supabase/supabase-js';

// 🔥 สร้างตัวแปรเปิดสิทธิ์เชื่อมต่อเบื้องต้น (Client-side Initialization)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // แนะนำใช้คีย์สาธารณะ ANON สำหรับหน้าบ้าน (Client Component)
);

// ประกาศ Interface เพื่อป้องกัน Type Error บนระบบ TypeScript
interface KpiEntry {
  year: number;
  value: number;
}
interface Kpi {
  id: string;
  target_value: number;
  kpi_entries?: KpiEntry[];
}
interface Department {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<Kpi[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 

  // ใช้ useMemo เพื่อคำนวณข้อมูลเพียงครั้งเดียวเมื่อ groupKpis เปลี่ยน
  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      if (!kpi.kpi_entries?.length) return false;
      const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    
    return {
      passed,
      failed: groupKpis.length - passed,
      percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0
    };
  }, [groupKpis]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. ดึงข้อมูลจากฐานข้อมูล Supabase (ตอนนี้เรียกตัวแปร supabase ด้านบนได้แล้ว ไม่พังแน่นอน)
        const { data: allKpis, error: kpiError } = await supabase
          .from('kpis')
          .select('*, kpi_entries(*)');

        if (kpiError) {
          throw new Error(kpiError.message);
        }

        // 2. นำข้อมูลที่ได้ไปอัปเดตลงใน State
        setGroupKpis(allKpis || []);

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err?.message || "ไม่สามารถเชื่อมต่อฐานข้อมูล KPI ได้");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลระบบ Dashboard...</p>
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-600 font-bold bg-red-50 rounded-xl border border-red-200">{error}</div>; 

  return (
    <div className="space-y-6">
      {/* 📊 บล็อกแสดงผลสถิติส่วนบน (KPI Cards Summaries) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 rounded-xl text-green-600"><CheckCircle /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">KPI ที่ผ่านเกณฑ์</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.passed} รายการ</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-600"><XCircle /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">KPI ที่ไม่ผ่านเกณฑ์</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.failed} รายการ</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">📊</div>
          <div>
            <p className="text-sm font-medium text-gray-500">คิดเป็นเปอร์เซ็นต์</p>
            <h3 className="text-2xl font-bold text-purple-600">{stats.percent}%</h3>
          </div>
        </div>
      </div>

      {/* 🏛️ ตารางแสดงข้อมูลตัวชี้วัดของกลุ่มภารกิจด้านการพยาบาล */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">รายการตัวชี้วัดทั้งหมด (KPI List)</h2>
        {groupKpis.length === 0 ? (
          <p className="text-gray-500 text-sm">ยังไม่มีข้อมูลตัวชี้วัดในระบบฐานข้อมูล</p>
        ) : (
          <div className="divide-y text-sm">
            {groupKpis.map((kpi: any) => (
              <div key={kpi.id} className="py-3 flex justify-between items-center">
                <span className="font-medium text-gray-700">{kpi.name || `รหัสตัวชี้วัด ${kpi.id}`}</span>
                <span className="text-gray-500">เป้าหมาย: <strong className="text-gray-800">{kpi.target_value}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
