'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import LogoutButton from "@/components/LogoutButton"; // ปรับ Path ให้ตรงกับที่เก็บไฟล์จริง
import KpiCard from "@/components/KpiCard"; // ปรับ Path ให้ตรงกับที่เก็บไฟล์จริง

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
   const [selectedDept, setSelectedDept] = useState<string | null>(null); // เพิ่มบรรทัดนี้ครับ

  const categories = [
    { id: '1', name: 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร', icon: '🏛️' },
    { id: '2', name: 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์', icon: '🎯' },
    { id: '3', name: 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ', icon: '👥' },
    { id: '4', name: 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ', icon: '📊' },
    { id: '5', name: 'หมวด 5 ผลลัพธ์ด้านบุคลากร', icon: '👥' },
    { id: '6', name: 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล', icon: '📋' },
  ];


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

  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      if (!kpi.kpi_entries?.length) return false;
      const latest = [...kpi.kpi_entries].sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    return { total: groupKpis.length, passed, failed: groupKpis.length - passed, percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0 };
  }, [groupKpis]);

  if (loading) return <main className="p-8 text-center">กำลังโหลดข้อมูล...</main>;


  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="bg-white border p-6 rounded-2xl shadow-sm mb-8">
  {/* ปรับให้ flex เป็น row เดียวกันทั้งหมด และใช้ items-center เพื่อให้ทุกอย่างจัดกึ่งกลางในแนวตั้ง */}
  <div className="flex justify-between items-center gap-4">
    
    {/* 1. ชื่อระบบ */}
    <h2 className="font-black text-xl text-gray-800 whitespace-nowrap">Dashboard พยาบาล</h2>

    {/* 2. ปุ่มเมนู (Tabs) */}
    <nav className="bg-gray-100 p-1 rounded-xl flex border w-full max-w-sm" aria-label="Tabs">
      {[
        { id: 'dashboard', name: 'ภาพรวม' },
        { id: 'category', name: 'แยกรายหมวด' },
        { id: 'department', name: 'แยกหน่วยงาน' }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            setSelectedCategory(null);
            setSelectedKpi(null);
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
            activeTab === tab.id 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          {tab.name}
        </button>
      ))}
    </nav>

    {/* 3. ปุ่มออกจากระบบ */}
    <LogoutButton />
  </div>
</header>

      {/* เนื้อหาหลักตาม Tab */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border text-center"><p className="text-gray-500">KPI ทั้งหมด</p><p className="text-6xl font-black text-purple-600">{stats.total}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-center gap-8">
            <div className="flex items-center gap-2"><CheckCircle className="text-green-500 w-8 h-8" /><span className="text-5xl font-black text-green-500">{stats.passed}</span></div>
            <div className="flex items-center gap-2"><XCircle className="text-red-500 w-8 h-8" /><span className="text-5xl font-black text-red-500">{stats.failed}</span></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border text-center"><p className="text-gray-500">สัดส่วนการผ่านเกณฑ์</p><p className="text-5xl font-black text-gray-800">{stats.percent}%</p></div>
        </div>
      )}

      {activeTab === 'category' && (
  <div className="animate-in fade-in">
    {!selectedCategory ? (
      // 1. หน้าแสดง 6 หมวด
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const filteredKpis = groupKpis.filter(k => k.category === cat.name);
          const totalInCat = filteredKpis.length;
          const passedInCat = filteredKpis.filter(k => {
            if (!k.kpi_entries?.length) return false;
            const latest = [...k.kpi_entries].sort((a: any, b: any) => b.year - a.year)[0];
            return latest && latest.value >= (k.target_value || 0);
          }).length;
          const progressPercent = totalInCat > 0 ? (passedInCat / totalInCat) * 100 : 0;

          return (
            <div key={cat.id} onClick={() => setSelectedCategory(cat.name)}
              className="bg-white p-6 rounded-2xl border shadow-sm hover:border-purple-500 cursor-pointer transition-all">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{cat.icon}</span>
                <h3 className="font-bold text-gray-800">{cat.name}</h3>
              </div>
              <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                <span>มี {totalInCat} ตัวชี้วัด</span>
                <span className="font-bold text-gray-700">{passedInCat} / {totalInCat}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${progressPercent === 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    ) : !selectedKpi ? (
      // 2. หน้าตาราง KPI
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <button onClick={() => setSelectedCategory(null)} className="mb-4 text-sm text-purple-600 font-bold">← ย้อนกลับไปเลือกหมวด</button>
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="p-3">ชื่อตัวชี้วัด</th>
              <th className="p-3">เป้าหมาย</th>
              <th className="p-3">ผลการดำเนินงาน</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {groupKpis.filter(k => k.category === selectedCategory).map(kpi => {
              const entries = kpi.kpi_entries || [];
              const latest = entries.length > 0 ? [...entries].sort((a: any, b: any) => b.year - a.year)[0] : null;
              const isPassed = latest && latest.value >= kpi.target_value;
              return (
                <tr key={kpi.id} className="border-b">
                  <td className="p-3 font-medium">{kpi.name}</td>
                  <td className="p-3">{kpi.target_value}</td>
                  <td className="p-3">{latest ? latest.value : "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-lg text-xs ${!latest ? 'bg-gray-100 text-gray-500' : isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {!latest ? 'รอข้อมูล' : isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </span>
                  </td>
                  <td className="p-3"><button onClick={() => setSelectedKpi(kpi)} className="text-purple-600 font-bold">เพิ่มข้อมูล</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      // 3. หน้า Update กราฟ
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold">← ย้อนกลับไปตาราง</button>
          <h3 className="font-bold mb-4">ตัวชี้วัด: {selectedKpi.name}</h3>
          
          <div className="relative w-full h-64">
            {/* กล่องแสดง Target ที่มุมขวาบน */}
            <div className="absolute top-0 right-0 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
              <p className="text-red-600 text-sm font-bold">
                Target = {selectedKpi.target_value ?? 0}
              </p>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              {/* เรียงข้อมูลตามปีก่อนส่งให้กราฟ */}
              <BarChart 
              data={[...(selectedKpi.kpi_entries || [])].sort((a, b) => a.year - b.year)}
              margin={{ top: 20, right: 60, left: 0, bottom: 5 }} // เพิ่ม right margin เพื่อให้ข้อความเป้าหมายไม่โดนตัด
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="year" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#f9fafb'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              
              {/* เพิ่มส่วนนี้สำหรับเส้น Target */}
              <ReferenceLine 
                y={selectedKpi.target_value} // ค่าเป้าหมายของคุณ
                stroke="#ef4444" 
                strokeWidth={2} 
                strokeDasharray="4 4" 
                label={{ 
                  value: 'Target', 
                  position: 'right', 
                  fill: '#ef4444', 
                  fontSize: 12, 
                  fontWeight: 'bold' 
                }} 
              />
              
              <Bar 
                dataKey="value" 
                fill="#9333ea" 
                radius={[6, 6, 0, 0]} 
                barSize={40} 
              />
            </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold mb-4">UPDATE KPI</h3>
          {/* เรียกใช้งานคอมโพเนนต์นี้ */}
        <AddEntryForm 
          kpiId={selectedKpi.id} 
          // ตรงนี้สำคัญมาก: ต้องมั่นใจว่าส่งค่า Type จากตาราง kpis มาตรงๆ
          // เช่น ถ้าในตารางคอลัมน์ชื่อ 'Type' ให้ใช้ selectedKpi.Type
          type={selectedKpi.Type}
          onSuccess={() => {
            // ใส่ logic รีเฟรชข้อมูลที่นี่ เช่น เรียกฟังก์ชันดึงข้อมูลใหม่
            alert('อัปเดตข้อมูลสำเร็จ');
          }} 
        />
        </div>
      </div>
    )}
  </div>
)}

      {/* ส่วนแสดงรายการตึกแบบ Box (Grid) แทน Dropdown */}
      {activeTab === 'department' && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">เลือกหน่วยงาน</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {departments.map((dept: any) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`p-4 rounded-xl border-2 transition-all text-center font-bold text-sm ${
                  selectedDept === dept.id
                    ? 'border-purple-600 bg-purple-50 text-purple-700' // สไตล์เมื่อถูกเลือก
                    : 'border-gray-100 bg-white hover:border-purple-200 text-gray-700' // สไตล์ปกติ
                }`}
              >
                {dept.Department}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ส่วนแสดงผลข้อมูล KPI เมื่อมีการเลือกตึกแล้ว */}
      {activeTab === 'department' && selectedDept && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {groupKpis
            .filter((kpi: any) => kpi.departments_id === selectedDept) // ตรวจสอบชื่อคอลัมน์เชื่อมโยงให้ตรงกับ DB
            .map((kpi: any) => (
              <KpiCard key={kpi.id} kpi={kpi} chartData={kpi.kpi_entries} />
            ))
          }
        </div>
      )}
    </main>
  );
}