'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm';
import { calculateYearlySummary, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations';

export default function Strategic() {
  const supabase = createClient();
  const [selectedStrategic, setSelectedStrategic] = useState<string | null>('1');
  const [selectedDisease, setSelectedDisease] = useState("ทั้งหมด");
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [groupKpis, setGroupKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📌 เพิ่ม State สำหรับจัดการ Modal รายละเอียดรายเดือน
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ kpi: any; year: number; entries: any[] } | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      let userProfile = null;

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, departments(group)')
          .eq('id', user.id)
          .maybeSingle();
        userProfile = data;
      }

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

          if (role === 'staff' || role === 'head_department') {
            filtered = allKpis.filter((k: any) => k.departments_id === userDeptId);
          } 
          else if (role === 'head_group' && userGroup) {
            const { data: deptsInGroup } = await supabase
              .from('departments')
              .select('id')
              .eq('group', userGroup);

            const deptIds = deptsInGroup ? deptsInGroup.map((d: any) => d.id) : [];
            filtered = allKpis.filter((k: any) => deptIds.includes(k.departments_id));
          }
          else if (role === 'admin' || role === 'head_nurse') {
            filtered = allKpis;
          }
        } else {
          filtered = allKpis;
        }

        setGroupKpis(filtered);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 📌 ฟังก์ชันเปิด Modal และกรองข้อมูลรายเดือนตามปีที่คลิก
  const handleOpenDetail = (kpi: any, year: number) => {
    const entries = kpi.kpi_entries || [];
    const filteredEntries = entries.filter((entry: any) => Number(entry.year) === Number(year));
    setModalData({ kpi, year, entries: filteredEntries });
    setIsDetailModalOpen(true);
  };

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
                          const avg = calculateYearlySummary(kpi.kpi_entries || [], year, kpi.Type);
                          const hasData = avg !== null && avg !== "-" && avg !== ""; 
                          const pass = hasData ? checkStatus(Number(avg), kpi.target_value, kpi.operator) : false;

                          return (
                            <td key={year} className="p-4 text-center">
                              {hasData ? (
                                /* 📌 เพิ่ม onClick และเปลี่ยนสไตล์ให้รู้ว่ากดได้ */
                                <span 
                                  onClick={() => handleOpenDetail(kpi, year)}
                                  className={`px-2 py-1 rounded-md font-bold text-xs cursor-pointer hover:opacity-80 transition-all inline-block ${
                                    pass ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                                  }`}
                                  title="คลิกเพื่อดูรายละเอียดรายเดือน"
                                >
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
                <BarChart data={[2565, 2566, 2567, 2568, 2569].map(y => ({ 
                  year: y, 
                  v: Number(calculateYearlySummary(selectedKpi.kpi_entries || [], y, selectedKpi.Type)) || 0 
                }))}>
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

      {/* 📌 ส่วน Modal สำหรับแสดงรายละเอียดรายเดือน (ปี, เดือน, ตัวตั้ง, ตัวหาร, ผลลัพธ์) */}
      {isDetailModalOpen && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{modalData.kpi.name}</h3>
                <p className="text-xs text-gray-500 mt-1">ประจำปีพุทธศักราช {modalData.year} (ชนิด KPI: {modalData.kpi.Type})</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500 uppercase bg-gray-50/50">
                    <th className="p-3">เดือน</th>
                    {modalData.kpi.Type !== 'count' && (
                      <>
                        <th className="p-3 text-center">ตัวตั้ง (Numerator)</th>
                        <th className="p-3 text-center">ตัวหาร (Denominator)</th>
                      </>
                    )}
                    <th className="p-3 text-center">ผลลัพธ์ (Result)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalData.entries.length > 0 ? (
                    modalData.entries.map((entry: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800">{entry.month || `เดือนที่ ${index + 1}`}</td>
                        {modalData.kpi.Type !== 'count' && (
                          <>
                            <td className="p-3 text-center text-gray-600">{entry.numerator ?? '-'}</td>
                            <td className="p-3 text-center text-gray-600">{entry.denominator ?? '-'}</td>
                          </>
                        )}
                        <td className="p-3 text-center font-bold text-purple-600">{entry.result ?? entry.value ?? '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                        ยังไม่มีข้อมูลการบันทึกในรายเดือนของปีนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}