'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

// นิยามประเภทข้อมูล (TypeScript Types) เพื่อป้องกันโค้ดเอ๋อ
interface KpiEntry {
  year: number;
  value: number;
}

interface Kpi {
  id: string;
  category: string;
  target_value: number;
  departments_id: string | null;
  kpi_entries: KpiEntry[];
}

interface Department {
  id: string;
  Department: string;
}

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<Kpi[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: '1', name: 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร', icon: '🏛️' },
    { id: '2', name: 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์', icon: '🎯' },
    { id: '3', name: 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ', icon: '👥' },
    { id: '4', name: 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ', icon: '📊' },
    { id: '5', name: 'หมวด 5 ผลลัพธ์ด้านบุคลากร', icon: '👥' },
    { id: '6', name: 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล', icon: '📋' },
  ];

  // ปรับปรุง: คัดลอก Array ก่อน Sort ป้องกันข้อมูลจริงรวน
  const getCategoryProgress = (catName: string) => {
    const kpisInCategory = groupKpis.filter(k => k.category === catName);
    const total = kpisInCategory.length;
    
    const passed = kpisInCategory.filter(kpi => {
      if (!kpi.kpi_entries || kpi.kpi_entries.length === 0) return false;
      const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    
    const percent = total > 0 ? (passed / total) * 100 : 0;
    return { total, passed, percent };
  };

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        console.error("Supabase client is not initialized.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
        const { data: depts } = await supabase.from('departments').select('*');
        
        if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
        if (depts) setDepartments(depts);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // คำนวณ Pass/Fail รวม (แก้ไขให้ปลอดภัยขึ้น)
  const passedCount = groupKpis.filter(kpi => {
    if (!kpi.kpi_entries || kpi.kpi_entries.length === 0) return false;
    const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
    return latest && latest.value >= (kpi.target_value || 0);
  }).length;

  const failedCount = groupKpis.length - passedCount;
  const passPercent = groupKpis.length > 0 ? Math.round((passedCount / groupKpis.length) * 100) : 0;

  // ข้อมูลสำหรับกราฟครึ่งวงกลม ดักกรณีที่ไม่มีข้อมูลเพื่อไม่ให้ Recharts บั๊ก
  const chartData = groupKpis.length > 0 
    ? [{ value: passedCount }, { value: failedCount }]
    : [{ value: 0 }, { value: 1 }]; // ถ้าไม่มีข้อมูล ให้แสดงสัดส่วนว่างเปล่าไว้ก่อน

  // เพิ่มด่านตรวจสถานะ Loading หน้าเว็บจะดูโปรขึ้นมากครับ
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลระบบ Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
        <p className="text-gray-500 mt-1">ผลการติดตามตัวชี้วัดภาพรวม ({groupKpis.length} ตัวชี้วัด)</p>
      </div>
 
      {/* ส่วนหัว 3 กล่อง (ปรับขนาด font บนมือถือไม่ให้ล้นกล่อง) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center flex flex-col justify-center">
          <p className="text-gray-500 font-medium mb-2">KPI ทั้งหมด</p>
          <p className="text-6xl md:text-7xl font-bold text-purple-600">{groupKpis.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-around">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500 w-8 h-8 md:w-10 md:h-10" />
            <span className="text-5xl md:text-6xl font-bold text-green-500">{passedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="text-red-500 w-8 h-8 md:w-10 md:h-10" />
            <span className="text-5xl md:text-6xl font-bold text-red-500">{failedCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center min-h-[160px]">
          <p className="text-gray-500 text-sm mb-1">สัดส่วนการผ่านเกณฑ์</p>
          <div className="h-28 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  startAngle={180} 
                  endAngle={0} 
                  innerRadius={50} 
                  outerRadius={80} 
                  paddingAngle={3} 
                  dataKey="value"
                  cx="50%" 
                  cy="100%"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 inset-x-0 flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-gray-800">{passPercent}%</span>
            </div>
          </div>
        </div>
      </div>
 
      {/* ส่วนแยกหมวดหมู่ */}
      <h2 className="text-xl font-bold mb-4 text-gray-800">แยกตามหมวดหมู่</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {categories.map((cat) => {
          const { total, passed, percent } = getCategoryProgress(cat.name);
          return (
            <Link href={`/kpi/${cat.id}`} key={cat.id} className="block">
              <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition duration-200 cursor-pointer h-full">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-3xl mt-1">{cat.icon}</span>
                  <h3 className="font-semibold text-gray-800 leading-snug">{cat.name}</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">(มี {total} ตัวชี้วัด)</p>
                
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">ผลลัพธ์การดำเนินงาน</span>
                  <span className="font-bold text-gray-700">{passed} / {total}</span>
                </div>
                
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                  <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${total > 0 ? 100 - percent : 0}%` }}></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
 
      {/* ส่วนแยกตามหน่วยงาน */}
      <h2 className="text-xl font-bold mb-4 text-gray-800">แยกตามหน่วยงาน</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Link href={`/departments/${dept.id}`} key={dept.id} className="block">
            <div className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition duration-200 cursor-pointer h-full flex flex-col justify-between">
              <h3 className="font-semibold text-gray-800 mb-2">{dept.Department}</h3>
              <p className="text-xs text-purple-600 font-medium">คลิกเพื่อดูรายงานเฉพาะหน่วยงาน →</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

