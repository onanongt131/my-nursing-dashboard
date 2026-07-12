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
      // ใน src/app/dashboard/page.tsx - เวอร์ชันแก้ไขปัญหาค้างหน้า Loading
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. ดึงข้อมูลจากฐานข้อมูล Supabase
        const { data: allKpis, error: kpiError } = await supabase
          .from('kpis')
          .select('*, kpi_entries(*)');

        if (kpiError) {
          throw new Error(kpiError.message);
        }

        // 2. นำข้อมูลที่ได้ไปอัปเดตลงใน State เพื่อส่งต่อให้ stats (useMemo) คำนวณ
        setGroupKpis(allKpis || []);

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err?.message || "ไม่สามารถเชื่อมต่อฐานข้อมูล KPI ได้");
      } finally {
        // 3. จุดสำคัญ: ปิดสถานะการโหลด ไม่ว่าจะดึงสำเร็จหรือพัง เพื่อให้หน้าจอแสดงเนื้อหาหลัก
        setLoading(false);
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