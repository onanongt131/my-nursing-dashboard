'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle } from 'lucide-react';
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
  const [selectedDisease, setSelectedDisease] = useState("ทั้งหมด"); // เพิ่ม state นี้

const categories = [
    { id: '1', name: 'หมวด 1 ผลลัพธ์ด้านการนำองค์กร', icon: '🏛️' },
    { id: '2', name: 'หมวด 2 ผลลัพธ์ด้านกลยุทธ์', icon: '🎯' },
    { id: '3', name: 'หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ', icon: '👥' },
    { id: '4', name: 'หมวด 4 ผลลัพธ์ด้านการวัดวิเคราะห์ฯ', icon: '📊' },
    { id: '5', name: 'หมวด 5 ผลลัพธ์ด้านบุคลากร', icon: '👥' },
    { id: '6', name: 'หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล', icon: '📋' },
  ];

  const strategicGoals = [
  { 
    id: '1', 
    name: 'Service Excellence', 
    description: 'พัฒนาระบบบริการพยาบาลให้เป็นเลิศในการดูแลผู้ป่วยกลุ่มโรคสำคัญ', 
    year_range: '2565-2569' 
  },
  { 
    id: '2', 
    name: 'Medical and Wellness Tourism Model', 
    description: 'พัฒนาแอปพลิเคชั่นในการดูแลสุขภาพ : ไม่ป่วยเริ่มต้นที่ตัวคุณเอง', 
    year_range: '2565-2569' 
  },
  { 
    id: '3', 
    name: 'PP&P Excellence', 
    description: 'พัฒนาคุณภาพบริการพยาบาลเฉพาะทางกลุ่มโรค NCD โรคอุบัติใหม่-อุบัติซ้ำ และจิตเวช', 
    year_range: '2565-2569' 
  },
  { 
    id: '4', 
    name: 'Personnel Excellence', 
    description: 'พัฒนาสถาบันการวิจัย ผลิต และพัฒนาบุคลากรทางการแพทย์ การสาธารณสุข และการบริหารจัดการระดับนานาชาติ', 
    year_range: '2565-2569' 
  },
  { 
    id: '5', 
    name: 'Governance excellence', 
    description: 'พัฒนาองค์กรสมรรถนะสูงระดับนานาชาติ', 
    year_range: '2565-2569' 
  },
];

const diseaseList = [
  "ทั้งหมด",
  "Stroke",
  "STEMI",
  "Sepsis",
  "PIH",
  "PPH",
  "TBI",
  "Obesity",
  "Spinal fusion",
  "Multiple trauma",
  "Chemotherapy",
  "Preterm",
  "Pneumonia",
  "Cervix Cancer",
  "Senile cataract",
  "HBOT"
];

const calculateYearlyAverage = (entries: any[], year: number, kpiType: string = 'percentage'): string | number => {
  const yearlyEntries = entries.filter((e: any) => e.year === year);
  if (!yearlyEntries || yearlyEntries.length === 0) return "-";

  // กรณีเป็นแบบ Count: ให้ดึงค่าล่าสุดของปีนั้นมาแสดง (หรือค่าเฉลี่ยของเดือนในป่านั้น)
  if (kpiType === 'count') {
    const latestEntry = yearlyEntries.sort((a, b) => b.id - a.id)[0];
    return latestEntry.value || 0;
  }

  // กรณีเป็นแบบ Percentage (คิดตามสูตรเดิมที่คุณมีอยู่)
  const totalNumerator = yearlyEntries.reduce((sum, curr) => sum + (curr.numerator || 0), 0);
  const totalDenominator = yearlyEntries.reduce((sum, curr) => sum + (curr.denominator || 0), 0);

  if (totalDenominator === 0) return 0;
  return parseFloat(((totalNumerator / totalDenominator) * 100).toFixed(2));
};

  // ใช้ useCallback เพื่อป้องกันการ re-create ฟังก์ชัน
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
    const { data: depts } = await supabase.from('departments').select('*');
    
    if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
    if (depts) setDepartments(depts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
// คำนวณ Stats
  const stats = useMemo(() => {
    const passed = groupKpis.filter(kpi => {
      const entries = kpi.kpi_entries || [];
      if (entries.length === 0) return false;
      const latest = [...entries].sort((a: any, b: any) => b.year - a.year)[0];
      return latest && latest.value >= (kpi.target_value || 0);
    }).length;

    return { 
      total: groupKpis.length, 
      passed, 
      failed: groupKpis.length - passed, 
      percent: groupKpis.length > 0 ? Math.round((passed / groupKpis.length) * 100) : 0 
    };
  }, [groupKpis]);

  // ฟังก์ชันช่วยจัดการการรีเซ็ต state
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setSelectedKpi(null);
    setSelectedDept(null);
    setSelectedStrategic(null);
  };

