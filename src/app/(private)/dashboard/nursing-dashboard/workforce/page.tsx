'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function WorkforceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [rawDailyData, setRawDailyData] = useState<any[]>([]);
  const [departmentList, setDepartmentList] = useState<any[]>([]);
  
  // State สำหรับตาราง Productivity
  const [viewMode, setViewMode] = useState<'unit' | 'group'>('group');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // State สำหรับ Workforce Risk Matrix
  const [riskViewMode, setRiskViewMode] = useState<'unit' | 'group'>('group');
  const [riskSearchTerm, setRiskSearchTerm] = useState('');
  const [selectedRiskGroup, setSelectedRiskGroup] = useState<string | null>(null);

  const calculateProductivityStatus = (value: number) => {
    if (value < 90) {
      return { status: 'low', category: '<90 (Low)', color: 'bg-amber-400', textColor: 'text-amber-700' };
    } else if (value > 110) {
      return { status: 'high', category: '>110 (High)', color: 'bg-rose-500', textColor: 'text-rose-700' };
    } else {
      return { status: 'target', category: '90-110 (Target)', color: 'bg-emerald-500', textColor: 'text-emerald-800' };
    }
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. เพิ่มคอลัมน์ score_1 ถึง score_gt_5 เข้าไปใน .select()
        const { data: dailyData, error: dailyError } = await supabase
          .from('daily_staffing')
          .select('id, department_id, np, shift, date, score_1, score_2, score_3, score_4, score_5, score_gt_5');

        if (dailyError) throw dailyError;

        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, Department, "group"');

        if (deptError) {
          console.error('Error fetching departments:', deptError);
        }

        // กำหนดรายชื่อกลุ่มงานที่ไม่ต้องการนำมาแสดงหรือคำนวณ
        const excludedGroups = [
          'ตรวจรักษาพิเศษ',
          'OPD',
          'การควบคุมและการป้องกันการติดเชื้อ',
          'ผ่าตัด',
          'วิสัญญี'
        ];

        const deptMap = new Map();
        const deptsArray: any[] = [];
        if (deptData && deptData.length > 0) {
          deptData.forEach((dept: any) => {
            const groupName = (dept.group || '').trim();
            if (
              groupName && 
              groupName !== 'ไม่ระบุกลุ่มงาน' && 
              !excludedGroups.includes(groupName)
            ) {
              const deptInfo = {
                id: Number(dept.id),
                name: dept.Department || `Department ID: ${dept.id}`,
                group: groupName
              };
              deptMap.set(Number(dept.id), deptInfo);
              deptsArray.push(deptInfo);
            }
          });
        }
        setDepartmentList(deptsArray);

        if (dailyData && dailyData.length > 0) {
          const mapped = dailyData
            .filter((item: any) => deptMap.has(Number(item.department_id)))
            .map((item: any) => {
              const value = item.np !== null && item.np !== undefined ? Number(item.np) : 100;
              const evaluated = calculateProductivityStatus(value);
              const deptInfo = deptMap.get(Number(item.department_id));

              return {
                id: item.id,
                department_id: item.department_id,
                name: deptInfo.name,
                group: deptInfo.group,
                value: value,
                ...evaluated,
                shift: (item.shift || '').trim(),
                date: item.date || 'วันนี้',
                // 2. Map ค่าคะแนนความรุนแรง ป้องกันกรณีเป็นค่าว่าง (NULL) ให้กลายเป็น 0
                score_1: Number(item.score_1) || 0,
                score_2: Number(item.score_2) || 0,
                score_3: Number(item.score_3) || 0,
                score_4: Number(item.score_4) || 0,
                score_5: Number(item.score_5) || 0,
                score_gt_5: Number(item.score_gt_5) || 0
              };
            });
          setRawDailyData(mapped);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error?.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const calculateSummaryCards = () => {
    if (!rawDailyData || rawDailyData.length === 0) {
      return { rnAvailable: '94.2%', avgProductivity: '0%', avgPcs: '0.00', skillMix: '78.5%', totalOt: '124 ชม.' };
    }

    const totalNp = rawDailyData.reduce((acc, curr) => acc + curr.value, 0);
    const avgNp = Math.round((totalNp / rawDailyData.length) * 10) / 10;

    let totalScoreSum = 0;
    let totalPatientsSum = 0;

    rawDailyData.forEach((curr) => {
      const s1 = curr.score_1;
      const s2 = curr.score_2;
      const s3 = curr.score_3;
      const s4 = curr.score_4;
      const s5 = curr.score_5;
      const sGt5 = curr.score_gt_5;

      // ผลรวมคะแนน (น้ำหนักตามระดับ 1 ถึง 6)
      const rowScoreSum = (s1 * 1) + (s2 * 2) + (s3 * 3) + (s4 * 4) + (s5 * 5) + (sGt5 * 6);
      
      // จำนวนผู้ป่วยรวมในแถว
      const rowPatientCount = s1 + s2 + s3 + s4 + s5 + sGt5;

      totalScoreSum += rowScoreSum;
      totalPatientsSum += rowPatientCount;
    });

    const avgPcsVal = totalPatientsSum > 0 ? (totalScoreSum / totalPatientsSum).toFixed(2) : '0.00';

    return {
      rnAvailable: '94.2%',
      avgProductivity: `${avgNp}%`,
      avgPcs: `${avgPcsVal}`,
      skillMix: '78.5%',
      totalOt: '124 ชม.'
    };
  };

  const summaryCardsData = calculateSummaryCards();

  const getUnitCombinedData = () => {
    const map = new Map();
    rawDailyData.forEach((item) => {
      if (selectedGroup && item.group !== selectedGroup) return;

      if (!map.has(item.department_id)) {
        map.set(item.department_id, {
          id: item.department_id,
          name: item.name,
          group: item.group,
          shifts: { ดึก: null, เช้า: null, บ่าย: null },
          totalNp: 0,
          count: 0
        });
      }
      const current = map.get(item.department_id);
      current.totalNp += item.value;
      current.count += 1;

      const shiftName = item.shift.toLowerCase();
      const evaluated = calculateProductivityStatus(item.value);
      const shiftDataObj = { value: item.value, ...evaluated };

      if (shiftName.includes('ดึก') || shiftName.includes('night')) {
        current.shifts.ดึก = shiftDataObj;
      } else if (shiftName.includes('เช้า') || shiftName.includes('morning')) {
        current.shifts.เช้า = shiftDataObj;
      } else if (shiftName.includes('บ่าย') || shiftName.includes('afternoon')) {
        current.shifts.บ่าย = shiftDataObj;
      } else {
        if (!current.shifts.เช้า) current.shifts.เช้า = shiftDataObj;
      }
    });

    const result: any[] = [];
    map.forEach((val) => {
      const avgValue = val.count > 0 ? Math.round((val.totalNp / val.count) * 100) / 100 : 0;
      const avgEvaluated = calculateProductivityStatus(avgValue);

      result.push({
        id: val.id,
        name: val.name,
        subText: val.group,
        shifts: val.shifts,
        dailyAvg: {
          value: avgValue,
          ...avgEvaluated
        }
      });
    });
    return result;
  };

  const getGroupAggregatedData = () => {
    const map = new Map();
    
    departmentList.forEach((dept) => {
      const groupKey = dept.group;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupName: groupKey,
          totalNp: 0,
          count: 0,
          departmentsCount: new Set()
        });
      }
      map.get(groupKey).departmentsCount.add(dept.id);
    });

    rawDailyData.forEach((item) => {
      const groupKey = item.group;
      if (map.has(groupKey)) {
        const current = map.get(groupKey);
        current.totalNp += item.value;
        current.count += 1;
      }
    });

    const result: any[] = [];
    map.forEach((val, key) => {
      const avgValue = val.count > 0 ? Math.round((val.totalNp / val.count) * 100) / 100 : 100;
      const evaluated = calculateProductivityStatus(avgValue);
      result.push({
        id: key,
        name: val.groupName,
        subText: `ครอบคลุม ${val.departmentsCount.size} หน่วยงาน`,
        departmentsCountNum: val.departmentsCount.size,
        value: avgValue,
        ...evaluated
      });
    });
    return result;
  };

  const currentDisplayData = viewMode === 'unit' ? getUnitCombinedData() : getGroupAggregatedData();
  const filteredData = currentDisplayData.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleGroupClick = (groupName: string) => {
    setSelectedGroup(groupName);
    setViewMode('unit');
  };

  const evaluateRiskMetric = (val: number, type: 'productivity' | 'pcs' | 'skillMix' | 'staffing') => {
    if (type === 'productivity') {
      if (val < 90) return 'yellow';
      if (val > 110) return 'red';
      return 'green';
    }
    if (type === 'pcs') {
      if (val > 3.8) return 'red';
      if (val > 3.2) return 'yellow';
      return 'green';
    }
    if (type === 'skillMix') {
      if (val < 70) return 'red';
      if (val < 80) return 'yellow';
      return 'green';
    }
    if (val < 85) return 'red';
    if (val < 95) return 'yellow';
    return 'green';
  };

  const getRiskMatrixDisplayData = () => {
    const groupProdMap = new Map();
    rawDailyData.forEach(item => {
      if (!groupProdMap.has(item.group)) {
        groupProdMap.set(item.group, { total: 0, count: 0, minVal: item.value });
      }
      const g = groupProdMap.get(item.group);
      g.total += item.value;
      g.count += 1;
      if (item.value < g.minVal) g.minVal = item.value;
    });

    if (riskViewMode === 'unit') {
      let depts = departmentList;
      if (selectedRiskGroup) {
        depts = depts.filter(d => d.group === selectedRiskGroup);
      }
      return depts
        .filter(d => d.name.toLowerCase().includes(riskSearchTerm.toLowerCase()) || d.group.toLowerCase().includes(riskSearchTerm.toLowerCase()))
        .map(d => {
          const unitData = rawDailyData.filter(item => item.department_id === d.id);
          const avgUnitNp = unitData.length > 0 ? unitData.reduce((acc, curr) => acc + curr.value, 0) / unitData.length : 100;
          
          const seedOffset = (d.id % 3 === 0) ? -5 : (d.id % 3 === 1) ? 8 : 0;
          const adjustedNp = avgUnitNp + seedOffset;

          const prodStatus = evaluateRiskMetric(adjustedNp, 'productivity');
          const pcsStatus = evaluateRiskMetric(3.0 + ((d.id % 5) * 0.2), 'pcs');
          const skillStatus = evaluateRiskMetric(82 - (d.id % 4 * 4), 'skillMix');
          const staffStatus = evaluateRiskMetric(adjustedNp > 110 ? 80 : 96, 'staffing');

          let riskLevel = 'Low';
          let riskColor = 'text-emerald-700 bg-emerald-50';
          
          const redCount = [prodStatus, pcsStatus, skillStatus, staffStatus].filter(s => s === 'red').length;
          const yellowCount = [prodStatus, pcsStatus, skillStatus, staffStatus].filter(s => s === 'yellow').length;

          if (redCount >= 2 || prodStatus === 'red') {
            riskLevel = 'High';
            riskColor = 'text-rose-700 bg-rose-50';
          } else if (redCount === 1 || yellowCount >= 2) {
            riskLevel = 'Medium';
            riskColor = 'text-amber-700 bg-amber-50';
          }

          return {
            group: d.group,
            unit: d.name,
            productivity: prodStatus,
            pcs: pcsStatus,
            skillMix: skillStatus,
            staffing: staffStatus,
            risk: riskLevel,
            riskColor: riskColor
          };
        });
    } else {
      const map = new Map();
      departmentList.forEach(dept => {
        const groupKey = dept.group;
        if (!map.has(groupKey)) {
          map.set(groupKey, { group: groupKey, unitsCount: 0 });
        }
        map.get(groupKey).unitsCount += 1;
      });

      const result: any[] = [];
      map.forEach((val, key) => {
        const gInfo = groupProdMap.get(key);
        const avgGroupNp = gInfo && gInfo.count > 0 ? gInfo.total / gInfo.count : 100;
        
        const prodStatus = evaluateRiskMetric(avgGroupNp, 'productivity');
        const pcsStatus = evaluateRiskMetric(3.4, 'pcs');
        const skillStatus = evaluateRiskMetric(78, 'skillMix');
        const staffStatus = evaluateRiskMetric(avgGroupNp > 110 ? 82 : 94, 'staffing');

        let riskLevel = 'Low';
        let riskColor = 'text-emerald-700 bg-emerald-50';

        const redCount = [prodStatus, pcsStatus, skillStatus, staffStatus].filter(s => s === 'red').length;
        const yellowCount = [prodStatus, pcsStatus, skillStatus, staffStatus].filter(s => s === 'yellow').length;

        if (redCount >= 2 || prodStatus === 'red') {
          riskLevel = 'High';
          riskColor = 'text-rose-700 bg-rose-50';
        } else if (redCount === 1 || yellowCount >= 2) {
          riskLevel = 'Medium';
          riskColor = 'text-amber-700 bg-amber-50';
        }

        result.push({
          group: key,
          unitsCount: val.unitsCount,
          productivity: prodStatus,
          pcs: pcsStatus,
          skillMix: skillStatus,
          staffing: staffStatus,
          risk: riskLevel,
          riskColor: riskColor
        });
      });

      return result.filter(item => item.group.toLowerCase().includes(riskSearchTerm.toLowerCase()));
    }
  };

  const currentRiskData = getRiskMatrixDisplayData();

  const handleRiskGroupClick = (groupName: string) => {
    setSelectedRiskGroup(groupName);
    setRiskViewMode('unit');
  };

  const renderRiskDot = (status: string) => {
    const colorClass = status === 'green' ? 'bg-emerald-500' : status === 'yellow' ? 'bg-amber-400' : 'bg-rose-500';
    return <div className={`w-3.5 h-3.5 rounded-full ${colorClass} mx-auto shadow-2xs`} title={status}></div>;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 px-6 sm:px-8 lg:px-12 w-full">
      <div className="w-full space-y-6">
        
        {/* หัวข้อหน้า Dashboard */}
        <div className="pt-6">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
            Workforce Command Center
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-2">วิเคราะห์อัตรากำลังและภาระงาน</h2>
          <p className="text-sm text-gray-600 mt-1">ประเมินความพอเพียงของบุคลากร ค่า Productivity (เชื่อมต่อข้อมูลจาก Supabase)</p>
        </div>

        {/* 5 Summary Cards ด้านบน */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-400">RN Available</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-gray-800">{summaryCardsData.rnAvailable}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md">Stable</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-400">Productivity</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-emerald-600">{summaryCardsData.avgProductivity}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md">Target</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-400">PCS (Acuity)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-gray-800">{summaryCardsData.avgPcs}</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md">Avg Score</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-gray-400">Skill Mix</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-gray-800">{summaryCardsData.skillMix}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md">Standard</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-gray-400">OT Hours</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-amber-600">{summaryCardsData.totalOt}</span>
              <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-md">Monitor</span>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 1: Workforce Risk Matrix */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 w-full">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-800">
                  {selectedRiskGroup ? `Workforce Risk Matrix (กลุ่ม: ${selectedRiskGroup})` : 'Workforce Risk Matrix'}
                </h3>
                {selectedRiskGroup && (
                  <button 
                    onClick={() => { setSelectedRiskGroup(null); setRiskViewMode('group'); }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    ← กลับไปภาพรวมกลุ่มงาน
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {riskViewMode === 'unit' 
                  ? (selectedRiskGroup ? `แสดงหน่วยงานในกลุ่ม ${selectedRiskGroup}` : 'ประเมินความเสี่ยงรอบด้านรายหน่วยงาน') 
                  : 'ประเมินความเสี่ยงภาพรวมตามกลุ่มงาน (กดดูข้อมูลหน่วยงานเพื่อเจาะลึกรายวอร์ด)'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder={riskViewMode === 'group' ? '🔍 ค้นหาชื่อกลุ่มงาน...' : '🔍 ค้นหาชื่อหน่วยงานหรือกลุ่มงาน...'}
                  value={riskSearchTerm}
                  onChange={(e) => setRiskSearchTerm(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                />
              </div>

              <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => { setSelectedRiskGroup(null); setRiskViewMode('unit'); }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${riskViewMode === 'unit' && !selectedRiskGroup ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  🏥 รายหน่วยงาน
                </button>
                <button
                  onClick={() => { setSelectedRiskGroup(null); setRiskViewMode('group'); }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${riskViewMode === 'group' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  📊 ภาพรวมกลุ่มงาน
                </button>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 font-bold">
                  {riskViewMode === 'group' ? (
                    <>
                      <th className="py-3 px-6 w-1/3">กลุ่มงาน</th>
                    </>
                  ) : (
                    <>
                      {!selectedRiskGroup && <th className="py-3 px-6 w-1/4">กลุ่มงาน</th>}
                      <th className="py-3 px-6 w-1/4">หน่วยงาน</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-center">Productivity</th>
                  <th className="py-3 px-4 text-center">PCS</th>
                  <th className="py-3 px-4 text-center">Skill Mix</th>
                  <th className="py-3 px-4 text-center">Staffing</th>
                  <th className="py-3 px-6 text-right">Risk</th>
                  {riskViewMode === 'group' && (
                    <th className="py-3 px-6 text-center">ดูข้อมูลกลุ่มงาน</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {currentRiskData.length === 0 ? (
                  <tr>
                    <td colSpan={riskViewMode === 'group' ? 7 : (selectedRiskGroup ? 6 : 7)} className="text-center text-gray-400 py-6">ไม่พบข้อมูลความเสี่ยงที่ค้นหา</td>
                  </tr>
                ) : (
                  currentRiskData.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50/50 transition-all">
                      {riskViewMode === 'group' ? (
                        <>
                          <td className="py-4 px-6 font-bold text-gray-800">{row.group}</td>
                        </>
                      ) : (
                        <>
                          {!selectedRiskGroup && (
                            <td className="py-4 px-6 font-bold text-emerald-800">{row.group}</td>
                          )}
                          <td className="py-4 px-6 font-medium text-gray-700">{row.unit}</td>
                        </>
                      )}
                      <td className="py-4 px-4 text-center">{renderRiskDot(row.productivity)}</td>
                      <td className="py-4 px-4 text-center">{renderRiskDot(row.pcs)}</td>
                      <td className="py-4 px-4 text-center">{renderRiskDot(row.skillMix)}</td>
                      <td className="py-4 px-4 text-center">{renderRiskDot(row.staffing)}</td>
                      <td className="py-4 px-6 text-right">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${row.riskColor}`}>
                          {row.risk}
                        </span>
                      </td>
                      {riskViewMode === 'group' && (
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => handleRiskGroupClick(row.group)}
                            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs shadow-2xs"
                            title={`ดูหน่วยงานใน ${row.group}`}
                          >
                            <span>ดูข้อมูลกลุ่มงาน</span>
                            <span className="text-gray-400 font-normal">({row.unitsCount})</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ส่วนที่ 2: Productivity by Unit & Group */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 w-full">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-800">
                  {selectedGroup ? `กลุ่มงาน: ${selectedGroup}` : 'Productivity by Unit & Group'}
                </h3>
                {selectedGroup && (
                  <button 
                    onClick={() => { setSelectedGroup(null); setViewMode('group'); }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    ← กลับไปภาพรวมกลุ่มงาน
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {viewMode === 'unit' 
                  ? (selectedGroup ? `แสดงหน่วยงานภายใต้กลุ่ม ${selectedGroup}` : 'รายหน่วยงาน (แสดงรายเวร + ค่าเฉลี่ยรายวันในแถวเดียว)') 
                  : 'ภาพรวมตามกลุ่มงาน (คลิกปุ่มดูข้อมูลหน่วยงานเพื่อดูรายละเอียดรายหน่วยงาน)'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder={viewMode === 'group' ? '🔍 ค้นหาชื่อกลุ่มงาน...' : '🔍 ค้นหาชื่อหน่วยงาน/วอร์ด...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                />
              </div>

              <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => { setSelectedGroup(null); setViewMode('unit'); }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'unit' && !selectedGroup ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  🏥 รายหน่วยงาน
                </button>
                <button
                  onClick={() => { setSelectedGroup(null); setViewMode('group'); }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'group' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  📊 ภาพรวมกลุ่มงาน
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-[600px] overflow-y-auto space-y-3 pr-2 w-full">
            {loading ? (
              <p className="text-center text-xs text-gray-400 py-8">กำลังโหลดข้อมูล...</p>
            ) : filteredData.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">ไม่พบข้อมูลที่ค้นหา</p>
            ) : (
              filteredData.map((item, idx) => {
                if (viewMode === 'unit') {
                  const shiftsList = [
                    { label: 'เวรดึก', data: item.shifts.ดึก },
                    { label: 'เวรเช้า', data: item.shifts.เช้า },
                    { label: 'เวรบ่าย', data: item.shifts.บ่าย }
                  ];

                  return (
                    <div key={item.id || idx} className="bg-white p-4 rounded-xl border border-gray-100 grid grid-cols-1 lg:grid-cols-5 gap-4 items-center shadow-2xs hover:border-gray-200 transition-all w-full">
                      <div className="flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-gray-100 pb-2 lg:pb-0 lg:pr-3">
                        <span className="text-xs font-extrabold text-gray-800 truncate" title={item.name}>{item.name}</span>
                        <span className="text-[10px] text-gray-400 truncate">({item.subText})</span>
                      </div>

                      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {shiftsList.map((sItem, sIdx) => {
                          const sData = sItem.data;
                          return (
                            <div key={sIdx} className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 flex flex-col justify-between gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500">{sItem.label}</span>
                                <span className={`text-[11px] font-bold ${sData ? sData.textColor : 'text-gray-300'}`}>
                                  {sData ? `${sData.value}%` : '-'}
                                </span>
                              </div>
                              <div className="relative w-full bg-gray-200 h-1.5 rounded-full">
                                <div className="absolute left-[54%] right-[20%] top-0 bottom-0 bg-emerald-200 rounded-full opacity-70"></div>
                                {sData && (
                                  <div 
                                    className={`absolute top-[-3px] w-3 h-3 rounded-full border-2 border-white shadow-xs transition-all ${sData.color}`}
                                    style={{ left: `${Math.min(Math.max((sData.value / 150) * 100, 3), 95)}%` }}
                                    title={`ค่า np: ${sData.value}`}
                                  ></div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-2 lg:pt-0 lg:pl-3 bg-emerald-50/30 p-2.5 rounded-xl">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.dailyAvg.color}`}></div>
                          <span className="text-[10px] font-bold text-gray-500">เฉลี่ยรายวัน</span>
                        </div>
                        <span className={`text-sm font-black ${item.dailyAvg.textColor}`}>
                          {item.dailyAvg.value}%
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id || idx} className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-gray-200 transition-all w-full">
                    <div className="flex items-center justify-between sm:justify-start sm:gap-6 w-full sm:w-1/4">
                      <span className="text-xs font-bold text-gray-800 truncate" title={item.name}>{item.name}</span>
                    </div>
                    
                    <div className="flex-1 px-4">
                      <div className="relative w-full bg-gray-200 h-2 rounded-full">
                        <div className="absolute left-[54%] right-[20%] top-0 bottom-0 bg-emerald-200 rounded-full opacity-70"></div>
                        <div 
                          className={`absolute top-[-3px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs transition-all ${item.color}`}
                          style={{ left: `${Math.min(Math.max((item.value / 150) * 100, 5), 95)}%` }}
                          title={`ค่า np: ${item.value}`}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-xs w-56">
                      <span className="text-gray-400">สถานะ: <span className="text-gray-600 font-medium">{item.category}</span></span>
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${item.textColor}`}>
                        {item.value}%
                      </span>
                    </div>

                    <div className="shrink-0 flex justify-end sm:justify-center">
                      <button 
                        onClick={() => handleGroupClick(item.name)}
                        className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs shadow-2xs"
                        title={`ดูหน่วยงานใน ${item.name}`}
                      >
                        <span>ดูข้อมูลหน่วยงาน</span>
                        <span className="text-gray-400 font-normal">({item.departmentsCountNum})</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}