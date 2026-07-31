// app/dashboard/category/CategoryClient.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AddEntryForm from '@/components/AddEntryForm'; 
import { calculateYearlySummary, checkStatus, getYearlyTrend, getButtonStyle } from '@/utils/kpiCalculations';

export default function CategoryClient({ category }: { category: string }) {
  const supabase = createClient();
  const [kpis, setKpis] = useState<any[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 📌 เพิ่ม State สำหรับจัดการ Modal รายละเอียดรายเดือน
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ kpi: any; year: number; entries: any[] } | null>(null);

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

      const { data: allKpis, error: kpiError } = await supabase
        .from('kpis')
        .select('*, kpi_entries(*)')
        .eq('category', category);
      
      if (kpiError) {
        console.error("Error fetching KPIs by category:", kpiError.message);
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

            const deptIds = deptsInGroup ? deptsInGroup.map(d => d.id) : [];
            filtered = allKpis.filter((k: any) => deptIds.includes(k.departments_id));
          }
          else if (role === 'admin' || role === 'head_nurse') {
            filtered = allKpis;
          }
        } else {
          filtered = allKpis;
        }

        setKpis(filtered);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [category, supabase]);

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

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {!selectedKpi ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              ตัวชี้วัด: <span className="text-purple-600">{category}</span>
            </h2>
            <span className="text-sm text-gray-400">แสดงผลข้อมูลย้อนหลัง 5 ปี</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="p-4 text-gray-600 text-sm font-bold min-w-[200px]">ตัวชี้วัด (KPI)</th>
                  <th className="p-4 text-center text-gray-600 text-sm font-bold">Goal</th>
                  {[2565, 2566, 2567, 2568, 2569].map(y => (
                    <th key={y} className="p-4 text-center text-gray-600 text-sm font-bold">{y}</th>
                  ))}
                  <th className="p-4 text-center text-gray-600 text-sm font-bold">TREND</th>
                  <th className="p-4 text-center text-gray-600 text-sm font-bold">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kpis.map((kpi: any) => (
                  <tr key={kpi.id} className="hover:bg-purple-50/30 transition-all">
                    <td className="p-4 text-gray-700 font-medium">{kpi.name}</td>
                    <td className="p-4 text-center text-sm font-bold text-gray-500">
                      {kpi.operator} {kpi.target_value}
                    </td>
                    {[2565, 2566, 2567, 2568, 2569].map((year) => {
                      const avg = calculateYearlySummary(kpi.kpi_entries || [], year, kpi.Type);
                      const hasData = avg !== null && avg !== "-" && avg !== ""; 
                      const pass = hasData ? checkStatus(Number(avg), kpi.target_value, kpi.operator) : false;

                      return (
                        <td key={year} className="p-4 text-center">
                          {hasData ? (
                            /* 📌 เพิ่ม onClick และเปลี่ยนสไตล์ให้รู้ว่ากดได้แบบเดียวกับหน้า Strategy */
                            <span 
                              onClick={() => handleOpenDetail(kpi, year)}
                              className={`px-2.5 py-1 rounded-md font-bold text-sm cursor-pointer hover:opacity-80 transition-all inline-block border ${
                                pass ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                              }`}
                              title="คลิกเพื่อดูรายละเอียดรายเดือน"
                            >
                              {avg}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 italic">ไม่มีข้อมูล</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center text-lg">{getYearlyTrend(kpi.kpi_entries || [], kpi.Type)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedKpi(kpi)} className={getButtonStyle(kpi.kpi_entries || [], 'monthly')}>เพิ่ม</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
            <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold text-sm">← ย้อนกลับ</button>
            <div className="absolute top-4 right-4 bg-red-50 border border-red-100 p-2 rounded-xl">
                <span className="text-[10px] text-red-600 font-bold uppercase">Goal</span>
                <span className="text-[10px] font-black text-red-700">{selectedKpi.operator} {selectedKpi.target_value}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-6">{selectedKpi.name}</h3>
            <ResponsiveContainer height={250} width="100%">
              <BarChart data={[2565, 2566, 2567, 2568, 2569].map(y => ({
                year: y,
                value: parseFloat(calculateYearlySummary(selectedKpi.kpi_entries || [], y, selectedKpi.Type).toString()) || 0
              }))}>
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={40} />
                <ReferenceLine y={selectedKpi.target_value} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Target', position: 'insideTopRight', fill: '#f87171', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">บันทึกผลการดำเนินงาน</h3>
            <AddEntryForm kpiId={selectedKpi.id} type={selectedKpi.Type} onSuccess={() => { setSelectedKpi(null); fetchData(); }} />
          </div>
        </div>
      )}

      {/* 📌 Modal สำหรับแสดงรายละเอียดรายเดือน (พร้อมปุ่มลบ/จัดการข้อมูลที่ผิดพลาด) */}
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
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalData.entries.length > 0 ? (
                    modalData.entries.map((entry: any, index: number) => (
                      <tr key={entry.id || index} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800">{entry.month}</td>
                        {modalData.kpi.Type !== 'count' && (
                          <>
                            <td className="p-3 text-center text-gray-600">{entry.numerator ?? '-'}</td>
                            <td className="p-3 text-center text-gray-600">{entry.denominator ?? '-'}</td>
                          </>
                        )}
                        <td className="p-3 text-center font-bold text-purple-600">{entry.result ?? entry.value ?? '-'}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={async () => {
                              if (confirm(`คุณต้องการลบข้อมูลผลงานเดือน ${entry.month} ปี ${modalData.year} ใช่หรือไม่?`)) {
                                const { error } = await supabase.from('kpi_entries').delete().eq('id', entry.id);
                                if (!error) {
                                  fetchData();
                                  setIsDetailModalOpen(false);
                                } else {
                                  alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message);
                                }
                              }
                            }}
                            className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition-all"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 italic">
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