const prepareChartData = (entries: any[]) => {
    const years = [2567, 2568, 2569];
    return years.map(year => {
      const avgValue = calculateYearlyAverage(entries, year);
      return {
        year: year,
        value: avgValue !== "-" ? parseFloat(avgValue.toString()) : 0
      };
    });
  };

// 2. แล้วค่อยเรียกใช้ภายใน getYearlyTrend
const getYearlyTrend = (entries: any[], currentYear: number = 2569) => {
  const prevYear = currentYear - 1;
  
  const avgCurrent = calculateYearlyAverage(entries, currentYear);
  const avgPrev = calculateYearlyAverage(entries, prevYear);

  // ตรวจสอบว่ามีข้อมูลหรือไม่
  if (avgCurrent === "-" || avgPrev === "-") return "-";

  const valCurrent = parseFloat(avgCurrent.toString());
  const valPrev = parseFloat(avgPrev.toString());

  if (valCurrent > valPrev) return <span className="text-green-500 text-sm">▲</span>;
  if (valCurrent < valPrev) return <span className="text-red-500 text-sm">▼</span>;
  return <span className="text-blue-500 text-xl">○</span>;
};

  if (loading) return <main className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</main>;

  const checkStatus = (value: number, target: number, operator: string) => {
  if (typeof value !== 'number') return null;
  
  let isPass = false;
  if (operator === '>') isPass = value > target;
  else if (operator === '>=') isPass = value >= target;
  else if (operator === '<') isPass = value < target;
  else if (operator === '<=') isPass = value <= target;
  else isPass = value === target;

  return isPass;
};

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
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
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
                  <th className="p-4 text-center text-gray-600">Trend</th>
                  <th className="p-4 text-center text-gray-600 font-bold">Add</th>
                </tr>
              </thead>
              <tbody>
                {groupKpis.filter((kpi) => kpi.category === selectedCategory).map((kpi: any) => {
                  const sortedEntries = [...(kpi.kpi_entries || [])].sort((a, b) => a.year - b.year);
                  return (
                    <tr key={kpi.id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="p-4 text-gray-800">{kpi.name}</td>
                      <td className="p-4 text-center font-bold text-gray-700 whitespace-nowrap">
                        {kpi.operator} {kpi.target_value}
                      </td>
                    {[2565, 2566, 2567, 2568, 2569].map((year) => {
                          const avgValue = calculateYearlyAverage(kpi.kpi_entries || [], year, kpi.Type);
                          const status = checkStatus(Number(avgValue), kpi.target_value, kpi.operator);

                          return (
                            <td key={year} className="p-4 text-center">
                              {avgValue !== "-" ? (
                              <span className={`px-3 py-1 rounded-lg font-bold ${
                                status 
                                  ? "bg-green-50 text-green-700" // ผ่าน: พื้นหลังเขียวอ่อน ไม่มีขอบ
                                  : "bg-red-50 text-red-700"       // ไม่ผ่าน: พื้นหลังแดงอ่อน ไม่มีขอบ
                              }`}>
                                {avgValue}
                              </span>
                              ) : (
                                <span className="text-gray-400 text-xs">ไม่มีข้อมูล</span>
                              )}
                            </td>
                          );
                        })}
                      <td className="text-center font-bold">
                        {getYearlyTrend(kpi.kpi_entries, 2569)}
                      </td>
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
      /* LEVEL 3: หน้ากราฟและฟอร์ม */
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
  
  {/* ก้อนที่ 1: กราฟ (อยู่ซ้าย) */}
  <div className="bg-white p-6 rounded-2xl border relative">
  {/* ปุ่มย้อนกลับ */}
  <button onClick={() => setSelectedKpi(null)} className="mb-6 text-purple-600 font-medium flex items-center hover:text-purple-800 transition-colors">
    ← ย้อนกลับ
  </button>

  {/* กล่อง Goal ที่ปรับปรุงความสวยงาม */}
  <div className="absolute top-6 right-6 bg-white border shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 border-slate-100">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal</span>
    <span className="text-lg font-black text-slate-800">{selectedKpi.target_value}</span>
  </div>

  <h3 className="font-bold text-gray-800 text-lg mb-8">{selectedKpi.name}</h3>
  
  {(() => {
    const chartData = [2565, 2566, 2567, 2568, 2569].map(year => ({
      year: year,
      value: parseFloat(calculateYearlyAverage(selectedKpi.kpi_entries || [], year).toString()) || 0
    }));

    return (
      <ResponsiveContainer height={250} width="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          {/* เปลี่ยนสีแท่งกราฟให้ดูนุ่มนวลขึ้น */}
          <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={40} />
          <ReferenceLine y={selectedKpi.target_value} stroke="#f87171" strokeDasharray="3 3" />
        </BarChart>
      </ResponsiveContainer>
    );
  })()}
</div>
        <div className="bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-4">บันทึกข้อมูลผลการดำเนินงาน</h3>
          <AddEntryForm kpiId={selectedKpi.id} type={selectedKpi.Type} 
          onSuccess={() => { setSelectedKpi(null); fetchData(); }} />
        </div>
      </div>
    )}
  </div>
)} 

{activeTab === 'strategic' && (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* 1. แถบเลือกยุทธศาสตร์ */}
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {strategicGoals.filter((goal) => !goal.name.includes("หมวด")).map((goal) => (
        <button
          key={goal.id}
          onClick={() => {
            setSelectedStrategic(goal.id);
            setSelectedKpi(null);
            setSelectedDisease("ทั้งหมด"); // รีเซ็ตทุกครั้งที่เปลี่ยนยุทธศาสตร์
          }}
          className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${
            selectedStrategic === goal.id ? "bg-purple-600 text-white" : "bg-white"
          }`}
        >
          {goal.name}
        </button>
      ))}
    </div>

    {/* 2. การแสดงผลเนื้อหาหลัก */}
    {selectedStrategic && !selectedKpi && (
      <div className="space-y-6">
    {/* 1. กล่องแสดงกลยุทธ์ (ใช้ฟิลด์ description ที่เราเพิ่มเข้าไป) */}
    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
      <p className="text-purple-800 font-bold">
        กลยุทธ์ : {strategicGoals.find((g) => g.id === selectedStrategic)?.description || "ไม่ระบุ"}
      </p>
    </div>

        {strategicGoals.find((g) => g.id === selectedStrategic)?.name === "Service Excellence" && (
          <div className="flex flex-wrap gap-2">
            {diseaseList.map((disease) => (
              <button
                key={disease}
                onClick={() => setSelectedDisease(disease)}
                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                  selectedDisease === disease 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "bg-white text-gray-600 hover:border-purple-400"
                }`}
              >
                {disease}
              </button>
            ))}
          </div>
        )}

        {/* ตาราง KPI */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-sm">
                  {selectedDisease === "ทั้งหมด" && <th className="p-4 text-gray-600 font-bold">โรค</th>}
                  <th className="p-4 text-gray-600 font-bold">ตัวชี้วัด (KPI)</th>
                  <th className="p-4 text-center text-gray-600 font-bold">Goal</th>
                  {[2565, 2566, 2567, 2568, 2569].map((y) => <th key={y} className="p-4 text-center text-gray-600 font-bold">{y}</th>)}
                  <th className="p-4 text-center text-gray-600 font-bold">Trend</th>
                  <th className="p-4 text-center text-gray-600 font-bold">Add</th>
                </tr>
              </thead>
              <tbody>
                {groupKpis
                  .filter((kpi: any) => 
                    kpi.strategic_id === selectedStrategic && 
                    (selectedDisease === "ทั้งหมด" || kpi.disease_name === selectedDisease)
                  )
                  .map((kpi: any) => {
                    const sortedEntries = [...(kpi.kpi_entries || [])].sort((a, b) => a.year - b.year);
                    return (
                      <tr key={kpi.id} className="border-b hover:bg-gray-50 text-sm">
                        {selectedDisease === "ทั้งหมด" && <td className="p-4 text-gray-600">{kpi.disease_name || "-"}</td>}
                        <td className="p-4 text-gray-800">{kpi.name}</td>
                        <td className="p-4 text-center font-bold text-gray-700 whitespace-nowrap">
                            {kpi.operator} {kpi.target_value}
                          </td>
                        {[2565, 2566, 2567, 2568, 2569].map((year) => {
                          const avgValue = calculateYearlyAverage(kpi.kpi_entries || [], year, kpi.Type);
                          const status = checkStatus(Number(avgValue), kpi.target_value, kpi.operator);

                          return (
                            <td key={year} className="p-4 text-center">
                              {avgValue !== "-" ? (
                              <span className={`px-3 py-1 rounded-lg font-bold ${
                                status 
                                  ? "bg-green-50 text-green-700" // ผ่าน: พื้นหลังเขียวอ่อน ไม่มีขอบ
                                  : "bg-red-50 text-red-700"       // ไม่ผ่าน: พื้นหลังแดงอ่อน ไม่มีขอบ
                              }`}>
                                {avgValue}
                              </span>
                              ) : (
                                <span className="text-gray-400 text-xs">ไม่มีข้อมูล</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center font-bold">
                          {getYearlyTrend(kpi.kpi_entries, 2569)}
                        </td>
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
      </div>
    )}

    {/* 2.2 หน้ากราฟและฟอร์ม (เมื่อมีการเลือก KPI) */}
    {selectedKpi && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border">
          <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold flex items-center">← ย้อนกลับ</button>
          {/* เพิ่มกล่อง Goal ตรงนี้ */}
          <div className="absolute top-6 right-6 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
            <p className="text-xs text-red-600 font-bold uppercase">เป้าหมาย (Goal)</p>
            <p className="text-lg font-black text-red-700">{selectedKpi.operator} {selectedKpi.target_value}</p>
          </div>
          <h3 className="font-bold mb-4">ตัวชี้วัด: {selectedKpi.name}</h3>
          {(() => {
          // 1. ประกาศตัวแปรข้างในฟังก์ชันนี้ได้เลย
          const chartData = [2565, 2566, 2567, 2568, 2569].map(year => ({
            year: year,
            // 2. ใช้ค่าจาก calculateYearlyAverage ที่คุณมีอยู่แล้ว
            value: parseFloat(calculateYearlyAverage(selectedKpi.kpi_entries || [], year).toString()) || 0
          }));
    // 3. นำมาแสดงผลกราฟในนี้
            return (
                  <ResponsiveContainer height={250} width="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                      <ReferenceLine y={selectedKpi.target_value} stroke="red" strokeDasharray="4 4" />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
              {/* --- สิ้นสุดการแก้ไข --- */}
            </div>
        <div className="bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-4">บันทึกข้อมูลผลการดำเนินงาน</h3>
          <AddEntryForm kpiId={selectedKpi.id} type={selectedKpi.Type} 
          onSuccess={() => { setSelectedKpi(null); fetchData(); }} />
        </div>
      </div>
    )}
  </div>
)} 

        {activeTab === 'department' && (
  <div className="space-y-8 animate-in fade-in duration-500">
    {/* 1. ส่วนเลือกหน่วยงาน */}
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
        เลือกหน่วยงาน
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {departments.map((dept: any) => (
          <button 
            key={dept.id} 
            onClick={() => setSelectedDept(dept.id)} 
            className={`px-4 py-4 rounded-2xl border transition-all duration-200 text-sm font-medium ${
              selectedDept === dept.id 
                ? "bg-purple-50 border-purple-600 text-purple-700 shadow-sm" 
                : "bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50/30"
            }`}
          >
            {dept.Department}
          </button>
        ))}
      </div>
    </div>

    {/* 2. ส่วนแสดงผล KPI ของหน่วยงานที่เลือก */}
    {selectedDept && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {groupKpis
          .filter((kpi: any) => kpi.departments_id === selectedDept)
          .map((kpi: any) => (
            <KpiCard 
              key={kpi.id} 
              kpi={kpi} 
              chartData={kpi.kpi_entries} 
            />
          ))
        }
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