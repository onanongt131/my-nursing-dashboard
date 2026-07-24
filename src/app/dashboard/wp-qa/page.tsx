'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Department {
  id: number | string;
  name: string;
}

interface WpRecord {
  id?: number;
  fiscal_year: number | string;
  department_id: number | string;
  month: number;
  name: string;
  wp: number | null;
}

interface TableRow {
  labelName: string;
  months: (number | string)[];
  average: number | string;
}

export default function WpQaDashboard() {
  const supabase = createClient();
  const [selectedYear, setSelectedYear] = useState<string>('2569');
  const [selectedDept, setSelectedDept] = useState<string>(''); // ค่าว่าง = ภาพรวมทุกหน่วยงาน
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rawData, setRawData] = useState<WpRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchDepartmentsAndAllData();
  }, []);

  const fetchDepartmentsAndAllData = async () => {
    setLoading(true);
    try {
      const deptRes = await supabase.from('departments').select('id, Department');
      if (deptRes.error) {
        console.warn("Could not fetch departments table:", deptRes.error.message);
      } else if (deptRes.data) {
        const excludedDepts = ["IC", "ฝ่ายการพยาบาล", "MICU 3", "ห้องคลอด", "ห้องผ่าตัด", "วิสัญญี", "OPD"];
        const filteredData = deptRes.data.filter(item => !excludedDepts.includes(item.Department));

        const formattedDepts = filteredData.map(item => ({
          id: item.id,
          name: item.Department 
        }));
        setDepartments(formattedDepts);
      }

      let allWpData: WpRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('wp_qa_results')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allWpData = [...allWpData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page += 1;
          }
        } else {
          hasMore = false;
        }
      }

      setRawData(allWpData);
    } catch (err) {
      console.error("Error fetching WP/QA data:", err);
    } finally {
      setLoading(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = rawData.map(item => String(item.fiscal_year));
    return Array.from(new Set(years)).sort().reverse();
  }, [rawData]);

  const departmentMapName = useMemo(() => {
    const map: { [key: string]: string } = {};
    departments.forEach((dept) => {
      map[String(dept.id).trim()] = dept.name;
    });
    return map;
  }, [departments]);

  const { tableData, passCount, failCount, summaryPercentage, totalItemsCount } = useMemo(() => {
    const monthsOrder = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const filteredByYear = rawData.filter(item => {
      return String(item.fiscal_year || '').trim() === String(selectedYear).trim();
    });

    const isOverview = selectedDept === '';

    if (isOverview) {
      const deptGrouped: { [deptIdStr: string]: { [month: number]: { [indicatorName: string]: number } } } = {};
      const deptIndicatorScoresYear: { [deptIdStr: string]: { [indicatorName: string]: number[] } } = {};

      filteredByYear.forEach((item) => {
        const deptIdStr = String(item.department_id || '').trim();
        if (!deptIdStr || !item.name) return;

        if (!deptGrouped[deptIdStr]) {
          deptGrouped[deptIdStr] = {};
        }
        if (!deptGrouped[deptIdStr][item.month]) {
          deptGrouped[deptIdStr][item.month] = {};
        }

        const val = item.wp;
        if (val !== undefined && val !== null && val !== ("" as any)) {
          const numVal = Number(val);
          deptGrouped[deptIdStr][item.month][item.name] = numVal;

          if (!deptIndicatorScoresYear[deptIdStr]) {
            deptIndicatorScoresYear[deptIdStr] = {};
          }
          if (!deptIndicatorScoresYear[deptIdStr][item.name]) {
            deptIndicatorScoresYear[deptIdStr][item.name] = [];
          }
          deptIndicatorScoresYear[deptIdStr][item.name].push(numVal);
        }
      });

      let pCount = 0;
      let totalDepts = 0;

      const formatted: TableRow[] = Object.keys(deptGrouped).map((deptIdStr) => {
        const monthValues = monthsOrder.map((m) => {
          const monthIndicators = deptGrouped[deptIdStr][m];
          if (!monthIndicators) return "ไม่มีข้อมูล";

          const indicatorNames = Object.keys(monthIndicators);
          if (indicatorNames.length === 0) return "ไม่มีข้อมูล";

          let passInMonth = 0;
          let totalInMonth = indicatorNames.length;

          indicatorNames.forEach((indName) => {
            const score = monthIndicators[indName];
            if (score >= 90) {
              passInMonth += 1;
            }
          });

          const monthlyPercent = (passInMonth / totalInMonth) * 100;
          return Number(monthlyPercent.toFixed(1));
        });

        const indicatorsMap = deptIndicatorScoresYear[deptIdStr] || {};
        const indicatorNamesList = Object.keys(indicatorsMap);
        let average: number | string = "ไม่มีข้อมูล";

        if (indicatorNamesList.length > 0) {
          let passIndCount = 0;
          indicatorNamesList.forEach((indName) => {
            const scores = indicatorsMap[indName];
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avgScore >= 90) {
              passIndCount += 1;
            }
          });
          average = Number(((passIndCount / indicatorNamesList.length) * 100).toFixed(1));
        }

        const deptName = departmentMapName[deptIdStr] || `หน่วยงาน ID: ${deptIdStr}`;

        totalDepts += 1;
        if (average !== "ไม่มีข้อมูล" && Number(average) >= 90) {
          pCount += 1;
        }

        return {
          labelName: deptName,
          months: monthValues,
          average
        };
      });

      const fCount = totalDepts - pCount;
      const percent = totalDepts > 0 ? Number(((pCount / totalDepts) * 100).toFixed(1)) : 0;

      return {
        tableData: formatted,
        passCount: pCount,
        failCount: fCount,
        summaryPercentage: percent,
        totalItemsCount: totalDepts
      };

    } else {
      const filteredByDept = filteredByYear.filter(item => {
        return String(item.department_id || '').trim() === String(selectedDept).trim();
      });

      const indicatorGrouped: { [name: string]: { [month: number]: number[] } } = {};

      filteredByDept.forEach((item) => {
        if (!item.name) return;
        if (!indicatorGrouped[item.name]) {
          indicatorGrouped[item.name] = {};
        }
        if (!indicatorGrouped[item.name][item.month]) {
          indicatorGrouped[item.name][item.month] = [];
        }

        const val = item.wp;
        if (val !== undefined && val !== null && val !== ("" as any)) {
          indicatorGrouped[item.name][item.month].push(Number(val));
        }
      });

      let passIndicatorsCount = 0;
      let failIndicatorsCount = 0;
      let totalIndicators = 0;

      const formatted: TableRow[] = Object.keys(indicatorGrouped).map((name) => {
        const monthMap = indicatorGrouped[name];

        const monthValues = monthsOrder.map((m) => {
          const scores = monthMap[m];
          if (scores && scores.length > 0) {
            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = sum / scores.length;
            return Number(avg.toFixed(1));
          }
          return "ไม่มีข้อมูล";
        });

        const allScoresFlat = Object.values(monthMap).flat();
        let indicatorYearAvg: number | string = "ไม่มีข้อมูล";
        if (allScoresFlat.length > 0) {
          indicatorYearAvg = allScoresFlat.reduce((a, b) => a + b, 0) / allScoresFlat.length;
        }

        totalIndicators += 1;
        const isPass = indicatorYearAvg !== "ไม่มีข้อมูล" && Number(indicatorYearAvg) >= 90;
        if (isPass) {
          passIndicatorsCount += 1;
        } else {
          failIndicatorsCount += 1;
        }

        return {
          labelName: name,
          months: monthValues,
          average: indicatorYearAvg !== "ไม่มีข้อมูล" ? Number(indicatorYearAvg.toFixed(1)) : "ไม่มีข้อมูล"
        };
      });

      const summaryPercent = totalIndicators > 0 ? Number(((passIndicatorsCount / totalIndicators) * 100).toFixed(1)) : 0;

      return {
        tableData: formatted,
        passCount: passIndicatorsCount,
        failCount: failIndicatorsCount,
        summaryPercentage: summaryPercent,
        totalItemsCount: totalIndicators
      };
    }
  }, [rawData, selectedYear, selectedDept, departmentMapName]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-800">ผลการประเมินแนวทางปฏิบัติ WP/QA</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-gray-50/80 px-3 py-2 rounded-xl border border-purple-100/60 shadow-xs">
            <label className="text-sm font-semibold text-gray-700">ปีงบฯ:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-gray-50/80 px-3 py-2 rounded-xl border border-purple-100/60 shadow-xs">
            <label className="text-sm font-semibold text-gray-700">หน่วยงาน:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[220px]"
            >
              <option value="">-- ภาพรวมทั้งหมด (ทุกหน่วยงาน) --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="text-sm font-semibold text-gray-700">
          <span>📊 ร้อยละการปฏิบัติตามแนวทาง WP/QA ผ่านเกณฑ์:</span>
        </div>

        <div className="text-sm font-medium text-gray-600 bg-white/60 px-4 py-1.5 rounded-lg border border-purple-100/60 shadow-2xs">
          <span>
            ผ่าน <strong className="text-emerald-700">{passCount}</strong> {selectedDept === '' ? 'หน่วยงาน' : 'ตัวชี้วัด'} / 
            ไม่ผ่าน <strong className="text-rose-600">{failCount}</strong> {selectedDept === '' ? 'หน่วยงาน' : 'ตัวชี้วัด'} 
            <span className="text-gray-400 text-xs ml-1">(จากทั้งหมด {totalItemsCount})</span>
          </span>
        </div>

        <div className="px-4 py-1.5 bg-white border border-purple-200 rounded-lg shadow-2xs">
          <span className="text-lg font-bold text-purple-700">{summaryPercentage}%</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-purple-100 rounded-xl shadow-xs">
        <table className="min-w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-purple-50/40 text-gray-700 border-b border-purple-100/80">
              <th className="p-3.5 px-6 text-left border-r border-purple-100/80 font-bold text-gray-800 w-auto">
                {selectedDept === '' ? 'ชื่อหน่วยงาน' : 'ชื่อแนวทาง (WP/QA)'}
              </th>
              {['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'].map((m) => (
                <th key={m} className="py-3.5 px-1 border-r border-purple-100/80 font-bold text-purple-900 text-xs w-[62px]">{m}</th>
              ))}
              <th className="py-3.5 px-1 font-bold text-amber-900 w-[72px] bg-amber-50/60 text-xs">เฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="p-6 text-gray-400">กำลังโหลดข้อมูลทั้งหมด...</td>
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
                    <td className="p-3.5 px-6 text-left border-r border-purple-100/60 font-medium text-gray-800 break-words leading-relaxed w-auto">
                      {row.labelName}
                    </td>
                    
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
                <td colSpan={14} className="p-6 text-gray-400">ไม่พบข้อมูลผลการประเมิน WP/QA สำหรับเงื่อนไขที่เลือก</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}