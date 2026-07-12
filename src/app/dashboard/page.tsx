'use client';
import { useState, useEffect, useMemo } from 'react'; // ต้องมี useMemo ในนี้
import { supabase } from '@/lib/supabaseClient'; 
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Loader2, ArrowLeft, LayoutDashboard } from 'lucide-react'; // ต้องมี ArrowLeft, LayoutDashboard ในนี้
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
  const [activeTab, setActiveTab] = useState('part1');

  const categories = [
    { id: '1', name: 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร', icon: '🏛️' },
    { id: '2', name: 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์', icon: '🎯' },
    { id: '3', name: 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ', icon: '👥' },
    { id: '4', name: 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ', icon: '📊' },
    { id: '5', name: 'หมวด 5 ผลลัพธ์ด้านบุคลากร', icon: '👥' },
    { id: '6', name: 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล', icon: '📋' },
  ];

  // ปรับปรุง: คัดลอก Array ก่อน Sort ป้องกันข้อมูลจริงรวน
  // คำนวณ Stats ให้สะอาดด้วย useMemo
  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      if (!kpi.kpi_entries?.length) return false;
      const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;

    return {
      total: groupKpis.length,
      passed,
      failed: groupKpis.length - passed,
      percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0
    };
  }, [groupKpis]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
      const { data: depts } = await supabase.from('departments').select('*');
      if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
      if (depts) setDepartments(depts);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
    </div>
  );

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b pb-4 mb-6 gap-4">
        <div>
          <button className="flex items-center text-xs text-gray-500 hover:text-gray-700 font-medium mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าหลัก
          </button>
          <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
          <p className="text-sm text-gray-500">ผลการติดตามตัวชี้วัดภาพรวม ({stats.total} ตัวชี้วัด)</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border shadow-sm">
          <button 
            onClick={() => setActiveTab('part1')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center space-x-1.5 ${activeTab === 'part1' ? 'bg-purple-600 text-white' : 'text-gray-600'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>ส่วนที่ 1: Dashboard ภาพรวม</span>
          </button>
        </div>
      </div>
 
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
          <p className="text-gray-500 font-medium mb-2">KPI ทั้งหมด</p>
          <p className="text-6xl font-bold text-purple-600">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-around">
          <div className="flex items-center gap-2"><CheckCircle className="text-green-500 w-8 h-8" /><span className="text-5xl font-bold text-green-500">{stats.passed}</span></div>
          <div className="flex items-center gap-2"><XCircle className="text-red-500 w-8 h-8" /><span className="text-5xl font-bold text-red-500">{stats.failed}</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm mb-1">สัดส่วนการผ่านเกณฑ์</p>
          <span className="text-3xl font-bold text-gray-800">{stats.percent}%</span>
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

