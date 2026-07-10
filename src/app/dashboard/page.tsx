'use client';
export const dynamic = 'force-dynamic'; // สำคัญมาก: บอก Next.js ว่าหน้านี้ไม่ต้องทำ Static generation
import { useState, useEffect, useMemo } from 'react';
// ... (imports เดิม)
import { CheckCircle } from 'lucide-react';
import { XCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<Kpi[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // เพิ่มตัวแปร error

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

  // ใน src/app/dashboard/page.tsx
    useEffect(() => {
      async function fetchData() {
        // 1. เพิ่มการเช็คเพื่อป้องกัน Error ตอน Prerendering
        if (typeof window === 'undefined') return; 

        try {
          setLoading(true);
          // ... โค้ดดึงข้อมูล Supabase เดิมของคุณ
          const { data: allKpis, error: kpiError } = await supabase.from('kpis').select('*, kpi_entries(*)');
          // ...
        } catch (err) {
          // ...
        }
      }
      fetchData();
    }, []);

      // ถ้าติด Loading ให้แสดงตัวนี้แทนการเรียก LoadingComponent
      if (loading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลระบบ Dashboard...</p>
          </div>
        );
      }
      if (error) return <div className="p-8 text-red-600 font-bold">{error}</div>; // แสดง Error

      return (
        <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
          {/* ... ส่วนเนื้อหาหลักใช้ {stats.passed}, {stats.failed}, {stats.percent} แทน ... */}
        </main>
      );
    }