'use client';
import { ReportStatusIcon, ReportStatusLegend, ReportValue, MonthlyTableViewport } from '@/components/MonthlyReportStatus';
import { sortMonthlyDepartments } from '@/lib/monthlyReportDepartments';
import ReportMonthHeading from '@/components/ReportMonthHeading';

import React, { useState, useEffect, useMemo } from 'react';
import {auditNoteFields,reportPercent} from '@/lib/audits/report';
import { createClient } from '@/utils/supabase/client';

export default function AuditChartPage() {
  const supabase = useMemo(()=>createClient(),[]);
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error,setError]=useState('');
  const [loading, setLoading] = useState(true);
  const [exportMonth,setExportMonth]=useState(10);
  const [selectedYear, setSelectedYear] = useState<string>('2570');
  
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
        const response=await fetch('/api/audit-chart-report',{cache:'no-store'});
        const body=await response.json();if(!response.ok)throw new Error(body.error||'โหลดรายงานไม่สำเร็จ');
        setData(body.items||[]);setDepartments(body.departments||[]);setError('');
      } catch (err) {
        setError(err instanceof Error?err.message:'โหลดรายงานไม่สำเร็จ');
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
      .on('postgres_changes',{event:'*',schema:'public',table:'nursing_chart_audits'},()=>{fetchData();})
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
    return Array.from(new Set([...years, '2570'])).sort();
  }, [data]);

  const filteredDataByYear = useMemo(() => {
    return data.filter((item) => String(item.fiscal_year) === selectedYear);
  }, [data, selectedYear]);

  const summaryStats = useMemo(() => {
    if (filteredDataByYear.length === 0) {
      return { A: '—', P: '—', I: '—', E: '—', totalAPIE: '—' };
    }

    const values=['a','p','i','e'].map(group=>reportPercent(filteredDataByYear,group));
    const available=values.filter((v):v is number=>v!==null);
    return {A:values[0]?.toFixed(2)??'—',P:values[1]?.toFixed(2)??'—',I:values[2]?.toFixed(2)??'—',E:values[3]?.toFixed(2)??'—',totalAPIE:available.length?(available.reduce((a,b)=>a+b,0)/available.length).toFixed(2):'—'};
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
      
      departmentMap[deptId].months[month] = item.source==='nursing_chart_audits'&&item.total_apie===0?'—':calculatedValue.toFixed(2);
      departmentMap[deptId].sumA += aVal;
      departmentMap[deptId].sumP += pVal;
      departmentMap[deptId].sumI += iVal;
      departmentMap[deptId].sumE += eVal;
      departmentMap[deptId].count += 1;
    });

    return sortMonthlyDepartments(departments).map((dept) => {
      const deptId = String(dept.id ?? dept.department_id);
      const info = departmentMap[deptId];

      const records=filteredDataByYear.filter(row=>String(row.department_id)===deptId);
      const pctA=reportPercent(records,'a'),pctP=reportPercent(records,'p'),pctI=reportPercent(records,'i'),pctE=reportPercent(records,'e');
      const valid=[pctA,pctP,pctI,pctE].filter((v):v is number=>v!==null);
      const avgTotal=valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
      return {
        departmentId: deptId,
        departmentName: info?.name ?? getMappedDepartmentName(departmentMapName[deptId], selectedYear),
        months: info?.months ?? {},
        pendingMonths: new Set(records.filter(r=>r.pending).map(r=>String(r.month))),
        pctA: pctA?.toFixed(1)??'—',
        pctP: pctP?.toFixed(1)??'—',
        pctI: pctI?.toFixed(1)??'—',
        pctE: pctE?.toFixed(1)??'—',
        avgTotal: avgTotal?.toFixed(1)??'—'
      };
    });
  }, [filteredDataByYear, departmentMapName, selectedYear, departments]);

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

      const pctA=reportPercent(yearRows,'a'),pctP=reportPercent(yearRows,'p'),pctI=reportPercent(yearRows,'i'),pctE=reportPercent(yearRows,'e');
      const valid=[pctA,pctP,pctI,pctE].filter((v):v is number=>v!==null);
      const avgTotal=valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
      return {
        year,
        A: pctA?.toFixed(1)??'—',
        P: pctP?.toFixed(1)??'—',
        I: pctI?.toFixed(1)??'—',
        E: pctE?.toFixed(1)??'—',
        avg: avgTotal?.toFixed(1)??'—'
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
      const pctA=reportPercent([targetRow],'a')?.toFixed(1)??'—';
      const pctP=reportPercent([targetRow],'p')?.toFixed(1)??'—';
      const pctI=reportPercent([targetRow],'i')?.toFixed(1)??'—';
      const pctE=reportPercent([targetRow],'e')?.toFixed(1)??'—';
      const rawDC=targetRow.source==='nursing_chart_audits'?(reportPercent([targetRow],'d_c')?.toFixed(1)??'—')+'%':String(targetRow.d_c??targetRow.dc??'—');
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

  const exportMonthCode=String(exportMonth);
  const hasExportData=tableRows.some(row=>row.months[exportMonthCode]!==undefined||row.pendingMonths.has(exportMonthCode));
  function downloadMonthly(){
    const rows=[
      ['Audit Chart','ปีงบประมาณ',selectedYear,'เดือน',exportMonth],
      ['หน่วยงาน','A (%)','P (%)','I (%)','E (%)','APIE (%)','สถานะ',...auditNoteFields.map((_,index)=>index<5?`หมายเหตุส่วนที่ ${index+1}`:'หมายเหตุทั่วไป')],
      ...tableRows.map(row=>{
        const records=filteredDataByYear.filter(item=>String(item.department_id)===row.departmentId&&Number(item.month)===exportMonth);
        const score=row.months[exportMonthCode];
        const notes=auditNoteFields.map(field=>{
          const values=records.flatMap(item=>item.audit_notes?.[field]??[item[field]??(field==='notes'?item.remark:undefined)])
            .filter((note):note is string=>typeof note==='string'&&!!note.trim());
          const formatted=field==='notes'?values:values.map(note=>note.replace(
            /^(s[1-5]_[a-z0-9_]+)(?=\s*:)/gm,
            (key)=>key.slice(1).split("_").map(part=>part.toUpperCase()).join("."),
          ));
          return [...new Set(formatted)].join('\n\n');
        });
        return [row.departmentName,...['a','p','i','e'].map(group=>reportPercent(records,group)?.toFixed(1)),
          score,row.pendingMonths.has(exportMonthCode)?'รออนุมัติ':score===undefined?'รอข้อมูล':'มีผลรายงาน',...notes];
      }),
    ];
    const csv=rows.map(row=>row.map(value=>{
      const cell=String(value??'');
      const safeCell=/^\s*[=+@-]/.test(cell)?"'"+cell:cell;
      return '"'+safeCell.replaceAll('"','""')+'"';
    }).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;
    link.download=`Audit-Chart-${selectedYear}-${String(exportMonth).padStart(2,'0')}.csv`;
    link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1480px] space-y-3 px-3 py-4 sm:px-5 lg:px-6">
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-100 bg-white px-5 py-3 shadow-sm ">
        <div className="min-w-0"><h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">Audit Chart</h1></div>
        <ReportStatusLegend statuses={['pending','waiting']}/>
        <label className="flex shrink-0 items-center gap-3 text-sm font-semibold text-slate-600">ปีงบประมาณ<select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} className="h-11 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-500">{fiscalYears.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor="audit-export-month" className="font-semibold text-slate-700">เลือกเดือน</label>
          <input id="audit-export-month" type="month"
            value={`${Number(selectedYear)-(exportMonth>=10?544:543)}-${String(exportMonth).padStart(2,'0')}`}
            min={`${Number(selectedYear)-544}-10`} max={`${Number(selectedYear)-543}-09`}
            onChange={event=>{
              const input=event.currentTarget;
              if(input.value&&input.validity.valid)setExportMonth(Number(input.value.slice(-2)));
            }}
            className="h-8 rounded-lg border border-teal-200 bg-white px-2 text-slate-700"/>
          <button type="button" onClick={downloadMonthly} disabled={loading||!!error||!hasExportData}
            className="h-8 rounded-lg bg-teal-700 px-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">Download</button>
        </div>
      </header>
      <section aria-label="สรุปคะแนน APIE" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {([{code:'A',name:'การประเมิน',english:'Assessment',value:summaryStats.A},{code:'P',name:'การวางแผน',english:'Planning',value:summaryStats.P},{code:'I',name:'การปฏิบัติ',english:'Implementation',value:summaryStats.I},{code:'E',name:'การประเมินผล',english:'Evaluation',value:summaryStats.E}]).map(card=><div key={card.code} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="mb-1 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-50 text-sm font-extrabold text-teal-700">{card.code}</span><span className="text-xs font-semibold text-slate-600">{card.name}</span></div><p className="text-2xl font-extrabold tabular-nums text-slate-900">{card.value}<span className="ml-1 text-sm font-medium text-slate-400">{card.value==='—'?'':'%'}</span></p></div>)}
        <div className="col-span-2 flex flex-col justify-center rounded-2xl bg-teal-800 px-4 py-3 text-white shadow-sm lg:col-span-1"><p className="text-xs font-semibold text-teal-100">คะแนนเฉลี่ยรวม APIE</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{summaryStats.totalAPIE}<span className="ml-1 text-base text-teal-200">{summaryStats.totalAPIE==='—'?'':'%'}</span></p></div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4"><div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-sm font-bold text-slate-800">ผลการประเมินรายหน่วยงาน</h2><p className="text-xs text-slate-400">{tableRows.length} หน่วยงาน · ตุลาคม – กันยายน · คะแนนร้อยละ</p></div><div className="flex items-center gap-4 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/>ตั้งแต่ 90%</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"/>ต่ำกว่า 90%</span></div></div>
        <MonthlyTableViewport label="ตาราง Audit Chart">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th className="px-4 py-1.5 border-r border-gray-100 text-left sticky left-0 bg-slate-50 z-10 w-[16%]">หน่วยงาน</th>
              {allMonths.map((m) => (
                <ReportMonthHeading key={m.code} month={m.code} className="!px-0.5" />
              ))}
              <th className="px-0.5 py-1.5 border-r border-gray-100 text-right w-[4%] bg-teal-50 text-xs">A</th>
              <th className="px-0.5 py-1.5 border-r border-gray-100 text-right w-[4%] bg-teal-50 text-xs">P</th>
              <th className="px-0.5 py-1.5 border-r border-gray-100 text-right w-[4%] bg-teal-50 text-xs">I</th>
              <th className="px-0.5 py-1.5 border-r border-gray-100 text-right w-[4%] bg-teal-50 text-xs">E</th>
              <th className="px-0.5 py-1.5 text-right w-[7%] bg-teal-100 text-teal-950 text-xs">เฉลี่ย</th>
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
                  <tr key={index} className="group hover:bg-teal-50/30 transition-colors">
                    <td className="px-4 py-1.5 border-r border-gray-100 font-medium text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-teal-50">
                      <button 
                        onClick={() => setSelectedDeptModal({ id: row.departmentId, name: row.departmentName })}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline text-left font-medium flex w-full min-w-0 items-center gap-1"
                        title={row.departmentName + " · คลิกเพื่อดูสรุป 3 ปีย้อนหลัง"}
                      >
                        <span aria-hidden="true" className="shrink-0">🏢</span>
                        <span className="min-w-0 truncate">{row.departmentName}</span>
                      </button>
                    </td>
                    {allMonths.map((m) => {
                      const valStr = row.months[m.code];
                      const numVal = valStr !== undefined ? parseFloat(valStr) : null;
                      const isLow = numVal !== null && numVal < 90;

                      return (
                        <td key={m.code} className="px-0.5 py-1.5 border-r border-gray-100 text-right">
                          {numVal !== null && Number.isFinite(numVal) ? (
                            <ReportValue align="compact" warning={row.pendingMonths.has(m.code)&&<ReportStatusIcon status="pending"/>}>
                            <button
                              onClick={() => handleCellClick(row.departmentId, row.departmentName, m.code, m.label)}
                              className={`inline-block px-0.5 py-0.5 rounded-lg text-xs tabular-nums font-semibold cursor-pointer hover:scale-105 transition-transform ${
                                isLow
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {numVal.toFixed(1)}
                            </button></ReportValue>
                          ) : (
                            <ReportStatusIcon status="waiting"/>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="px-0.5 py-1.5 border-r border-gray-100 text-right bg-gray-50/50">
                      <span className={`text-xs tabular-nums font-bold ${valA < 90 ? 'text-red-600' : 'text-teal-700'}`}>
                        {row.pctA}
                      </span>
                    </td>
                    <td className="px-0.5 py-1.5 border-r border-gray-100 text-right bg-gray-50/50">
                      <span className={`text-xs tabular-nums font-bold ${valP < 90 ? 'text-red-600' : 'text-teal-700'}`}>
                        {row.pctP}
                      </span>
                    </td>
                    <td className="px-0.5 py-1.5 border-r border-gray-100 text-right bg-gray-50/50">
                      <span className={`text-xs tabular-nums font-bold ${valI < 90 ? 'text-red-600' : 'text-teal-700'}`}>
                        {row.pctI}
                      </span>
                    </td>
                    <td className="px-0.5 py-1.5 border-r border-gray-100 text-right bg-gray-50/50">
                      <span className={`text-xs tabular-nums font-bold ${valE < 90 ? 'text-red-600' : 'text-teal-700'}`}>
                        {row.pctE}
                      </span>
                    </td>
                    <td className="px-0.5 py-1.5 text-right bg-teal-50/70">
                      <span className={`text-xs tabular-nums font-extrabold ${valAvg < 90 ? 'text-red-600' : 'text-teal-950'}`}>
                        {Number.isFinite(valAvg) ? <ReportValue align="compact" warning={row.pendingMonths.size>0&&<ReportStatusIcon status="pending"/>}>{row.avgTotal}</ReportValue> : row.avgTotal}
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
        </MonthlyTableViewport>
      </section>

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
                <span className="font-extrabold text-teal-700 text-base">{selectedCellDetail?.a}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">P (Planning)</span>
                <span className="font-extrabold text-teal-700 text-base">{selectedCellDetail?.p}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">I (Implementation)</span>
                <span className="font-extrabold text-teal-700 text-base">{selectedCellDetail?.i}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-semibold text-gray-700 text-sm">E (Evaluation)</span>
                <span className="font-extrabold text-teal-700 text-base">{selectedCellDetail?.e}</span>
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
                สรุปผล 3 ปีย้อนหลัง: <span className="text-teal-700">{selectedDeptModal.name}</span>
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