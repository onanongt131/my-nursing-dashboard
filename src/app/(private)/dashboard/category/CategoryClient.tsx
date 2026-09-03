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
  
  // 📌 State สำหรับ Modal บันทึก Action Note (คอลัมน์ I)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [currentActionKpi, setCurrentActionKpi] = useState<any | null>(null);
  const [actionNoteText, setActionNoteText] = useState("");
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [editingComparisonId, setEditingComparisonId] = useState<string | null>(null);
  const [tempComparisonValue, setTempComparisonValue] = useState("");

  // 📌 State สำหรับจัดการ Modal รายละเอียดรายเดือน
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

            const deptIds = deptsInGroup ? deptsInGroup.map((d: any) => d.id) : [];
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

  const handleSaveActionNote = async () => {
    if (!currentActionKpi) return;
    setIsSavingAction(true);

    try {
      const { data, error } = await supabase
        .from('kpis')
        .update({ action_note: actionNoteText })
        .eq('id', currentActionKpi.id)
        .select();

      if (error) {
        console.error('Supabase Update Error:', error);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
      } else if (!data || data.length === 0) {
        alert('⚠️ บันทึกไม่สำเร็จ: ไม่พบแถวที่ถูกอัปเดต (อาจติดสิทธิ์ RLS ใน Supabase)');
      } else {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
        setIsActionModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleSaveComparison = async (kpiId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('kpis')
      .update({ comparison: tempComparisonValue })
      .eq('id', kpiId);

    if (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
    } else {
      setEditingComparisonId(null);
      fetchData(); // เปลี่ยนจากการรีเฟรชหน้าจอทั้งหน้า มาเป็นการเรียก fetchData() แทนเพื่อให้ไหลลื่นขึ้น
    }
  };

  const handleOpenDetail = (kpi: any, year: number) => {
    const entries = kpi.kpi_entries || [];
    const filteredEntries = entries.filter((entry: any) => Number(entry.year) === Number(year));
    setModalData({ kpi, year, entries: filteredEntries });
    setIsDetailModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

  return (
    // กำหนดให้กล่องหลักมีความสูงเต็มพื้นที่พอดี และซ่อน Scroll ของหน้าจอหลัก
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden">
      {!selectedKpi ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
          
          {/* ส่วนหัวตาราง (อยู่นิ่ง ไม่เลื่อนหนี) */}
          <div className="p-5 border-b border-gray-50 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-gray-800">
              ตัวชี้วัด: <span className="text-purple-600">{category}</span>
            </h2>
            <span className="text-xs text-gray-400">แสดงผลข้อมูลย้อนหลัง 5 ปี</span>
          </div>
          
          {/* ส่วนตารางข้อมูล: กำหนดให้เลื่อนได้ทั้งแนวตั้งและแนวนอนเฉพาะในกรอบนี้ */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-xs">
                <tr>
                  <th className="p-3.5 text-gray-600 text-xs font-bold min-w-[200px]">ตัวชี้วัด (KPI)</th>
                  <th className="p-3.5 text-center text-gray-600 text-xs font-bold">Goal</th>
                  {[2565, 2566, 2567, 2568, 2569].map(y => (
                    <th key={y} className="p-3.5 text-center text-gray-600 text-xs font-bold">{y}</th>
                  ))}
                  <th className="p-3.5 text-center text-gray-600 text-xs font-bold">Le</th>
                  <th className="p-3.5 text-center text-gray-600 text-xs font-bold">T</th>
                  <th className="p-3.5 text-center text-gray-600 text-xs font-bold">C</th>
                  <th className="p-3.5 text-center text-gray-600 text-xs font-bold">I</th>
                  <th className="p-3.5 text-center text-gray-600 text-xs font-bold">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {kpis.map((kpi: any) => (
                  <tr key={kpi.id} className="hover:bg-purple-50/30 transition-all">
                    <td className="p-3.5 text-gray-700 font-medium">{kpi.name}</td>
                    <td className="p-3.5 text-center font-medium text-gray-700">
                      <span className="inline-flex items-center gap-1 justify-center">
                        {/* แสดง operator ก็ต่อเมื่อมีค่าและไม่ใช่ค่าว่าง */}
                        {kpi.operator && kpi.operator.trim() !== "" && (
                          <span>{kpi.operator}</span>
                        )}
                        <span>{kpi.target_value}</span>
                      </span>
                    </td>
                    {[2565, 2566, 2567, 2568, 2569].map((year) => {
                      const avg = calculateYearlySummary(kpi.kpi_entries || [], year, kpi.Type);
                      const hasData = avg !== null && avg !== "-" && avg !== ""; 
                      const pass = hasData ? checkStatus(Number(avg), kpi.target_value, kpi.operator) : false;

                      return (
                        <td key={year} className="p-3.5 text-center">
                          {hasData ? (
                            <span 
                              onClick={() => handleOpenDetail(kpi, year)}
                              className={`px-2 py-0.5 rounded-md font-bold text-xs cursor-pointer hover:opacity-80 transition-all inline-block border ${
                                pass ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                              }`}
                              title="คลิกเพื่อดูรายละเอียดรายเดือน"
                            >
                              {avg}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-300 italic">ไม่มีข้อมูล</span>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="p-3.5 text-center">
                      {(() => {
                        const latestYear = 2569;
                        const avg = calculateYearlySummary(kpi.kpi_entries || [], latestYear, kpi.Type);
                        const hasData = avg !== null && avg !== "-" && avg !== ""; 
                        const pass = hasData ? checkStatus(Number(avg), kpi.target_value, kpi.operator) : false;

                        if (!hasData) {
                          return <span className="text-[11px] text-gray-300 italic">ไม่มีข้อมูล</span>;
                        }

                        return (
                          <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs border ${
                            pass 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {pass ? "Pass" : "Fail"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 text-center text-base">
                      {getYearlyTrend(
                        kpi.kpi_entries || [], 
                        kpi.Type, 
                        kpi.operator, 
                        kpi.target_value, // ส่งค่า target_value เข้าไปให้ฟังก์ชันช่วยวิเคราะห์
                        2569  
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {editingComparisonId === kpi.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="text"
                            value={tempComparisonValue}
                            onChange={(e) => setTempComparisonValue(e.target.value)}
                            className="w-20 px-1.5 py-0.5 border border-purple-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveComparison(kpi.id)}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <span 
                          onClick={() => {
                            setEditingComparisonId(kpi.id);
                            setTempComparisonValue(kpi.comparison || kpi.c || "Goal");
                          }}
                          className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                          title="คลิกเพื่อแก้ไขข้อมูลคู่เทียบ"
                        >
                          {kpi.comparison || kpi.c || "Goal"}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      {kpi.action_note ? (
                        <button
                          onClick={() => {
                            setCurrentActionKpi(kpi);
                            setActionNoteText(kpi.action_note);
                            setIsActionModalOpen(true);
                          }}
                          className="inline-block px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100 cursor-pointer hover:bg-purple-100 transition-all"
                          title={kpi.action_note}
                        >
                          Action
                        </button>
                      ) : (
                        <span 
                          onClick={() => {
                            setCurrentActionKpi(kpi);
                            setActionNoteText("");
                            setIsActionModalOpen(true);
                          }}
                          className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                          title="คลิกเพื่อเพิ่มข้อมูล Action"
                        >
                          None
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <button onClick={() => setSelectedKpi(kpi)} className={getButtonStyle(kpi.kpi_entries || [], 'monthly')}>เพิ่ม</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative h-full overflow-y-auto pr-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative">
            <button onClick={() => setSelectedKpi(null)} className="mb-4 text-purple-600 font-bold text-sm cursor-pointer">← ย้อนกลับ</button>
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

      {/* 📌 Modal สำหรับแสดงรายละเอียดรายเดือน */}
      {isDetailModalOpen && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{modalData.kpi.name}</h3>
                <p className="text-xs text-gray-500 mt-1">ประจำปีพุทธศักราช {modalData.year} (ชนิด KPI: {modalData.kpi.Type})</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 cursor-pointer">✕</button>
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
                            className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition-all cursor-pointer"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 italic">ยังไม่มีข้อมูลการบันทึกในรายเดือนของปีนี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-all cursor-pointer">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* 📌 Modal สำหรับบันทึก Action Note */}
      {isActionModalOpen && currentActionKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">บันทึกการนำไปใช้ประโยชน์ (I)</h3>
                <p className="text-xs text-gray-500 mt-1">ตัวชี้วัด: {currentActionKpi.name}</p>
              </div>
              <button onClick={() => setIsActionModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 cursor-pointer">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">รายละเอียดการนำผลลัพธ์ไปใช้ปรับปรุง / บูรณาการงาน:</label>
                <textarea 
                  rows={4}
                  value={actionNoteText}
                  onChange={(e) => setActionNoteText(e.target.value)}
                  placeholder="เช่น นำผลลัพธ์ไปจัดทำโครงการพัฒนาระบบบริการ... หรือทบทวนในที่ประชุมทีมนำ..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setIsActionModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-all cursor-pointer">ยกเลิก</button>
              <button onClick={handleSaveActionNote} disabled={isSavingAction} className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all shadow-sm disabled:opacity-50 cursor-pointer">
                {isSavingAction ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}