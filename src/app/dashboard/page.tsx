'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, Loader2, ArrowLeft, LayoutDashboard, BarChart3 } from 'lucide-react';
import Link from 'next/link';

// ... (Interface คงเดิม)

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<Kpi[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('part1');

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

  const chartData = [
    { name: 'ผ่าน', value: stats.passed },
    { name: 'ไม่ผ่าน', value: stats.failed },
  ];

  const getCategoryProgress = (catName: string) => {
    const kpisInCategory = groupKpis.filter(k => k.category === catName);
    const total = kpisInCategory.length;
    const passed = kpisInCategory.filter(kpi => {
      if (!kpi.kpi_entries?.length) return false;
      const latest = [...kpi.kpi_entries].sort((a, b) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    return { total, passed, percent: total > 0 ? (passed / total) * 100 : 0 };
  };

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
      <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 pb-6 mb-8 gap-4">
        <div>
          <button className="flex items-center text-xs text-gray-500 hover:text-purple-600 font-medium mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าหลัก
          </button>
          <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
          <p className="text-sm text-gray-500">สรุปภาพรวมผลการดำเนินงาน ({stats.total} ตัวชี้วัด)</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button onClick={() => setActiveTab('part1')} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'part1' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('part2')} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'part2' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <BarChart3 className="w-3.5 h-3.5" /> รายละเอียด
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 text-sm font-medium mb-1">KPI ทั้งหมด</p>
          <p className="text-5xl font-extrabold text-purple-600">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-around">
          <div className="flex flex-col items-center"><CheckCircle className="text-green-500 w-8 h-8 mb-1" /><span className="text-4xl font-bold text-green-500">{stats.passed}</span><span className="text-xs text-gray-400">ผ่าน</span></div>
          <div className="flex flex-col items-center"><XCircle className="text-red-500 w-8 h-8 mb-1" /><span className="text-4xl font-bold text-red-500">{stats.failed}</span><span className="text-xs text-gray-400">ไม่ผ่าน</span></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={35} outerRadius={45} startAngle={180} endAngle={0} dataKey="value">
                  <Cell fill="#22c55e" /><Cell fill="#ef4444" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <span className="text-2xl font-bold text-gray-800 -mt-6">{stats.percent}%</span>
        </div>
      </div>

      {/* Categories Grid */}
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