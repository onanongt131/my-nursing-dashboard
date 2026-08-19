'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AuditChartPage() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('2567');
  
  // State สำหรับ Modal สรุป 3 ย้อนหลัง
  const [selectedDeptModal, setSelectedDeptModal] = useState<{ id: string; name: string } | null>(null);

  // State สำหรับ Modal แสดงรายละเอียด A, P, I, E และ D/C เมื่อคลิกตัวเลขรายเดือน
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    monthName: string;
    deptName: string;
    a: string;
    p: string;
    i: string;
    e: string;
    dc: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [auditRes, deptRes] = await Promise.all([
          supabase.from('audit_chart_data').select('*'),
          supabase.from('departments').select('*')
        ]);

        if (auditRes.error) {
          console.error('Error fetching audit data:', auditRes.error.message);
        } else {
          setData(auditRes.data || []);
        }

        if (deptRes.error) {
          console.error('Error fetching departments:', deptRes.error.message);
        } else {
          setDepartments(deptRes.data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel('public:audit_chart_data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_chart_data' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // ปรับการ Map ให้แปลง id เป็น String ทั้งสองฝั่ง ป้องกันปัญหาชนิดข้อมูลไม่ตรงกัน
  const departmentMapName = useMemo(() => {
    const map: { [key: string]: string } = {};
    departments.forEach((dept) => {
      const deptId = String(dept.id !== undefined ? dept.id : dept.department_id);
      const deptName = dept.Department || dept.name || dept.department_name || dept.title || `หน่วยงาน ${deptId}`;
      map[deptId] = deptName;
    });
    return map;
  }, [departments]);

  // ฟังก์ชันแปลงชื่อหน่วยงานสำหรับปี 2566, 2567 และ 2568
  const getMappedDepartmentName = (originalName: string, year: number | string) => {
    const numericYear = Number(year);
    if (numericYear === 2566 || numericYear === 2567 || numericYear === 2568) {
      if (originalName === 'อายุรกรรม 4') return 'อายุรกรรมชาย 1';
      if (originalName === 'อายุรกรรม 2') return 'อายุรกรรมชาย 2';
      if (originalName === 'อายุรกรรม 5') return 'อายุรกรรมหญิง';
      if (originalName === 'อายุรกรรม 6') return 'ร่มไทร';
    }
    return originalName;
  };

  const fiscalYears = useMemo(() => {
    const years = data.map((item) => String(item.fiscal_year));
    return Array.from(new Set(years)).sort();
  }, [data]);

  const filteredDataByYear = useMemo(() => {
    return data.filter((item) => String(item.fiscal_year) === selectedYear);
  }, [data, selectedYear]);

  const summaryStats = useMemo(() => {
    if (filteredDataByYear.length === 0) {
      return { A: '0.00', P: '0.00', I: '0.00', E: '0.00', totalAPIE: '0.00' };
    }

    const sumA = filteredDataByYear.reduce((acc, curr) => acc + Number(curr.a || curr.A || 0), 0);
    const sumP = filteredDataByYear.reduce((acc, curr) => acc + Number(curr.p || curr.P || 0), 0);
    const sumI = filteredDataByYear.reduce((acc, curr) => acc + Number(curr.i || curr.I || 0), 0);
    const sumE = filteredDataByYear.reduce((acc, curr) => acc + Number(curr.e || curr.E || 0), 0);
    const totalEntries = filteredDataByYear.length;

    const pctA = totalEntries > 0 ? (sumA / (totalEntries * 220)) * 100 : 0;
    const pctP = totalEntries > 0 ? (sumP / (totalEntries * 200)) * 100 : 0;
    const pctI = totalEntries > 0 ? (sumI / (totalEntries * 120)) * 100 : 0;
    const pctE = totalEntries > 0 ? (sumE / (totalEntries * 120)) * 100 : 0;
    const totalAPIE = (pctA + pctP + pctI + pctE) / 4;

    return {
      A: pctA.toFixed(2),
      P: pctP.toFixed(2),
      I: pctI.toFixed(2),
      E: pctE.toFixed(2),
      totalAPIE: totalAPIE.toFixed(2)
    };
  }, [filteredDataByYear]);

  const monthMapping: { [key: string]: { code: string; label: string; order: number } } = {
    '10': { code: '10', label: 'OCT', order: 1 },
    '11': { code: '11', label: 'NOV', order: 2 },
    '12': { code: '12', label: 'DEC', order: 3 },
    '1': { code: '1', label: 'JAN', order: 4 },
    '2': { code: '2', label: 'FEB', order: 5 },
    '3': { code: '3', label: 'MAR', order: 6 },
    '4': { code: '4', label: 'APR', order: 7 },
    '5': { code: '5', label: 'MAY', order: 8 },
    '6': { code: '6', label: 'JUN', order: 9 },
    '7': { code: '7', label: 'JUL', order: 10 },
    '8': { code: '8', label: 'AUG', order: 11 },
    '9': { code: '9', label: 'SEP', order: 12 },
  };

  const allMonths = useMemo(() => {
    return Object.values(monthMapping).sort((a, b) => a.order - b.order);
  }, []);

  const tableRows = useMemo(() => {
    const departmentMap: { 
      [key: string]: { 
        name: string; 
        months: { [month: string]: string };
        sumA: number; sumP: number; sumI: number; sumE: number;
        count: number;
      } 
    } = {};

    filteredDataByYear.forEach((item) => {
      const deptId = String(item.department_id || 'unknown');
      const rawDeptName = departmentMapName[deptId] || `หน่วยงาน ${deptId}`;
      const deptName = getMappedDepartmentName(rawDeptName, selectedYear);
      const month = String(item.month || '');
      
      const aVal = Number(item.a || item.A || 0);
      const pVal = Number(item.p || item.P || 0);
      const iVal = Number(item.i || item.I || 0);
      const eVal = Number(item.e || item.E || 0);
      
      const sumAPIE = aVal + pVal + iVal + eVal;
      const totalAPIEVal = Number(item.total_apie || 0);
      const calculatedValue = totalAPIEVal !== 0 ? (sumAPIE / totalAPIEVal) * 100 : (sumAPIE > 0 ? (sumAPIE / 4) : 0);

      if (!departmentMap[deptId]) {
        departmentMap[deptId] = {
          name: deptName,
          months: {},
          sumA: 0, sumP: 0, sumI: 0, sumE: 0,
          count: 0
        };
      }
      
      departmentMap[deptId].months[month] = calculatedValue.toFixed(2);
      departmentMap[deptId].sumA += aVal;
      departmentMap[deptId].sumP += pVal;
      departmentMap[deptId].sumI += iVal;
      departmentMap[deptId].sumE += eVal;
      departmentMap[deptId].count += 1;
    });

    return Object.keys(departmentMap).map((deptId) => {
      const info = departmentMap[deptId];
      const cnt = info.count || 1;

      const pctA = (info.sumA / (cnt * 220)) * 100;
      const pctP = (info.sumP / (cnt * 200)) * 100;
      const pctI = (info.sumI / (cnt * 120)) * 100;
      const pctE = (info.sumE / (cnt * 120)) * 100;
      const avgTotal = (pctA + pctP + pctI + pctE) / 4;

      return {
        departmentId: deptId,
        departmentName: info.name,
        months: info.months,
        pctA: pctA.toFixed(1),
        pctP: pctP.toFixed(1),
        pctI: pctI.toFixed(1),
        pctE: pctE.toFixed(1),
        avgTotal: avgTotal.toFixed(1)
      };
    });
  }, [filteredDataByYear, departmentMapName, selectedYear]);

  // คำนวณข้อมูล 3 ปีย้อนหลังสำหรับหน่วยงานที่ถูกเลือกใน Modal
  const historicalDataForModal = useMemo(() => {
    if (!selectedDeptModal) return [];

    const deptId = selectedDeptModal.id;
    const sortedYears = Array.from(new Set(data.map(item => String(item.fiscal_year)))).sort().reverse().slice(0, 3);

    return sortedYears.map((year) => {
      const yearRows = data.filter(item => String(item.department_id) === deptId && String(item.fiscal_year) === year);
      
      if (yearRows.length === 0) {
        return { year, A: '-', P: '-', I: '-', E: '-', avg: '-' };
      }

      let sumA = 0, sumP = 0, sumI = 0, sumE = 0, cnt = yearRows.length;
      yearRows.forEach(item => {
        sumA += Number(item.a || item.A || 0);
        sumP += Number(item.p || item.P || 0);
        sumI += Number(item.i || item.I || 0);
        sumE += Number(item.e || item.E || 0);
      });

      const pctA = (sumA / (cnt * 220)) * 100;
      const pctP = (sumP / (cnt * 200)) * 100;
      const pctI = (sumI / (cnt * 120)) * 100;
      const pctE = (sumE / (cnt * 120)) * 100;
      const avgTotal = (pctA + pctP + pctI + pctE) / 4;

      return {
        year,
        A: pctA.toFixed(1),
        P: pctP.toFixed(1),
        I: pctI.toFixed(1),
        E: pctE.toFixed(1),
        avg: avgTotal.toFixed(1)
      };
    });
  }, [selectedDeptModal, data]);

  const handleCellClick = async (deptId: string, deptName: string, monthCode: string, monthLabel: string) => {
    const targetRow = data.find(
      item => String(item.department_id) === deptId && 
              String(item.fiscal_year) === selectedYear && 
              String(item.month) === monthCode
    );

    if (targetRow) {
      const rawA = Number(targetRow.a || targetRow.A || 0);
      const rawP = Number(targetRow.p || targetRow.P || 0);
      const rawI = Number(targetRow.i || targetRow.I || 0);
      const rawE = Number(targetRow.e || targetRow.E || 0);
      const rawDC = Number(targetRow.d_c || targetRow.dc || 0);

      // คำนวณเป็นเปอร์เซ็นต์ตามสัดส่วนมาตรฐาน
      const pctA = ((rawA / 220) * 100).toFixed(1);
      const pctP = ((rawP / 200) * 100).toFixed(1);
      const pctI = ((rawI / 120) * 100).toFixed(1);
      const pctE = ((rawE / 120) * 100).toFixed(1);

      setSelectedCellDetail({
        monthName: monthLabel,
        deptName,
        a: `${pctA}%`,
        p: `${pctP}%`,
        i: `${pctI}%`,
        e: `${pctE}%`,
        dc: String(rawDC),
      });
      setCellModalOpen(true);
    }
  };
  
  if (loading) return <div className="p-6 text-center text-gray-500">กำลังโหลดข้อมูล Audit Chart...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Audit Chart : ร้อยละความสมบูรณ์บันทึกทางการพยาบาล</h1>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap pl-2">📅 ปีงบประมาณ:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border p-2 rounded-lg font-medium text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {fiscalYears.map((year) => (
              <option key={year} value={year}>ปีงบประมาณ {year}</option>
            ))}
          </select>
        </div>
      </div>
    
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 shadow-xs">
        <div className="bg-white p-3 rounded-lg shadow-2xs text-center flex items-center justify-center gap-2">
          <span className="text-xl font-semibold text-gray-400">A =</span>
          <span className="text-2xl font-bold text-indigo-600">{summaryStats.A}</span>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-2xs text-center flex items-center justify-center gap-2">
          <span className="text-xl font-semibold text-gray-400">P =</span>
          <span className="text-2xl font-bold text-indigo-600">{summaryStats.P}</span>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-2xs text-center flex items-center justify-center gap-2">
          <span className="text-xl font-semibold text-gray-400">I =</span>
          <span className="text-2xl font-bold text-indigo-600">{summaryStats.I}</span>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-2xs text-center flex items-center justify-center gap-2">
          <span className="text-xl font-semibold text-gray-400">E =</span>
          <span className="text-2xl font-bold text-indigo-600">{summaryStats.E}</span>
        </div>
        <div className="bg-indigo-600 text-white p-3 rounded-lg shadow-2xs col-span-2 md:col-span-1 flex items-center justify-center gap-2">
          <span className="text-xl font-medium text-indigo-200">เฉลี่ยรวม =</span>
          <span className="text-2xl font-extrabold">{summaryStats.totalAPIE}%</span>
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-xl border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-purple-50 text-purple-900 font-semibold">
            <tr>
              <th className="px-5 py-3.5 border-r border-gray-100 text-left sticky left-0 bg-purple-50 z-10 min-w-[220px]">หน่วยงาน</th>
              {allMonths.map((m) => (
                <th key={m.code} className="px-2 py-3.5 border-r border-gray-100 text-center w-16 whitespace-nowrap text-xs">
                  {m.label}
                </th>
              ))}
              <th className="px-3 py-3.5 border-r border-gray-100 text-center w-20 bg-purple-100 text-xs">A</th>
              <th className="px-3 py-3.5 border-r border-gray-100 text-center w-20 bg-purple-100 text-xs">P</th>
              <th className="px-3 py-3.5 border-r border-gray-100 text-center w-20 bg-purple-100 text-xs">I</th>
              <th className="px-3 py-3.5 border-r border-gray-100 text-center w-20 bg-purple-100 text-xs">E</th>
              <th className="px-4 py-3.5 text-center w-24 bg-purple-200 text-purple-950 text-xs">เฉลี่ย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tableRows.length > 0 ? (
              tableRows.map((row, index) => {
                const valA = parseFloat(row.pctA);
                const valP = parseFloat(row.pctP);
                const valI = parseFloat(row.pctI);
                const valE = parseFloat(row.pctE);
                const valAvg = parseFloat(row.avgTotal);

                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 border-r border-gray-100 font-medium text-gray-900 sticky left-0 bg-white">
                      <button 
                        onClick={() => setSelectedDeptModal({ id: row.departmentId, name: row.departmentName })}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline text-left font-medium focus:outline-none flex items-center gap-2"
                        title="คลิกเพื่อดูสรุป 3 ปีย้อนหลัง"
                      >
                        <span>🏢</span>
                        <span>{row.departmentName}</span>
                      </button>
                    </td>
                    {allMonths.map((m) => {
                      const valStr = row.months[m.code];
                      const numVal = valStr !== undefined ? parseFloat(valStr) : null;
                      const isLow = numVal !== null && numVal < 90;

                      return (
                        <td key={m.code} className="px-1.5 py-3.5 border-r border-gray-100 text-center">
                          {numVal !== undefined && numVal !== null ? (
                            <button
                              onClick={() => handleCellClick(row.departmentId, row.departmentName, m.code, m.label)}
                              className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold cursor-pointer hover:scale-105 transition-transform ${
                                isLow
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {numVal.toFixed(1)}
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="px-2 py-3.5 border-r border-gray-100 text-center bg-gray-50/50">
                      <span className={`text-xs font-bold ${valA < 90 ? 'text-red-600' : 'text-indigo-600'}`}>
                        {row.pctA}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 border-r border-gray-100 text-center bg-gray-50/50">
                      <span className={`text-xs font-bold ${valP < 90 ? 'text-red-600' : 'text-indigo-600'}`}>
                        {row.pctP}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 border-r border-gray-100 text-center bg-gray-50/50">
                      <span className={`text-xs font-bold ${valI < 90 ? 'text-red-600' : 'text-indigo-600'}`}>
                        {row.pctI}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 border-r border-gray-100 text-center bg-gray-50/50">
                      <span className={`text-xs font-bold ${valE < 90 ? 'text-red-600' : 'text-indigo-600'}`}>
                        {row.pctE}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center bg-indigo-50/60">
                      <span className={`text-xs font-extrabold ${valAvg < 90 ? 'text-red-600' : 'text-indigo-950'}`}>
                        {row.avgTotal}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={allMonths.length + 6} className="text-center py-8 text-gray-400">
                  ไม่พบข้อมูลในปีงบประมาณ {selectedYear}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal แสดงรายละเอียด A, P, I, E และ D/C เมื่อคลิกตัวเลขรายเดือน */}
      {cellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-base">รายละเอียด Audit Chart แยกตามหัวข้อ</h3>
                <p className="text-xs text-indigo-100 opacity-90">{selectedCellDetail?.deptName} (เดือน {selectedCellDetail?.monthName} ปี {selectedYear})</p>
              </div>
              <button 
                onClick={() => setCellModalOpen(false)}
                className="bg-indigo-700/60 hover:bg-indigo-700 text-white rounded-full p-1.5 w-7 h-7 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">A (Assessment)</span>
                <span className="font-extrabold text-indigo-600 text-base">{selectedCellDetail?.a}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">P (Planning)</span>
                <span className="font-extrabold text-indigo-600 text-base">{selectedCellDetail?.p}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">I (Implementation)</span>
                <span className="font-extrabold text-indigo-600 text-base">{selectedCellDetail?.i}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">E (Evaluation)</span>
                <span className="font-extrabold text-indigo-600 text-base">{selectedCellDetail?.e}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                <span className="font-semibold text-emerald-800 text-sm">บันทึกจำหน่าย (D/C)</span>
                <span className="font-extrabold text-emerald-700 text-base">{selectedCellDetail?.dc}</span>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-100">
              <button
                onClick={() => setCellModalOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal สรุป 3 ปีย้อนหลัง */}
      {selectedDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                สรุปผล 3 ปีย้อนหลัง: <span className="text-indigo-600">{selectedDeptModal.name}</span>
              </h3>
              <button 
                onClick={() => setSelectedDeptModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-center">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">ปีงบประมาณ</th>
                    <th className="px-2 py-2">A</th>
                    <th className="px-2 py-2">P</th>
                    <th className="px-2 py-2">I</th>
                    <th className="px-2 py-2">E</th>
                    <th className="px-3 py-2 bg-indigo-50 text-indigo-900">เฉลี่ยรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historicalDataForModal.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-left font-medium text-gray-800">{item.year}</td>
                      <td className={`px-2 py-2.5 font-semibold ${Number(item.A) < 90 ? 'text-red-600' : 'text-gray-700'}`}>{item.A}</td>
                      <td className={`px-2 py-2.5 font-semibold ${Number(item.P) < 90 ? 'text-red-600' : 'text-gray-700'}`}>{item.P}</td>
                      <td className={`px-2 py-2.5 font-semibold ${Number(item.I) < 90 ? 'text-red-600' : 'text-gray-700'}`}>{item.I}</td>
                      <td className={`px-2 py-2.5 font-semibold ${Number(item.E) < 90 ? 'text-red-600' : 'text-gray-700'}`}>{item.E}</td>
                      <td className={`px-3 py-2.5 font-bold bg-indigo-50/40 ${Number(item.avg) < 90 ? 'text-red-600' : 'text-indigo-900'}`}>{item.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDeptModal(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
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