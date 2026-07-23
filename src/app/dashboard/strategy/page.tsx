'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import { calculateYearlyAverage, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations';
import ThreePForm from '@/components/ThreePForm';

export default function Strategic() {
  const supabase = createClient();
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
    try {
      // 1. ดึงข้อมูล User ปัจจุบัน
      const { data: { user } } = await supabase.auth.getUser();
      let userProfile = null;

      if (user) {
        // ใช้ .maybeSingle() แทน .single() เพื่อป้องกัน Error กรณีไม่พบแถวข้อมูล
        const { data } = await supabase
          .from('profiles')
          .select('*, departments(group)')
          .eq('id', user.id)
          .maybeSingle();
        userProfile = data;
      }

      // 2. ดึงข้อมูล KPIs ทั้งหมด
      const { data: allKpis, error: kpiError } = await supabase.from('kpis').select('*, kpi_entries(*)');
      
      if (kpiError) {
        console.error("Error fetching KPIs:", kpiError.message);
      }

      if (allKpis) {
        let filtered = allKpis.filter((k: any) => k.departments_id === null);

        if (userProfile && userProfile.role) {
          const role = userProfile.role;
          const userDeptId = userProfile.department_id;
          const userGroup = (userProfile.departments as any)?.group;

          if (role === 'staff') {
            filtered = allKpis.filter((k: any) => k.departments_id === userDeptId);
          } 
          else if (role === 'head_department') {
            filtered = allKpis.filter((k: any) => k.departments_id === userDeptId);
          } 
          else if (role === 'head_group' && userGroup) {
            const { data: deptsInGroup } = await supabase
              .from('departments')
              .select('id')
              .eq('group', userGroup);

            const deptIds = deptsInGroup ? deptsInGroup.map(d => d.id) : [];
            filtered = allKpis.filter((k: any) => deptIds.includes(k.departments_id));
          }
          else if (role === 'admin' || role === 'head_nurse') {
            // Admin หรือ Head Nurse เห็นทั้งหมด
            filtered = allKpis;
          }
        } else {
          // ถ้าไม่มี profile หรือ role ให้แสดงทั้งหมดเป็นค่าเริ่มต้นกันหน้าค้าง
          filtered = allKpis;
        }

        setGroupKpis(filtered);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      // บังคับให้ปิดสถานะ Loading เสมอ ไม่ว่าจะสำเร็จหรือพัง
      setLoading(false);
    }
  }, []);

  // 👈 เพิ่ม useEffect ตรงนี้เพื่อให้มันเริ่มดึงข้อมูลทันทีที่เปิดหน้าเว็บ
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentStrategic = strategicGoals.find((g) => g.id === selectedStrategic);
  const isDiseaseStrategy = currentStrategic?.name === "Service Excellence";
  const showDiseaseColumn = isDiseaseStrategy && selectedDisease === "ทั้งหมด";

  if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6 mt-6 animate-in fade-in duration-500">
      {/* 1. แถบเลือกยุทธศาสตร์ */}
      <div className="flex gap-2">
        {strategicGoals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => { 
              setSelectedStrategic(goal.id);
              setSelectedKpi(null); 
            }}
            className={`flex-1 px-2 py-3 rounded-xl border font-bold text-center transition-all ${
              selectedStrategic === goal.id 
                ? "bg-purple-400 text-white border-purple-600" 
                : "bg-white text-gray-700 hover:bg-purple-50"
            }`}
          >
            {goal.name}
          </button>
        ))}
      </div>

      {/* 2. เนื้อหาหลัก (แสดงเมื่อไม่ได้เลือก KPI) */}
      {!selectedKpi && (
        <div className="space-y-4">
          <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100">
            <p className="text-purple-600 font-bold text-lg">
              {currentStrategic?.description}
            </p>
          </div>

          {isDiseaseStrategy && (
            <div className="flex flex-wrap gap-2">
              {diseaseList.map((disease) => (
                <button 
                  key={disease} 
                  onClick={() => {
                    setSelectedDisease(disease);
                    setSelectedKpi(null); 
                  }} 
                  className={`px-4 py-1.5 text-xs rounded-full border transition-all font-medium ${
                    selectedDisease === disease 
                      ? "bg-blue-500 text-white border-blue-600 shadow-md" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {disease}
                </button>
              ))}
            </div>
          )}

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
                  {groupKpis
                    .filter((k: any) => {
                      const matchStrategic = String(k.strategic_id) === String(selectedStrategic);
                      const matchDisease = !isDiseaseStrategy || selectedDisease === "ทั้งหมด" || k.disease_name === selectedDisease;
                      return matchStrategic && matchDisease;
                    })
                    .map((kpi: any) => (
                      <tr key={kpi.id} className="hover:bg-gray-50 transition-colors text-sm">
                        {showDiseaseColumn && <td className="p-4 text-gray-600">{kpi.disease_name || "-"}</td>}
                        <td className="p-4 font-medium text-gray-900">{kpi.name}</td>
                        <td className="p-4 text-center font-bold text-gray-700">{kpi.operator} {kpi.target_value}</td>
                        {[2565, 2566, 2567, 2568, 2569].map((year) => {
                          const avg = calculateYearlyAverage(kpi.kpi_entries || [], year, kpi.Type);
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

      {/* 2.2 หน้ากราฟและฟอร์ม (แสดงเมื่อเลือก KPI แล้ว) */}
      {selectedKpi && (
        <div className="space-y-8">
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
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6">บันทึกผลการดำเนินงาน</h3>
              <AddEntryForm kpiId={selectedKpi.id} type={selectedKpi.Type} onSuccess={() => { setSelectedKpi(null); fetchData(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}