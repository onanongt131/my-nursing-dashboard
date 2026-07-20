'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import { calculateYearlyAverage, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations';

export default function Strategic() {
  // 1. เพิ่ม State ที่ขาดไป
  const [selectedStrategic, setSelectedStrategic] = useState<string | null>('1'); // เริ่มต้นที่ยุทธศาสตร์แรก
  const [selectedDisease, setSelectedDisease] = useState("ทั้งหมด");
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const strategicGoals = [
    { id: '1', name: 'Service Excellence', description: 'กลยุทธ์ : พัฒนาระบบบริการพยาบาลให้เป็นเลิศในการดูแลผู้ป่วยกลุ่มโรคสำคัญ', year_range: '2565-2569' },
    { id: '2', name: 'Medical and Wellness Tourism Model', description: 'กลยุทธ์ : พัฒนาแอปพลิเคชั่นในการดูแลสุขภาพ : ไม่ป่วยเริ่มต้นที่ตัวคุณเอง', year_range: '2565-2569' },
    { id: '3', name: 'PP&P Excellence', description: 'กลยุทธ์ : พัฒนาคุณภาพบริการพยาบาลเฉพาะทางกลุ่มโรค NCD โรคอุบัติใหม่-อุบัติซ้ำ และจิตเวช', year_range: '2565-2569' },
    { id: '4', name: 'Personnel Excellence', description: 'กลยุทธ์ : พัฒนาสถาบันการวิจัย ผลิต และพัฒนาบุคลากรทางการแพทย์ การสาธารณสุข และการบริหารจัดการระดับนานาชาติ', year_range: '2565-2569' },
    { id: '5', name: 'Governance excellence', description: 'กลยุทธ์ : พัฒนาองค์กรสมรรถนะสูงระดับนานาชาติ', year_range: '2565-2569' },
  ];

  const diseaseList = ["ทั้งหมด", "Stroke", "STEMI", "Sepsis", "PIH", "PPH", "TBI", "Obesity", "Spinal fusion", "Multiple trauma", "Chemotherapy", "Preterm", "Pneumonia", "Cervix Cancer", "Senile cataract", "HBOT"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: allKpis } = await supabase.from('kpis').select('*, kpi_entries(*)');
    if (allKpis) setGroupKpis(allKpis.filter((k: any) => k.departments_id === null));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentStrategic = strategicGoals.find((g) => g.id === selectedStrategic);
  const isDiseaseStrategy = currentStrategic?.name === "Service Excellence";
  const showDiseaseColumn = isDiseaseStrategy && selectedDisease === "ทั้งหมด";

  if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

  return (
   <div className="space-y-6 mt-8 animate-in fade-in duration-500">
    {/* 1. แถบเลือกยุทธศาสตร์ - ปรับให้ดูเด่นและกระชับ */}
  <div className="flex gap-4">
  {strategicGoals.map((goal) => (
    <button
      key={goal.id}
      onClick={() => { setSelectedStrategic(goal.id); }}
      className={`flex-1 px-4 py-3 rounded-lg border font-bold text-center transition-all ${
        selectedStrategic === goal.id 
          ? "bg-purple-600 text-white border-purple-600" 
          : "bg-white text-gray-700 hover:bg-purple-50"
      }`}
    >
      {goal.name}
    </button>
  ))}
</div>

      {/* 2. เนื้อหาหลัก */}
    {!selectedKpi && (
      <div className="space-y-4">
        {/* กลยุทธ์ : ขยับขึ้นมาให้ชิดกับแถบเลือกยุทธศาสตร์ เพื่อความเป็นเอกภาพ */}
        <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100">
          <p className="text-purple-900 font-bold text-lg">
            {currentStrategic?.description}
          </p>
        </div>

          {/* ฟิลเตอร์กลุ่มโรค - จัดตำแหน่งให้อยู่ในระนาบเดียวกับตาราง */}
        {isDiseaseStrategy && (
          <div className="flex flex-wrap gap-2">
            {diseaseList.map((disease) => (
              <button key={disease} onClick={() => setSelectedDisease(disease)} 
                className={`px-4 py-1.5 text-xs rounded-full border transition-all font-medium ${
                  selectedDisease === disease 
                    ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                }`}>
                {disease}
              </button>
            ))}
          </div>
        )}

          {/* ตารางข้อมูล */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    {showDiseaseColumn && <th className="p-4">โรค</th>}
                    <th className="p-4">ตัวชี้วัด (KPI)</th>
                    <th className="p-4 text-center">Goal</th>
                    {[2565, 2566, 2567, 2568, 2569].map(y => <th key={y} className="p-4 text-center">{y}</th>)}
                    <th className="p-4 text-center">Trend</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupKpis.filter((k: any) => k.strategic_id === selectedStrategic && (selectedDisease === "ทั้งหมด" || k.disease_name === selectedDisease)).map((kpi: any) => (
                    <tr key={kpi.id} className="hover:bg-gray-50 transition-colors text-sm">
                      {showDiseaseColumn && <td className="p-4 text-gray-600">{kpi.disease_name || "-"}</td>}
                      <td className="p-4 font-medium text-gray-900">{kpi.name}</td>
                      <td className="p-4 text-center font-bold text-gray-700">{kpi.operator} {kpi.target_value}</td>
                      {[2565, 2566, 2567, 2568, 2569].map((year) => {
                            const avg = calculateYearlyAverage(kpi.kpi_entries || [], year, kpi.Type);
                            // ตรวจสอบว่า avg เป็นค่าว่าง, "-", หรือ null
                            const hasData = avg !== null && avg !== "-" && avg !== ""; 
                            const pass = hasData ? checkStatus(Number(avg), kpi.target_value, kpi.operator) : false;

                            return (
                                <td key={year} className="p-4 text-center">
                                {hasData ? (
                                    <span className={`px-2 py-1 rounded-md font-bold text-xs ${pass ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {avg}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">ไม่มีข้อมูล</span>
                                )}
                                </td>
                            );
                            })}
                            <td className="p-4 text-center text-sm text-gray-600">{getYearlyTrend(kpi.kpi_entries || [], kpi.Type)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedKpi(kpi)} className={getButtonStyle(kpi.kpi_entries || [], 'monthly')}>เพิ่ม</button>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2.2 หน้ากราฟ (เพิ่ม relative class ที่นี่ เพื่อไม่ให้ Goal box หลุดตำแหน่ง) */}
      {selectedKpi && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border relative">
            <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold text-sm">← ย้อนกลับ</button>
            <div className="absolute top-4 right-4 bg-red-50 border border-red-100 p-2 rounded-xl">
                <span className="text-[10px] text-red-600 font-bold uppercase">Goal</span>
                <span className="text-[10px] font-black text-red-700">{selectedKpi.operator} {selectedKpi.target_value}</span>
            </div>
            <h3 className="font-bold text-lg mb-6">{selectedKpi.name}</h3>
            <ResponsiveContainer height={250} width="100%">
              <BarChart data={[2565, 2566, 2567, 2568, 2569].map(y => ({ year: y, v: parseFloat(calculateYearlyAverage(selectedKpi.kpi_entries || [], y, selectedKpi.Type)) || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="v" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={selectedKpi.target_value} stroke="red" strokeDasharray="4 4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded-2xl border">
            <h3 className="font-bold mb-4">บันทึกข้อมูลผลงาน</h3>
            <AddEntryForm 
                kpiId={selectedKpi.id} 
                type={selectedKpi.type} 
                // ไม่ต้องใส่ deptId แล้ว หรือถ้าอยากใส่ให้ชัดเจนให้ใส่ deptId={null as any}
                onSuccess={() => { /* logic */ }}
              />
          </div>
        </div>
      )}
    </div>
  );
}