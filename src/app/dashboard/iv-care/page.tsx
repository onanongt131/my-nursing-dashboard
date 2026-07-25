'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ThaiMonths = [
  { id: 10, name: 'OCT' }, { id: 11, name: 'NOV' }, { id: 12, name: 'DEC' },
  { id: 1, name: 'JAN' }, { id: 2, name: 'FEB' }, { id: 3, name: 'MAR' },
  { id: 4, name: 'APR' }, { id: 5, name: 'MAY' }, { id: 6, name: 'JUN' },
  { id: 7, name: 'JUL' }, { id: 8, name: 'AUG' }, { id: 9, name: 'SEP' }
];

const AvailableYears = [2569, 2568, 2567, 2566];

export default function IvCarePage() {
  const [activeSubTab, setActiveSubTab] = useState('success');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2568);
  const [departmentsMap, setDepartmentsMap] = useState<{ [key: number]: string }>({});
  const [summaryStats, setSummaryStats] = useState({ success: 0, phlebitis: 0, extravasation: 0, infiltration: 0 });

  // Modal State สำหรับคลิกดูข้ามปีของหน่วยงาน
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDeptModal, setSelectedDeptModal] = useState<{ id: number; name: string } | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchDepartmentsAndData();

    const channel = supabase
      .channel('public:iv_care_data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'iv_care_data' },
        () => {
          fetchDepartmentsAndData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedYear, activeSubTab]);

  const fetchDepartmentsAndData = async () => {
    setLoading(true);

    const { data: deptData } = await supabase.from('departments').select('*');
    const deptMap: { [key: number]: string } = {};
    
    if (deptData) {
      deptData.forEach((d: any) => {
        const deptId = d.id !== undefined ? d.id : d.department_id;
        const deptName = d.Department || d.name || d.department_name || d.title;
        if (deptId !== undefined && deptName) {
          deptMap[Number(deptId)] = deptName;
        }
      });
    }
    setDepartmentsMap(deptMap);

    const { data, error } = await supabase
      .from('iv_care_data')
      .select('*')
      .eq('fiscal_year', selectedYear);

    if (!error && data) {
      processTableData(data, deptMap);
    }
    setLoading(false);
  };

  const getMappedDepartmentName = (originalName: string, year: number) => {
    if (year === 2566 || year === 2567 || year === 2568) {
      if (originalName === 'อายุรกรรม 4') return 'อายุรกรรมชาย 1';
      if (originalName === 'อายุรกรรม 2') return 'อายุรกรรมชาย 2';
      if (originalName === 'อายุรกรรม 5') return 'อายุรกรรมหญิง';
      if (originalName === 'อายุรกรรม 6') return 'ร่มไทร';
    }
    return originalName;
  };

  const processTableData = (rawData: any[], deptMap: { [key: number]: string }) => {
    const grouped: { [key: number]: any } = {};

    rawData.forEach(row => {
      const deptId = Number(row.department_id);
      const rawDeptName = deptMap[deptId] || `หน่วยงาน ${deptId}`;
      const departmentName = getMappedDepartmentName(rawDeptName, selectedYear);

      if (!grouped[deptId]) {
        grouped[deptId] = { 
          department_id: deptId,
          department_name: departmentName,
          raw_name: rawDeptName
        };
        ThaiMonths.forEach(m => { grouped[deptId][m.id] = null; });
      }

      let calculatedValue = 0;
      const ivPos = Number(row.iv_position) || 0;

      if (activeSubTab === 'success') {
        const allIv = Number(row.all_iv_insertion) || 0;
        const firstIv = Number(row.first_iv_insertion) || 0;
        calculatedValue = allIv > 0 ? (firstIv / allIv) * 100 : 0;
      } else if (activeSubTab === 'phlebitis') {
        const p3 = Number(row.phlebitis_3) || 0;
        const p4 = Number(row.phlebitis_4) || 0;
        calculatedValue = ivPos > 0 ? ((p3 + p4) / ivPos) * 100 : 0;
      } else if (activeSubTab === 'extravasation') {
        const e1 = Number(row.extravasation_1) || 0;
        const e2 = Number(row.extravasation_2) || 0;
        const e3 = Number(row.extravasation_3) || 0;
        const e4 = Number(row.extravasation_4) || 0;
        calculatedValue = ivPos > 0 ? ((e1 + e2 + e3 + e4) / ivPos) * 100 : 0;
      } else if (activeSubTab === 'infiltration') {
        const i1 = Number(row.infiltration_1) || 0;
        const i2 = Number(row.infiltration_2) || 0;
        const i3 = Number(row.infiltration_3) || 0;
        const i4 = Number(row.infiltration_4) || 0;
        calculatedValue = ivPos > 0 ? ((i1 + i2 + i3 + i4) / ivPos) * 100 : 0;
      }

      grouped[deptId][row.month] = calculatedValue;
    });

    const result = Object.values(grouped).map((dept: any) => {
      let sum = 0;
      let count = 0;

      ThaiMonths.forEach(m => {
        const val = dept[m.id];
        if (val !== null && val !== undefined) {
          let shouldInclude = true;

          if (selectedYear === 2569 && dept.raw_name === 'อายุรกรรม 3') {
            if (m.id === 10 || m.id === 11 || m.id === 12 || m.id === 1 || m.id === 2) {
              shouldInclude = false;
            }
          }

          if (selectedYear === 2569 && dept.raw_name === 'อายุรกรรม 7') {
            if (m.id === 10 || m.id === 11 || m.id === 12 || m.id === 1 || m.id === 2 || m.id === 3) {
              shouldInclude = false;
            }
          }

          if (shouldInclude) {
            sum += val;
            count++;
          }
        }
      });

      dept.average = count > 0 ? (sum / count).toFixed(2) : '0.00';
      return dept;
    });

    result.sort((a, b) => a.department_id - b.department_id);
    setTableData(result);
    calculateOverallStats(rawData);
  };

  const calculateOverallStats = (rawData: any[]) => {
    let totalSuccess = 0, countSuccess = 0;
    let totalPhlebitis = 0, totalExtravasation = 0, totalInfiltration = 0;
    let totalIvPos = 0;

    rawData.forEach(row => {
      const ivPos = Number(row.iv_position) || 0;
      totalIvPos += ivPos;

      const allIv = Number(row.all_iv_insertion) || 0;
      const firstIv = Number(row.first_iv_insertion) || 0;
      if (allIv > 0) {
        totalSuccess += (firstIv / allIv) * 100;
        countSuccess++;
      }

      totalPhlebitis += (Number(row.phlebitis_3) || 0) + (Number(row.phlebitis_4) || 0);
      totalExtravasation += (Number(row.extravasation_1) || 0) + (Number(row.extravasation_2) || 0) + (Number(row.extravasation_3) || 0) + (Number(row.extravasation_4) || 0);
      totalInfiltration += (Number(row.infiltration_1) || 0) + (Number(row.infiltration_2) || 0) + (Number(row.infiltration_3) || 0) + (Number(row.infiltration_4) || 0);
    });

    setSummaryStats({
      success: countSuccess > 0 ? Number((totalSuccess / countSuccess).toFixed(2)) : 0,
      phlebitis: totalIvPos > 0 ? Number(((totalPhlebitis / totalIvPos) * 100).toFixed(2)) : 0,
      extravasation: totalIvPos > 0 ? Number(((totalExtravasation / totalIvPos) * 100).toFixed(2)) : 0,
      infiltration: totalIvPos > 0 ? Number(((totalInfiltration / totalIvPos) * 100).toFixed(2)) : 0,
    });
  };

  // ฟังก์ชันคลิกชื่อหน่วยงานเพื่อเปิด Modal ดูข้อมูลย้อนหลัง
  const handleDepartmentClick = async (deptId: number, deptName: string) => {
    setSelectedDeptModal({ id: deptId, name: deptName });
    setModalOpen(true);
    setLoadingHistory(true);

    const { data, error } = await supabase
      .from('iv_care_data')
      .select('*')
      .eq('department_id', deptId);

    if (!error && data) {
      const yearMap: { [year: number]: { sum: number; count: number; rawData: any[] } } = {};

      AvailableYears.forEach(y => {
        yearMap[y] = { sum: 0, count: 0, rawData: [] };
      });

      data.forEach(row => {
        const y = Number(row.fiscal_year);
        if (yearMap[y]) {
          let val = 0;
          const ivPos = Number(row.iv_position) || 0;

          if (activeSubTab === 'success') {
            const allIv = Number(row.all_iv_insertion) || 0;
            const firstIv = Number(row.first_iv_insertion) || 0;
            val = allIv > 0 ? (firstIv / allIv) * 100 : 0;
          } else if (activeSubTab === 'phlebitis') {
            const p3 = Number(row.phlebitis_3) || 0;
            const p4 = Number(row.phlebitis_4) || 0;
            val = ivPos > 0 ? ((p3 + p4) / ivPos) * 100 : 0;
          } else if (activeSubTab === 'extravasation') {
            const e1 = Number(row.extravasation_1) || 0;
            const e2 = Number(row.extravasation_2) || 0;
            const e3 = Number(row.extravasation_3) || 0;
            const e4 = Number(row.extravasation_4) || 0;
            val = ivPos > 0 ? ((e1 + e2 + e3 + e4) / ivPos) * 100 : 0;
          } else if (activeSubTab === 'infiltration') {
            const i1 = Number(row.infiltration_1) || 0;
            const i2 = Number(row.infiltration_2) || 0;
            const i3 = Number(row.infiltration_3) || 0;
            const i4 = Number(row.infiltration_4) || 0;
            val = ivPos > 0 ? ((i1 + i2 + i3 + i4) / ivPos) * 100 : 0;
          }

          yearMap[y].sum += val;
          yearMap[y].count++;
        }
      });

      const historyResult = AvailableYears.map(y => {
        const info = yearMap[y];
        const avg = info.count > 0 ? (info.sum / info.count).toFixed(2) : null;
        return {
          year: y,
          average: avg
        };
      });

      setHistoricalData(historyResult);
    }
    setLoadingHistory(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/35 min-h-screen rounded-2xl shadow-sm border border-gray-100 m-4">
      {/* ส่วนหัวข้อและตัวเลือกปีงบประมาณ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">รายงาน IV Care</h1>
          <p className="text-sm text-gray-500 mt-0.5">ระบบติดตามตัวชี้วัดคุณภาพการให้สารน้ำหลอดเลือดดำ</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 p-2.5 rounded-xl border border-gray-200">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap pl-2">📅 ปีงบประมาณ:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-blue-300 rounded-xl px-4 py-2 text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm w-full sm:w-48 cursor-pointer transition-all hover:border-blue-400"
          >
            <option value={2566}>ปีงบประมาณ 2566</option>
            <option value={2567}>ปีงบประมาณ 2567</option>
            <option value={2568}>ปีงบประมาณ 2568</option>
            <option value={2569}>ปีงบประมาณ 2569</option>
          </select>
        </div>
      </div>

      {/* แท็บย่อยแบบการ์ด 4 ช่อง */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'success', label: 'ความสำเร็จของการให้สารน้ำ' },
            { key: 'phlebitis', label: 'Phlebitis' },
            { key: 'extravasation', label: 'Extravasation' },
            { key: 'infiltration', label: 'Infiltration' },
          ].map(tab => {
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 flex items-center justify-center shadow-xs cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200 scale-[1.02]' 
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm leading-snug">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* กล่องสรุปผล */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
            <span className="text-xs text-blue-600 font-semibold block">ภาพรวมความสำเร็จฯ</span>
            <span className="text-lg font-bold text-blue-800">{summaryStats.success}%</span>
          </div>
          <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-center">
            <span className="text-xs text-rose-600 font-semibold block">ภาพรวม Phlebitis</span>
            <span className="text-lg font-bold text-rose-800">{summaryStats.phlebitis}%</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-center">
            <span className="text-xs text-amber-600 font-semibold block">ภาพรวม Extravasation</span>
            <span className="text-lg font-bold text-amber-800">{summaryStats.extravasation}%</span>
          </div>
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 text-center">
            <span className="text-xs text-purple-600 font-semibold block">ภาพรวม Infiltration</span>
            <span className="text-lg font-bold text-purple-800">{summaryStats.infiltration}%</span>
          </div>
        </div>
      </div>

      {/* ตารางแสดงผล */}
      <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">ชื่อหน่วยงาน</th>
              {ThaiMonths.map(m => (
                <th key={m.id} className="px-2 py-3.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">{m.name}</th>
              ))}
              <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider bg-gray-100">ค่าเฉลี่ย</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={14} className="text-center py-10 text-gray-500 font-medium">กำลังโหลดข้อมูล...</td></tr>
            ) : tableData.length === 0 ? (
              <tr><td colSpan={14} className="text-center py-10 text-gray-500 font-medium">ไม่มีข้อมูลในปีงบประมาณนี้</td></tr>
            ) : (
              tableData.map((row, idx) => {
                const avgNum = Number(row.average);
                let avgColorClass = "text-blue-700";
                
                if (activeSubTab === 'success') {
                  if (avgNum < 80) {
                    avgColorClass = "text-red-600";
                  }
                } else {
                  if (avgNum > 0) {
                    avgColorClass = "text-red-600";
                  }
                }

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-sm border-r border-gray-200 font-bold bg-gray-50/30">
                      <button 
                        onClick={() => handleDepartmentClick(row.department_id, row.department_name)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🏢</span>
                        <span>{row.department_name}</span>
                      </button>
                    </td>
                    {ThaiMonths.map(m => {
                      const val = row[m.id];
                      let badgeClass = "text-gray-400 text-xs";
                      let displayText = "ไม่มีข้อมูล";

                      if (val !== null && val !== undefined) {
                        displayText = Number(val).toFixed(1);
                        if (activeSubTab === 'success') {
                          if (val > 100) {
                            badgeClass = "bg-purple-600 text-white border border-purple-700 font-extrabold px-2.5 py-1 rounded-md text-xs inline-block shadow-md animate-pulse";
                          } else if (val < 80) {
                            badgeClass = "bg-red-50 text-red-600 border border-red-200 font-semibold px-2.5 py-1 rounded-md text-xs inline-block shadow-2xs";
                          } else {
                            badgeClass = "bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold px-2.5 py-1 rounded-md text-xs inline-block shadow-2xs";
                          }
                        } else {
                          badgeClass = val > 0 
                            ? "bg-red-50 text-red-600 border border-red-200 font-semibold px-2.5 py-1 rounded-md text-xs inline-block shadow-2xs" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold px-2.5 py-1 rounded-md text-xs inline-block shadow-2xs";
                        }
                      }

                      return (
                        <td key={m.id} className="px-2 py-3 text-sm text-center border-r border-gray-200">
                          <span className={badgeClass}>{displayText}</span>
                        </td>
                      );
                    })}
                    <td className={`px-4 py-3 text-sm text-center font-extrabold bg-blue-50/30 ${avgColorClass}`}>
                      {row.average}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal แสดงผลประวัติย้อนหลังรายปีเมื่อคลิกชื่อหน่วยงาน */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-lg">สถิติย้อนหลังรายปี</h3>
                <p className="text-xs text-blue-100 opacity-90">{selectedDeptModal?.name}</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="bg-blue-700/60 hover:bg-blue-700 text-white rounded-full p-1.5 w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {loadingHistory ? (
                <div className="py-12 text-center text-gray-500 font-medium">กำลังโหลดข้ามปี...</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    เรียงข้อมูลปีย้อนหลัง (ปีปัจจุบัน ถึง อดีต) - แท็บ: {activeSubTab}
                  </div>
                  {historicalData.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center bg-gray-50 hover:bg-blue-50/50 p-4 rounded-xl border border-gray-200/80 transition-all"
                    >
                      <span className="font-bold text-gray-700 text-sm">
                        ปีงบประมาณ {item.year}
                      </span>
                      <span className={`font-extrabold text-base ${item.average !== null ? (Number(item.average) < 80 && activeSubTab === 'success' ? 'text-red-600' : 'text-blue-600') : 'text-gray-400'}`}>
                        {item.average !== null ? `${item.average}` : 'ไม่มีข้อมูล'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-3.5 flex justify-end border-t border-gray-100">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer"
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