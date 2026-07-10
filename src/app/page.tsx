'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. นิยาม categories ภายใน Component
  const categories = [
    { id: '1', name: 'กลยุทธ์ 1 พัฒนาระบบบริการพยาบาลให้เป็นเลิศในการดูแลผู้ป่วยกลุ่มโรคสำคัญ', icon: '🏛️' },
    { id: '2', name: 'กลยุทธ์ 2 พัฒนาแอปพลิเคชั่นในการดูแลสุขภาพ', icon: '🎯' },
    { id: '3', name: 'กลยุทธ์ 3 พัฒนาคุณภาพบริการพยาบาลเฉพาะทางกลุ่มโรค NCD โรคอุบัติใหม่-อุบัติซ้ำ และจิตเวช', icon: '👥' },
    { id: '4', name: 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ', icon: '📊' },
    { id: '5', name: 'หมวด 5 ผลลัพธ์ด้านบุคลากร', icon: '👥' },
    { id: '6', name: 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล', icon: '📋' },
  ];

  // 2. ฟังก์ชันคำนวณสถานะ
  const getCategoryProgress = (catName: string) => {
    const kpisInCategory = groupKpis.filter(k => k.category === catName);
    const total = kpisInCategory.length;
    
    const passed = kpisInCategory.filter(kpi => {
      const latest = kpi.kpi_entries?.sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    
    const percent = total > 0 ? (passed / total) * 100 : 0;
    return { total, passed, percent };
  };

  useEffect(() => {
    async function fetchData() {
      // ด่านตรวจสำคัญ: ถ้า supabase ไม่มีตัวตน ให้หยุดทำงานและแจ้งเตือน
      if (!supabase) {
        console.error("Supabase client is not initialized.");
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
        const { data: depts } = await supabase.from('departments').select('*');
        
        if (allKpis) setGroupKpis(allKpis.filter(k => k.departments_id === null));
        if (depts) setDepartments(depts);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // คำนวณ Pass/Fail รวม
  const passedKpis = groupKpis.filter(kpi => {
    const latest = kpi.kpi_entries?.sort((a: any, b: any) => b.year - a.year)[0];
    return latest && latest.value >= (kpi.target_value || 0);
  });
  
  const passedCount = passedKpis.length;
  const failedCount = groupKpis.length - passedCount;
  const passPercent = groupKpis.length > 0 ? Math.round((passedCount / groupKpis.length) * 100) : 0;

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h1>
        {/* แก้ไขตรงนี้จาก stats.total เป็น groupKpis.length */}
        <p className="text-gray-500 mt-2">ผลการติดตามตัวชี้วัดภาพรวม ({groupKpis.length} ตัวชี้วัด)</p>
      </div>

      {/* ส่วนหัว 3 กล่อง */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
          <p className="text-gray-800 mb-2">KPI ทั้งหมด</p>
          <p className="text-9xl font-bold text-purple-600">{groupKpis.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-around">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-600 w-10 h-10" />
            <span className="text-9xl font-bold text-green-600">{passedCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <XCircle className="text-red-600 w-10 h-10" />
            <span className="text-7xl font-bold text-red-600">{failedCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col items-center">
           <p className="text-gray-500 text-sm mb-3">สัดส่วนการผ่านเกณฑ์</p>
           <div className="h-32 w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie 
                  data={[{v: passedCount}, {v: failedCount}]} 
                  startAngle={180} 
                  endAngle={0} 
                  innerRadius={60} 
                  outerRadius={120} 
                  paddingAngle={5} 
                  dataKey="v"
                  cx="50%"   // จัดให้อยู่กึ่งกลางแนวนอน
                  cy="100%"  // ดันจุดศูนย์กลางลงไปอยู่ที่ขอบล่างของกล่อง เพื่อให้ครึ่งวงกลมแสดงผลอยู่ด้านบน
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-end justify-center pb-2">
                <span className="text-3xl font-bold">{passPercent}%</span>
              </div>
           </div>
        </div>
      </div>

      {/* ส่วนแยกหมวดหมู่ */}
      <h2 className="text-2xl font-bold mb-4">แยกตามหมวดหมู่</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {categories.map((cat) => {
          const { total, passed, percent } = getCategoryProgress(cat.name);
          return (
            <Link href={`/kpi/${cat.id}`} key={cat.id}>
              <div className="dashboard-card dashboard-card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl">{cat.icon}</span>
                  <h3 className="font-semibold text-gray-800">{cat.name}</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">(มี {total} ตัวชี้วัด)</p>
                
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">ผลลัพธ์การดำเนินงาน</span>
                  <span className="font-bold">{passed} / {total}</span>
                </div>
                
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: `${percent}%` }}></div>
                  <div className="bg-red-500 h-full" style={{ width: `${100 - percent}%` }}></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ส่วนแยกตามหน่วยงาน */}
      <h2 className="text-2xl font-bold mb-4">แยกตามหน่วยงาน</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {departments.map((dept: any) => (
          <Link href={`/departments/${dept.id}`} key={dept.id}>
            <div className="dashboard-card dashboard-card-hover">
              <h3 className="font-semibold">{dept.Department}</h3>
              <p className="text-sm text-gray-500">มี KPI</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}