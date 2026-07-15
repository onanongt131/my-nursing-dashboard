'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import LogoutButton from "@/components/LogoutButton";
import KpiCard from "@/components/KpiCard";

export default function DashboardPage() {
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedStrategic, setSelectedStrategic] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

const categories = [
    { id: '1', name: 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร', icon: '🏛️' },
    { id: '2', name: 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์', icon: '🎯' },
    { id: '3', name: 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ', icon: '👥' },
    { id: '4', name: 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ', icon: '📊' },
    { id: '5', name: 'หมวด 5 ผลลัพธ์ด้านบุคลากร', icon: '👥' },
    { id: '6', name: 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล', icon: '📋' },
  ];

  const strategicGoals = [
    { id: '1', name: 'Service Excellence', year_range: '2565-2569' },
    { id: '2', name: 'Medical and Wellness Tourism Model', year_range: '2565-2569' },
    { id: '3', name: 'PP&P Excellence', year_range: '2565-2569' },
    { id: '4', name: 'Personnel Excellence', year_range: '2565-2569' },
    { id: '5', name: 'Governance excellence', year_range: '2565-2569' },
  ];

  // 1. ประกาศฟังก์ชัน fetchData ให้เป็นฟังก์ชันหลักของ Component
    const fetchData = async () => {
      setLoading(true);
      const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
      const { data: depts } = await supabase.from('departments').select('*');
      
      if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
      if (depts) setDepartments(depts);
      setLoading(false);
    };

    // 2. เรียกใช้ฟังก์ชันใน useEffect
    useEffect(() => {
      fetchData();
    }, []);

  // 2. คำนวณ Stats (ใช้ useMemo)
  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      if (!kpi.kpi_entries?.length) return false;
      const latest = [...kpi.kpi_entries].sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;
    return { 
      total: groupKpis.length, 
      passed, 
      failed: groupKpis.length - passed, 
      percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0 
    };
  }, [groupKpis]);

  // 3. เช็ค Loading
  if (loading) return <main className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</main>;

  const handleSuccess = async () => {
  console.log("บันทึกสำเร็จ!");
  
  // 1. เรียกฟังก์ชันดึงข้อมูลใหม่ (สมมติว่าคุณมีฟังก์ชัน fetchKpiData อยู่แล้ว)
  await fetchData();
  
  // 2. ถ้าคุณเลือก KPI นั้นไว้แล้ว ให้ดึงข้อมูลล่าสุดของตัวนั้นมาแสดงใหม่
  // หรือถ้าคุณใช้การ set state หลังจากดึงข้อมูลใหม่เสร็จ
};

const getTrendIcon = (data: any[]) => {
  // 1. ตรวจสอบข้อมูล
  if (!data || !Array.isArray(data)) return '-';

  // 2. กรองเฉพาะข้อมูลที่มีค่า และเรียงลำดับตามปี (year) จากน้อยไปมาก
  const validData = [...data]
    .filter(d => d && (d.value !== null && d.value !== undefined))
    .sort((a, b) => (a.year || 0) - (b.year || 0));
  
  // 3. ตรวจสอบว่ามีข้อมูลอย่างน้อย 2 ปี
  if (validData.length < 2) return '-';
  
  // 4. ดึงข้อมูล 2 ปีล่าสุด
  const latest = validData[validData.length - 1].value;
  const previous = validData[validData.length - 2].value;

  // 5. แสดงผล Trend
  if (latest > previous) return <span className="text-green-500 font-bold text-2xl">▲</span>;
  if (latest < previous) return <span className="text-red-500 font-bold">▼</span>;
  
  return (
    <span className="text-blue-500 font-bold text-3xl" style={{ lineHeight: '1' }}>
      ○
    </span>
  );
};
  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <header className="bg-white border p-4 sm:p-6 rounded-2xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="font-black text-lg md:text-xl text-gray-800">กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต</h2>
                  <nav className="bg-gray-100 p-1 rounded-xl flex border w-full max-w-3xl overflow-x-auto">
                    {[
                        { id: 'dashboard', name: 'ภาพรวม' },
                        { id: 'category', name: 'รายหมวด' },
                        { id: 'strategic', name: 'แผนยุทธศาสตร์' },
                        { id: 'department', name: 'รายหน่วยงาน' }
                      ].map((tab) => (
                      <button
                          key={tab.id}
                          onClick={() => { setActiveTab(tab.id); setSelectedCategory(null); setSelectedKpi(null); }}
                          className={`flex-1 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                        >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                  <div className="hidden md:block"><LogoutButton/></div>
                </div>
              </header>


                    {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                    <p className="text-gray-500">KPI ทั้งหมด</p>
                    <p className="text-6xl font-black text-purple-600">{stats.total}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2"><CheckCircle className="text-green-500 w-8 h-8"/><span className="text-5xl font-black text-green-500">{stats.passed}</span></div>
                      <div className="flex items-center gap-2"><XCircle className="text-red-500 w-8 h-8"/><span className="text-5xl font-black text-red-500">{stats.failed}</span></div>
                  </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                      <p className="text-gray-500">สัดส่วนการผ่านเกณฑ์</p>
                      <p className="text-5xl font-black text-gray-800">{stats.percent}%</p>
                    </div>
                </div>
              )}
   
    {activeTab === 'category' && (
  <div className="space-y-6 animate-in fade-in duration-500">
    
    {/* LEVEL 1: หน้าเลือกหมวด (ถ้ายังไม่เลือกหมวด) */}
    {!selectedCategory ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const categoryKpis = groupKpis.filter((k) => k.category === cat.name);
          const total = categoryKpis.length;
          const passed = categoryKpis.filter((k) => {
            const latest = [...(k.kpi_entries || [])].sort((a, b) => b.year - a.year)[0];
            return latest && latest.value >= (k.target_value || 0);
          }).length;
          
          return (
            <div 
              key={cat.id} 
              onClick={() => setSelectedCategory(cat.name)} 
              className="bg-white p-6 rounded-2xl border shadow-sm cursor-pointer hover:border-purple-500 hover:shadow-md transition-all"
            >
              <span className="text-3xl">{cat.icon}</span>
              <h3 className="font-bold text-lg mt-2 text-gray-800">{cat.name}</h3>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div><p className="text-xs text-gray-400 font-bold uppercase">ทั้งหมด</p><p className="text-xl font-black text-gray-700">{total}</p></div>
                <div className="flex gap-4">
                  <div className="text-center"><p className="text-xs text-green-500 font-bold">ผ่าน</p><p className="font-bold text-green-700">{passed}</p></div>
                  <div className="text-center"><p className="text-xs text-red-500 font-bold">ไม่ผ่าน</p><p className="font-bold text-red-700">{total - passed}</p></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : !selectedKpi ? (
      /* LEVEL 2: หน้าตาราง KPI รายหมวด */
      <div className="space-y-6 animate-in slide-in-from-bottom-4">
        <button onClick={() => setSelectedCategory(null)} className="text-purple-600 font-bold flex items-center gap-2">← กลับหน้าเลือกหมวด</button>
        
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-gray-800">ตัวชี้วัด: {selectedCategory}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-4 text-gray-600 font-bold">ตัวชี้วัด (KPI)</th>
                  <th className="p-4 text-center text-gray-600 font-bold">Goal</th>
                  {[2565, 2566, 2567, 2568, 2569].map(y => <th key={y} className="p-4 text-center text-gray-600 font-bold">{y}</th>)}
                  <th className="p-4 text-center text-gray-600">TREND</th>
                  <th className="p-4 text-center text-gray-600 font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {groupKpis.filter((kpi) => kpi.category === selectedCategory).map((kpi: any) => {
                  const sortedEntries = [...(kpi.kpi_entries || [])].sort((a, b) => a.year - b.year);
                  return (
                    <tr key={kpi.id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="p-4 text-gray-800">{kpi.name}</td>
                      <td className="p-4 text-center font-bold">{kpi.target_value}</td>
                      {[2565, 2566, 2567, 2568, 2569].map((year) => {
                        const entry = kpi.kpi_entries?.find((e: any) => e.year === year);
                        return (
                          <td key={year} className="p-4 text-center">
                            {entry ? (
                              <span className={`px-2 py-1 rounded-md font-bold ${entry.value >= kpi.target_value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {entry.value}
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center">{getTrendIcon(sortedEntries)}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedKpi(kpi)} className="bg-purple-600 text-white px-4 py-1 rounded-lg hover:bg-purple-700 transition-colors">เพิ่ม</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ) : (
      /* LEVEL 3: หน้ากราฟและฟอร์มเพิ่มข้อมูล */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
        <div className="bg-white p-6 rounded-2xl border">
          <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold flex items-center">← ย้อนกลับ</button>
          <h3 className="font-bold mb-4 text-lg">ตัวชี้วัด: {selectedKpi.name}</h3>
          <ResponsiveContainer height={250} width="100%">
            <BarChart data={[...(selectedKpi.kpi_entries || [])].sort((a, b) => a.year - b.year)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
              <ReferenceLine y={selectedKpi.target_value} stroke="red" strokeDasharray="4 4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-4 text-lg">บันทึกผลการดำเนินงาน</h3>
          <AddEntryForm 
            kpiId={selectedKpi.id} 
            type={selectedKpi.Type} 
            onSuccess={() => { 
              setSelectedKpi(null); 
              fetchData(); // ดึงข้อมูลใหม่หลังอัปเดต
            }} 
          />
        </div>
      </div>
    )}
  </div>
)}

{activeTab === 'strategic' && (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* 1. แถบเลือกยุทธศาสตร์ */}
    <div className="flex flex-wrap items-center gap-3 mb-6">
  {strategicGoals
    .filter((goal) => !goal.name.includes("หมวด"))
    .map((goal) => (
      <button
        key={goal.id}
        onClick={() => {
          setSelectedStrategic(goal.id);
          setSelectedKpi(null);
        }}
        className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all whitespace-nowrap ${
          selectedStrategic === goal.id
            ? "bg-purple-600 text-white border-purple-600 shadow-md"
            : "bg-white text-gray-600 border-gray-200 hover:border-purple-400 hover:bg-gray-50"
        }`}
      >
        {goal.name}
      </button>
    ))}
</div>

    {/* 2. การแสดงผลเนื้อหาหลัก */}
    {!selectedStrategic ? (
      <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border">
        กรุณาเลือกยุทธศาสตร์ที่ต้องการดูข้อมูล
      </div>
    ) : !selectedKpi ? (
      /* 2.1 หน้าตาราง KPI */
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          ตัวชี้วัด: {strategicGoals.find((g: any) => g.id === selectedStrategic)?.name}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-4 text-gray-600 font-bold">ตัวชี้วัด (KPI)</th>
                <th className="p-4 text-center text-gray-600 font-bold">เป้าหมาย</th>
                {[2565, 2566, 2567, 2568, 2569].map((y) => (
                  <th key={y} className="p-4 text-center text-gray-600 font-bold">{y}</th>
                ))}
                <th className="p-4 text-center text-gray-600 font-bold">แนวโน้ม</th>
                <th className="p-4 text-center text-gray-600 font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {groupKpis
                .filter((kpi: any) => kpi.strategic_id === selectedStrategic)
                .map((kpi: any) => {
                  const sortedEntries = [...(kpi.kpi_entries || [])].sort((a, b) => a.year - b.year);
                  return (
                    <tr key={kpi.id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="p-4 text-gray-800">{kpi.name}</td>
                      <td className="p-4 text-center font-bold">{kpi.target_value}</td>
                      {[2565, 2566, 2567, 2568, 2569].map((year) => {
                        const entry = kpi.kpi_entries?.find((e: any) => e.year === year);
                        return (
                          <td key={year} className="p-4 text-center">
                            {entry ? (
                              <span className={`px-2 py-1 rounded-md font-bold ${entry.value >= kpi.target_value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {entry.value}
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center">{getTrendIcon(sortedEntries)}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedKpi(kpi)} className="bg-purple-600 text-white px-4 py-1 rounded-lg hover:bg-purple-700">เพิ่ม</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      /* 2.2 หน้ากราฟและฟอร์ม */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border">
          <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold flex items-center">← ย้อนกลับ</button>
          <h3 className="font-bold mb-4">ตัวชี้วัด: {selectedKpi.name}</h3>
          <ResponsiveContainer height={250} width="100%">
            <BarChart data={[...(selectedKpi.kpi_entries || [])].sort((a, b) => a.year - b.year)}>
              <XAxis dataKey="year" /> <YAxis /> <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
              <ReferenceLine y={selectedKpi.target_value} stroke="red" strokeDasharray="4 4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-4">บันทึกข้อมูลผลการดำเนินงาน</h3>
          <AddEntryForm kpiId={selectedKpi.id} type={selectedKpi.Type} onSuccess={() => { setSelectedKpi(null); fetchData(); }} />
        </div>
      </div>
    )}
  </div>
)} 
        {activeTab === 'department' && (
          <div className="space-y-8">
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">เลือกหน่วยงาน</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {departments.map((dept: any) => (
                <button 
                  key={dept.id} 
                  onClick={() => setSelectedDept(dept.id)} 
                  className={`p-4 rounded-xl border-2 ${selectedDept === dept.id ? 'border-purple-600 bg-purple-50' : 'border-gray-100'}`}
                >
                  {dept.Department}
                </button>
              ))}
            </div>
          </div>

          {selectedDept && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
              {groupKpis.filter((kpi: any) => kpi.departments_id === selectedDept).map((kpi: any) => (
              <KpiCard key={kpi.id} kpi={kpi} chartData={kpi.kpi_entries} />
              ))}
            </div>
            )}
          </div>
        )}
     
     {/* วาง Modal ไว้ตรงนี้ */}
        {isModalOpen && selectedKpi && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <h2 className="text-lg font-bold mb-4">บันทึกผล: {selectedKpi.name}</h2>
              
              <AddEntryForm 
                  kpiId={selectedKpi.id} 
                  type={selectedKpi.Type} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    fetchData(); // ตอนนี้ Component มองเห็นฟังก์ชันนี้แล้ว!
                  }}
                />
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-800"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
    </main>
  )
}