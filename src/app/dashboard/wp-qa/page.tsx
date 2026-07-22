'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Department {
  id: number | string;
  name: string;
}

interface WpRecord {
  fiscal_year: number;
  department_id: number | string;
  month: number;
  name: string;
  wp: number | null;
}

interface TableRow {
  name: string;
  months: (number | string)[];
  average: number | string;
}

export default function WpQaDashboard() {
  const supabase = createClient();
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [summaryPercentage, setSummaryPercentage] = useState<number | string>(0);
  const [passCount, setPassCount] = useState<number>(0);
  const [failCount, setFailCount] = useState<number>(0);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchWpQaData(selectedDept);
  }, [selectedDept]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('id, Department');
      if (error) {
        console.warn("Could not fetch departments table, skipping dropdown list:", error.message);
        return;
      }
      if (data) {
        const excludedDepts = ["IC", "ฝ่ายการพยาบาล", "MICU 3", "ห้องคลอด", "ห้องผ่าตัด", "วิสัญญี", "OPD"];
        const filteredData = data.filter(item => !excludedDepts.includes(item.Department));

        const formattedDepts = filteredData.map(item => ({
          id: item.id,
          name: item.Department 
        }));
        setDepartments(formattedDepts);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchWpQaData = async (deptId: string) => {
    setLoading(true);
    try {
      let query = supabase.from('wp_qa_results').select('*');
      
      if (deptId !== '') {
        query = query.eq('department_id', deptId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      processTableData(data || []);
    } catch (err) {
      console.error("Error fetching WP/QA data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ใช้ตรรกะคำนวณตัวชี้วัดเสมอ (ตามที่ผู้ใช้ต้องการ: "เอาเฉพาะ ร้อยละการปฏิบัติตามแนวทาง WP/QA")
  const processTableData = (rawData: WpRecord[]) => {
    const monthsOrder = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const grouped: { [key: string]: { [month: number]: { sum: number; count: number } } } = {};

    rawData.forEach((item) => {
      if (!grouped[item.name]) {
        grouped[item.name] = {};
      }
      if (!grouped[item.name][item.month]) {
        grouped[item.name][item.month] = { sum: 0, count: 0 };
      }

      const val = item.wp;
      if (val !== undefined && val !== null && val !== ("" as any)) {
        grouped[item.name][item.month].sum += Number(val);
        grouped[item.name][item.month].count += 1;
      }
    });

    let pCount = 0;
    let totalIndicators = 0;

    const formatted: TableRow[] = Object.keys(grouped).map((name) => {
      let totalSumYear = 0;
      let totalCountYear = 0;

      const monthValues = monthsOrder.map((m) => {
        const monthData = grouped[name][m];
        if (monthData && monthData.count > 0) {
          const avgMonthVal = monthData.sum / monthData.count;
          totalSumYear += avgMonthVal;
          totalCountYear += 1;
          return Number(avgMonthVal.toFixed(1));
        }
        return "ไม่มีข้อมูล";
      });

      const average = totalCountYear > 0 ? Number((totalSumYear / totalCountYear).toFixed(1)) : "ไม่มีข้อมูล";

      totalIndicators += 1;
      if (average !== "ไม่มีข้อมูล" && Number(average) >= 90) {
        pCount += 1;
      }

      return {
        name,
        months: monthValues,
        average
      };
    });

    setTableData(formatted);

    const fCount = totalIndicators - pCount;
    setPassCount(pCount);
    setFailCount(fCount);

    if (totalIndicators > 0) {
      const percent = (pCount / totalIndicators) * 100;
      setSummaryPercentage(Number(percent.toFixed(1)));
    } else {
      setSummaryPercentage(0);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">ผลการประเมินแนวทางปฏิบัติ WP/QA</h2>
        
        <div className="flex items-center space-x-3 bg-gray-50/80 px-4 py-2.5 rounded-xl border border-purple-100/60 shadow-xs">
          <label className="text-sm font-semibold text-gray-700">หน่วยงาน:</label>
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="appearance-none bg-white border border-purple-200 hover:border-purple-400 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all cursor-pointer shadow-xs min-w-[240px]"
            >
              <option value="">-- ภาพรวมทั้งหมด (ทุกหน่วยงาน) --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-purple-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="text-sm font-semibold text-gray-700">
          <span>📊 ร้อยละการปฏิบัติตามแนวทาง WP/QA ผ่านเกณฑ์:</span>
        </div>

        <div className="text-sm font-medium text-gray-600 bg-white/60 px-4 py-1.5 rounded-lg border border-purple-100/60 shadow-2xs">
          <span>ผ่าน <strong className="text-emerald-700">{passCount}</strong> ตัวชี้วัด / ไม่ผ่าน <strong className="text-rose-600">{failCount}</strong> ตัวชี้วัด</span>
        </div>

        <div className="px-4 py-1.5 bg-white border border-purple-200 rounded-lg shadow-2xs">
          <span className="text-lg font-bold text-purple-700">{summaryPercentage}%</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-purple-100 rounded-xl shadow-xs">
        <table className="min-w-full border-collapse text-center text-sm table-fixed">
          <thead>
            <tr className="bg-purple-50/40 text-gray-700 border-b border-purple-100/80">
              <th className="p-3.5 text-left border-r border-purple-100/80 font-bold text-gray-800 w-[380px]">ชื่อแนวทาง (WP/QA)</th>
              {['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'].map((m) => (
                <th key={m} className="py-3.5 px-1 border-r border-purple-100/80 font-bold text-purple-900 text-xs w-[62px]">{m}</th>
              ))}
              <th className="py-3.5 px-1 font-bold text-amber-900 w-[72px] bg-amber-50/60 text-xs">เฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="p-6 text-gray-400">กำลังโหลดข้อมูล...</td>
              </tr>
            ) : tableData.length > 0 ? (
              tableData.map((row, index) => {
                const rowBgClass = index % 2 === 0 ? "bg-white" : "bg-purple-50/10";

                let avgStyle = "bg-amber-50/90 text-amber-900 border-amber-200/70";
                if (row.average !== "ไม่มีข้อมูล") {
                  avgStyle = Number(row.average) >= 90
                    ? "bg-amber-50/90 text-emerald-700 border-amber-200/70"
                    : "bg-amber-50/90 text-rose-600 border-amber-200/70";
                } else {
                  avgStyle = "bg-gray-50/60 text-gray-400 border-gray-200/50";
                }

                return (
                  <tr key={index} className={`border-b border-purple-100/60 ${rowBgClass} hover:bg-purple-50/30 transition-colors`}>
                    <td className="p-3.5 text-left border-r border-purple-100/60 font-medium text-gray-800 break-words leading-relaxed">{row.name}</td>
                    
                    {row.months.map((val, idx) => {
                      let badgeStyle = "bg-gray-50/60 text-gray-400 border-gray-200/50 text-[10px] px-1 py-0.5 tracking-tighter";
                      if (val !== "ไม่มีข้อมูล") {
                        badgeStyle = Number(val) >= 90 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs text-xs px-1.5 py-0.5 font-semibold" 
                          : "bg-rose-50 text-rose-700 border-rose-200/80 shadow-2xs text-xs px-1.5 py-0.5 font-semibold";
                      }
                      return (
                        <td key={idx} className="p-1.5 border-r border-purple-100/60">
                          <div className={`inline-block rounded-md border ${badgeStyle}`}>
                            {val !== "ไม่มีข้อมูล" ? Number(val).toFixed(1) : "ไม่มีข้อมูล"}
                          </div>
                        </td>
                      );
                    })}

                    <td className="p-1.5 bg-amber-50/10">
                      <div className={`inline-block rounded-md border text-xs px-1.5 py-0.5 font-bold shadow-2xs ${avgStyle}`}>
                        {row.average !== "ไม่มีข้อมูล" ? Number(row.average).toFixed(1) : "ไม่มีข้อมูล"}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={14} className="p-6 text-gray-400">ไม่พบข้อมูลผลการประเมิน WP/QA</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}