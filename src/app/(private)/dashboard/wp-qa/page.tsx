'use client';
import { ReportStatusIcon, ReportStatusLegend, ReportValue, MonthlyTableViewport } from '@/components/MonthlyReportStatus';
import { sortMonthlyDepartments } from '@/lib/monthlyReportDepartments';
import ReportMonthHeading from '@/components/ReportMonthHeading';

import React, { useState, useEffect, useMemo, useRef } from 'react';

interface Department {
  id: number | string;
  name: string;
  group?: string | null;
}

interface WpRecord {
  id?: number;
  fiscal_year: number | string;
  department_id: number | string;
  month: number;
  name: string;
  wp: number | null;
  pending?: boolean;
  evaluated?: number;
  practiced?: number;
  reasons?: string[];
}

type IndicatorScore = { name: string; score: number; reasons?: string[] };

const MONTHS = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];

interface TableRow {
  departmentId?: string;
  monthlyDetails: IndicatorScore[][];
  annualDetails: IndicatorScore[];
  labelName: string;
  months: (number | string)[];
  pendingMonths: Set<number>;
  average: number | string;
}

export default function WpQaDashboard() {
  const [selectedYear, setSelectedYear] = useState<string>('2570');
  const [exportMonth, setExportMonth] = useState(10);
  const [selectedDept, setSelectedDept] = useState<string>(''); // ค่าว่าง = ภาพรวมทุกหน่วยงาน
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rawData, setRawData] = useState<WpRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError,setLoadError]=useState('');
  const [invalidRows,setInvalidRows]=useState(0);

  const [detail, setDetail] = useState<{ title: string; scores: IndicatorScore[] } | null>(null);
  const detailPanel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function closeDetail() {
    window.clearTimeout(closeTimer.current);
    detailPanel.current?.hidePopover();
  }

  function scheduleCloseDetail() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(closeDetail, 180);
  }

  function showDetail(anchor: HTMLButtonElement, title: string, scores: IndicatorScore[]) {
    window.clearTimeout(closeTimer.current);
    const panel = detailPanel.current;
    if (!panel) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(440, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const showBelow = below >= 240 || below >= above;
    panel.style.width = width + 'px';
    panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
    panel.style.maxHeight = Math.min(340, showBelow ? below : above) + 'px';
    panel.style.top = showBelow ? rect.bottom + 'px' : 'auto';
    panel.style.bottom = showBelow ? 'auto' : window.innerHeight - rect.top + 'px';
    setDetail({ title, scores });
    if (!panel.matches(':popover-open')) panel.showPopover();
  }

  function scoreButton(row: TableRow, value: number | string, className: string, monthIndex?: number) {
    const title = row.labelName + ' · ' + (monthIndex === undefined ? 'เฉลี่ยทั้งปี' : MONTHS[monthIndex]);
    const month = monthIndex === undefined ? undefined : (monthIndex + 9) % 12 + 1;
    const scores = monthIndex === undefined ? row.annualDetails : row.monthlyDetails[monthIndex].map(score => ({
      ...score,
      reasons: rawData.find(item => Number(item.fiscal_year) === Number(selectedYear) && item.month === month
        && String(item.department_id) === (row.departmentId ?? selectedDept) && item.name === score.name)?.reasons,
    }));
    const open = (event: React.SyntheticEvent<HTMLButtonElement>) => showDetail(event.currentTarget, title, scores);
    return <button type="button" className={className + ' cursor-pointer focus-visible:outline focus-visible:outline-purple-500'}
      aria-label={title + ' ' + Number(value).toFixed(1) + '% ดูรายละเอียด'}
      onMouseEnter={open} onMouseLeave={scheduleCloseDetail} onFocus={open} onBlur={scheduleCloseDetail} onClick={open}>
      {Number(value).toFixed(1)}
    </button>;
  }

  useEffect(() => {
    const controller=new AbortController();
    setLoading(true);setLoadError('');
    (async()=>{try{
      const response=await fetch('/api/wp-qa-report',{cache:'no-store',signal:controller.signal});
      const result=await response.json();
      if(!response.ok||!Array.isArray(result.items)||!Array.isArray(result.departments))throw new Error(result.error||'อ่านรายงาน WP/QA ไม่สำเร็จ');
      if(controller.signal.aborted)return;
      setRawData(result.items);setDepartments(result.departments);setInvalidRows(result.invalid||0);
    }catch(error){if(!controller.signal.aborted){setRawData([]);setDepartments([]);setLoadError(error instanceof Error?error.message:'อ่านรายงาน WP/QA ไม่สำเร็จ');}}
    finally{if(!controller.signal.aborted)setLoading(false);}})();
    return()=>controller.abort();
  }, []);

  const availableYears = useMemo(() => {
    const years = rawData.map(item => String(item.fiscal_year));
    return Array.from(new Set([...years, '2567','2568','2569','2570'])).sort().reverse();
  }, [rawData]);

  // ฟังก์ชันแปลงชื่อหน่วยงานสำหรับปี 2567 และ 2568
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

      let passedIndicators = 0;
      let totalIndicators = 0;

      const formatted: TableRow[] = sortMonthlyDepartments(departments).map((department) => {
        const deptIdStr = String(department.id).trim();
        const monthlyDetails = monthsOrder.map(m =>
          Object.entries(deptGrouped[deptIdStr]?.[m] ?? {}).map(([name, score]) => ({ name, score }))
        );
        const monthValues = monthlyDetails.map((scores) => {
          if (scores.length === 0) return "ไม่มีข้อมูล";
          const passes = scores.filter(({ score }) => score >= 90).length;
          return Number(((passes / scores.length) * 100).toFixed(1));
        });

        const indicatorsMap = deptIndicatorScoresYear[deptIdStr] || {};
        const annualDetails = Object.entries(indicatorsMap).map(([name, scores]) => ({
          name,
          score: scores.reduce((a, b) => a + b, 0) / scores.length,
        }));
        let average: number | string = "ไม่มีข้อมูล";

        if (annualDetails.length > 0) {
          const passIndCount = annualDetails.filter(({ score }) => score >= 90).length;
          passedIndicators += passIndCount;
          totalIndicators += annualDetails.length;
          average = Number(((passIndCount / annualDetails.length) * 100).toFixed(1));
        }

        const rawDeptName = departmentMapName[deptIdStr] || `หน่วยงาน ID: ${deptIdStr}`;
        // ทำการแมปชื่อหน่วยงานตามปีที่เลือก
        const deptName = getMappedDepartmentName(rawDeptName, selectedYear);

        return {
          departmentId: deptIdStr,
          labelName: deptName,
          monthlyDetails,
          annualDetails,
          months: monthValues,
          pendingMonths: new Set(filteredByYear.filter(item => String(item.department_id) === deptIdStr && item.pending).map(item => Number(item.month))),
          average
        };
      });

      const percent = totalIndicators > 0 ? Number(((passedIndicators / totalIndicators) * 100).toFixed(1)) : 0;

      return {
        tableData: formatted,
        passCount: passedIndicators,
        failCount: totalIndicators - passedIndicators,
        summaryPercentage: percent,
        totalItemsCount: totalIndicators
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

        const monthlyDetails = monthsOrder.map((m) => {
          const scores = monthMap[m];
          if (scores && scores.length > 0) {
            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = sum / scores.length;
            return [{ name, score: avg }];
          }
          return [];
        });
        const monthValues = monthlyDetails.map(([item]) => item ? Number(item.score.toFixed(1)) : "ไม่มีข้อมูล");

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
          monthlyDetails,
          annualDetails: typeof indicatorYearAvg === "number" ? [{ name, score: indicatorYearAvg }] : [],
          months: monthValues,
          pendingMonths: new Set(filteredByDept.filter(item => item.name === name && item.pending).map(item => Number(item.month))),
          average: typeof indicatorYearAvg === 'number' ? Number(indicatorYearAvg.toFixed(1)) : indicatorYearAvg,
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
  }, [rawData, selectedYear, selectedDept, departmentMapName, departments]);

  const exportRows = useMemo(() => rawData.filter(item =>
    Number(item.fiscal_year) === Number(selectedYear) && item.month === exportMonth &&
    (!selectedDept || String(item.department_id) === selectedDept) && item.wp !== null
  ), [rawData, selectedYear, exportMonth, selectedDept]);

  function downloadMonthly() {
    const passed = exportRows.filter(item => item.wp! >= 90).length;
    const rows = [
      ['ปีงบประมาณ', selectedYear, 'เดือน', MONTHS[(exportMonth + 2) % 12]],
      ['ประเมิน', exportRows.length, 'ผ่าน', passed, 'ไม่ผ่าน', exportRows.length - passed, 'ร้อยละผ่าน', (passed / exportRows.length * 100).toFixed(1)],
      ['หน่วยงาน', 'ตัวชี้วัด', 'ประเมินแล้ว', 'ปฏิบัติได้', 'ปฏิบัติไม่ได้', 'คะแนน (%)', 'ผลประเมิน', 'สิ่งที่ปฏิบัติไม่ได้ / เหตุผล', 'สถานะ'],
      ...[...exportRows].sort((a, b) => a.wp! - b.wp!).map(item => [
        departments.find(dept => String(dept.id) === String(item.department_id))?.name ?? item.department_id,
        item.name, item.evaluated, item.practiced,
        item.evaluated === undefined || item.practiced === undefined ? undefined : item.evaluated - item.practiced,
        item.wp!.toFixed(1), item.wp! >= 90 ? 'ผ่าน' : 'ไม่ผ่าน',
        item.reasons?.join(' / ') || '—', item.pending ? 'รออนุมัติ' : 'ผลรายงาน',
      ]),
    ];
    const csv = rows.map(row => row.map(value => {
      const cell = String(value ?? '');
      const safeCell = /^[\s]*[=+@-]/.test(cell) ? "'" + cell : cell;
      return '"' + safeCell.replaceAll('"', '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `WP-QA-${selectedYear}-${exportMonth}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
          <h2 className="min-w-0 text-sm font-bold text-gray-800 lg:flex-1 xl:text-base">ผลการประเมินแนวทางปฏิบัติ WP/QA</h2>
          <ReportStatusLegend statuses={['pending','missing']}/>
          <div className="flex flex-wrap items-center gap-1.5 lg:shrink-0 lg:flex-nowrap">
            <div className="flex items-center gap-2">
              <label htmlFor="wp-year" className="whitespace-nowrap text-xs font-semibold text-gray-700">ปีงบประมาณ</label>
              <select
                id="wp-year" value={selectedYear}
                onChange={(e) => { closeDetail(); setSelectedYear(e.target.value); }}
                className="bg-white border border-purple-200 rounded-lg h-8 px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="wp-department" className="whitespace-nowrap text-xs font-semibold text-gray-700">หน่วยงาน</label>
              <select
                id="wp-department" value={selectedDept}
                onChange={(e) => { closeDetail(); setSelectedDept(e.target.value); }}
                className="bg-white border border-purple-200 rounded-lg h-8 px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-w-full w-28 xl:w-32"
              >
                <option value="">ทุกหน่วยงาน</option>
                {sortMonthlyDepartments(departments).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!loadError && !loading && <div className="flex flex-wrap items-center gap-1.5 text-xs lg:shrink-0 lg:flex-nowrap">
          <label htmlFor="wp-export-month">เลือกเดือน</label>
          <input type="month" id="wp-export-month"
            value={`${Number(selectedYear) - (exportMonth >= 10 ? 544 : 543)}-${String(exportMonth).padStart(2, '0')}`}
            min={`${Number(selectedYear) - 544}-10`}
            max={`${Number(selectedYear) - 543}-09`}
            onChange={event => {
              const input = event.currentTarget;
              if (input.value && input.validity.valid) setExportMonth(Number(input.value.slice(-2)));
            }}
            className="rounded-lg border border-purple-200 bg-white h-8 px-2"/>
          <button type="button" onClick={downloadMonthly} disabled={!exportRows.length}
            className="rounded-lg bg-purple-700 h-8 px-3 text-white disabled:opacity-50" aria-label="ดาวน์โหลดสรุปรายเดือน (CSV)">Download</button>
          </div>}
      </div>

      {loadError&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      {!loadError&&invalidRows>0&&<p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">มีข้อมูลจำนวนประเมินหรือผลประเมินไม่ถูกต้อง {invalidRows} รายการ กรุณาตรวจข้อมูลต้นทาง</p>}

      {!loadError && !loading && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-purple-100 bg-purple-50/50 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <span>ผ่านเกณฑ์</span>
          <span className="text-lg font-bold tabular-nums text-purple-700">
            {totalItemsCount > 0 ? summaryPercentage + '%' : <ReportStatusIcon status="missing"/>}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
          <span>ผ่าน <strong className="text-emerald-700">{passCount}</strong></span>
          <span>ไม่ผ่าน <strong className="text-rose-600">{failCount}</strong></span>
          <span>ประเมินทั้งหมด <strong>{totalItemsCount}</strong> ตัวชี้วัด</span>
        </div>
      </div>}

      <div className="overflow-hidden border border-purple-100 rounded-xl shadow-xs" onScrollCapture={closeDetail}>
        <MonthlyTableViewport label="ตาราง WP/QA">
        <table className="min-w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-purple-50/40 text-gray-700 border-b border-purple-100/80">
              <th className="px-3 py-1.5 text-left border-r border-purple-100/80 font-bold text-gray-800 w-auto">
                {selectedDept === '' ? 'ชื่อหน่วยงาน' : 'ชื่อแนวทาง (WP/QA)'}
              </th>
              {MONTHS.map((m) => (
                <ReportMonthHeading key={m} month={m} className="w-[62px]" />
              ))}
              <th className="py-2 px-1 font-bold text-amber-900 w-[72px] bg-amber-50/60 text-xs">เฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="p-6 text-gray-400">กำลังโหลดข้อมูลทั้งหมด...</td>
              </tr>
            ) : loadError ? (
              <tr><td colSpan={14} className="p-6 text-red-700">ไม่สามารถอ่านข้อมูลรายงานได้</td></tr>
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
                    <td className="px-3 py-1.5 text-left border-r border-purple-100/60 font-medium text-gray-800 break-words leading-relaxed w-auto">
                      <span className="inline-flex items-center gap-2">
                        {selectedDept === '' && <span aria-hidden="true" className="shrink-0">🏢</span>}
                        <span title={row.labelName} className={selectedDept === '' ? 'whitespace-nowrap text-indigo-600' : 'max-w-80 truncate'}>{row.labelName}</span>
                      </span>
                    </td>

                    {row.months.map((val, idx) => {
                      if (val === "ไม่มีข้อมูล") return <td key={idx} className="px-1 py-1 text-right"><ReportStatusIcon status="missing"/></td>;
                      const pending = row.pendingMonths.has((idx + 9) % 12 + 1);
                      const badgeStyle = Number(val) >= 90
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : "bg-rose-50 text-rose-700 border-rose-200/80";
                      return (
                        <td key={idx} className="px-1 py-1 text-right border-r border-purple-100/60">
                          <ReportValue align="right" warning={pending && <ReportStatusIcon status="pending"/>}>{scoreButton(row, val, `inline-block rounded-md border px-1.5 py-0.5 text-xs font-semibold ${badgeStyle}`, idx)}</ReportValue>
                        </td>
                      );
                    })}

                    <td className="px-1 py-1 text-right bg-amber-50/10">
                      <div className={`inline-block rounded-md border text-xs px-0.5 py-0.5 font-bold shadow-2xs ${avgStyle}`}>
                        {row.average !== "ไม่มีข้อมูล" ? <ReportValue align="right" warning={row.pendingMonths.size>0&&<ReportStatusIcon status="pending"/>}>{scoreButton(row, row.average, "rounded-sm")}</ReportValue> : <ReportStatusIcon status="missing"/>}
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
        </MonthlyTableViewport>
      </div>

      <div ref={detailPanel} popover="auto" role="region" aria-label="รายละเอียดตัวชี้วัด WP/QA"
        className="fixed inset-auto m-0 overflow-auto rounded-lg border border-purple-200 bg-white p-3 text-left text-xs text-slate-700 shadow-lg"
        onMouseEnter={() => window.clearTimeout(closeTimer.current)} onMouseLeave={scheduleCloseDetail}>
        {detail && <>
          <h3 className="mb-2 font-bold text-slate-900">{detail.title}</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th scope="col" className="py-1 text-left">ตัวชี้วัด</th>
                <th scope="col" className="py-1 text-right">คะแนน (%)</th>
                <th scope="col" className="py-1 text-right">ผลประเมิน</th>
              </tr>
            </thead>
            <tbody>
              {[...detail.scores].sort((a, b) => a.score - b.score).map(({ name, score, reasons }) => (
                <tr key={name} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2">
                    {name}
                    {!!reasons?.length && <ul className="mt-1 list-disc space-y-1 pl-4 text-rose-700">
                      {reasons.map(reason => <li key={reason} className="whitespace-pre-wrap break-words">{reason}</li>)}
                    </ul>}
                    {score < 90 && !reasons?.length && <p className="mt-1 text-slate-500">ไม่มีรายละเอียดที่บันทึกไว้ในมุมมองนี้</p>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{score.toFixed(1)}</td>
                  <td className={`whitespace-nowrap py-1.5 pl-2 text-right font-medium ${score >= 90 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {score >= 90 ? 'ผ่าน' : 'ไม่ผ่าน'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>}
      </div>
    </div>
  );
}
