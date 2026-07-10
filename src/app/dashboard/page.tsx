'use client';
import { useState, useEffect, useMemo } from 'react';
// ... (imports เดิม)

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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: allKpis, error: kpiError } = await supabase.from('kpis').select('*, kpi_entries(*)');
        const { data: depts, error: deptError } = await supabase.from('departments').select('*');
        
        if (kpiError || deptError) throw new Error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
        
        setGroupKpis(allKpis?.filter(k => k.departments_id === null) || []);
        setDepartments(depts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingComponent />; // แยกส่วน Loading ออกมา
  if (error) return <div className="p-8 text-red-600 font-bold">{error}</div>; // แสดง Error

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* ... ส่วนเนื้อหาหลักใช้ {stats.passed}, {stats.failed}, {stats.percent} แทน ... */}
    </main>
  );
}