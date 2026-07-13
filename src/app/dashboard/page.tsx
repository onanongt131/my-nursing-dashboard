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

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <header className="bg-white border p-4 sm:p-6 rounded-2xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="font-black text-lg md:text-xl text-gray-800">กลุ่มภารกิจด้านการพยาบาล</h2>
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

              {/* Main Content Areas */}
              {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="animate-in fade-in space-y-6">
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
                      <th className="p-3">ตัวชี้วัด</th>
                      <th className="p-3">เป้าหมาย</th>
                      <th className="p-3">ผลงาน</th>
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
                    <div className="absolute top-0 right-0 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                      <p className="text-red-600 text-sm font-bold">Target = {selectedKpi.target_value ?? 0}</p>
                    </div>
                    <ResponsiveContainer height="100%" width="100%">
            <BarChart 
              data={[...(selectedKpi.kpi_entries || [])].sort((a, b) => a.year - b.year)} 
              margin={{ top: 20, right: 60, left: 0, bottom: 5 }}
            >
            <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#f9fafb', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
              cursor={{ fill: 'transparent' }} 
            />
            <ReferenceLine 
              y={selectedKpi.target_value} 
              label={{ value: 'Target', position: 'right', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} 
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              strokeWidth={2} 
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
                  <AddEntryForm 
                    kpiId={selectedKpi.id} 
                    onSuccess={() => alert('อัปเดตข้อมูลสำเร็จ')} 
                    type={selectedKpi.Type} 
                  />
                </div>
              </div>
            )}
          </div>
        )}

              {activeTab === 'strategic' && (
              <div className="space-y-6">
                  {/* กล่องเลือก Strategic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {strategicGoals.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedStrategic(goal.id)}
                        className={`
                          p-6 rounded-2xl border-2 transition-all duration-300 ease-in-out
                          flex items-center justify-center text-center font-medium
                          ${selectedStrategic === goal.id 
                            ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-100' 
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm hover:bg-gray-50'
                          }
                        `}
                      >
                        {goal.name}
                      </button>
                    ))}
                  </div>

                {selectedStrategic && (
                    <div className="mt-8 bg-white p-6 rounded-2xl border shadow-sm animate-in fade-in duration-500">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">
                        ตัวชี้วัด: {strategicGoals.find((g: any) => g.id === selectedStrategic)?.name}
                      </h3>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          {/* ส่วนหัวตาราง (8 คอลัมน์) */}
                          <thead>
                            <tr className="border-b bg-gray-50 text-sm">
                              <th className="p-4 text-gray-600 font-bold">ตัวชี้วัด (KPI)</th>
                              <th className="p-4 text-center text-gray-600 font-bold">ค่าเป้าหมาย</th>
                              <th className="p-4 text-center text-gray-600 font-bold">2565</th>
                              <th className="p-4 text-center text-gray-600 font-bold">2566</th>
                              <th className="p-4 text-center text-gray-600 font-bold">2567</th>
                              <th className="p-4 text-center text-gray-600 font-bold">2568</th>
                              <th className="p-4 text-center text-gray-600 font-bold">2569</th>
                              <th className="p-4 text-center text-gray-600 font-bold">เพิ่มข้อมูล</th>
                            </tr>
                          </thead>

                          {/* ส่วนเนื้อหาตาราง */}
                          <tbody>
                            {groupKpis
                              .filter((kpi: any) => kpi.strategic_id === selectedStrategic)
                              .map((kpi: any) => (
                                <tr key={kpi.id} className="border-b hover:bg-gray-50 text-sm">
                                  <td className="p-4 text-gray-800">{kpi.name}</td>
                                  <td className="p-4 text-center font-bold">{kpi.target_value}</td>
                                  
                                  {/* วนลูปแสดงค่าปี 2565-2569 (ต้องมี 5 ช่องพอดี) */}
                                  {[2565, 2566, 2567, 2568, 2569].map((year) => {
                                    const entry = kpi.kpi_entries?.find((e: any) => e.year === year);
                                    return (
                                      <td key={year} className="p-4 text-center">
                                        {entry ? (
                                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            entry.value >= kpi.target_value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {entry.value}
                                          </span>
                                        ) : (
                                          <span className="text-gray-300">-</span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  {/* ช่องจัดการ (อยู่คอลัมน์สุดท้าย) */}
                                  <td className="p-4 text-center">
                                    <button 
                                      onClick={() => {
                                        setSelectedKpi(kpi); // ต้องมีบรรทัดนี้ เพื่อให้ Modal รู้ว่ากำลังบันทึกตัวไหน
                                        setIsModalOpen(true); // เปิด Modal
                                      }}
                                      className="bg-purple-100 text-purple-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-200 transition-all"
                                    >
                                      + บันทึก
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
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
