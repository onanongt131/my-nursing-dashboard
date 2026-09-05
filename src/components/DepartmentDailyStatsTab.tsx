// src/components/DepartmentDailyStatsTab.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/solid';

export default function DepartmentDailyStatsTab({ departmentId }: { departmentId: string | number }) {
  const supabase = createClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // รูปแบบ YYYY-MM
  const [statsData, setStatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const fetchDailyStats = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);

    const startDate = `${selectedMonth}-01`;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    const lastDayDate = new Date(year, month, 0).getDate();
    const endDate = `${selectedMonth}-${String(lastDayDate).padStart(2, '0')}`;

    const [statsRes, deptRes] = await Promise.all([
      supabase
        .from('daily_staffing')
        .select('*')
        .eq('department_id', departmentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('shift', { ascending: true }),
      supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single()
    ]);

    if (statsRes.error) {
      console.error('Error fetching daily_staffing:', statsRes.error);
      setStatsData([]);
    } else {
      setStatsData(statsRes.data || []);
    }

    if (deptRes.data) {
      setDepartmentName(deptRes.data.name || deptRes.data.Department || '');
    }

    setLoading(false);
  }, [supabase, departmentId, selectedMonth]);

  useEffect(() => {
    fetchDailyStats();
  }, [fetchDailyStats]);

  // 1. จัดกลุ่มตามวันที่ เพื่อคำนวณค่าเฉลี่ย NP รายวัน
  const dailyGroups = statsData.reduce((acc: any, row) => {
    const d = row.date;
    if (!acc[d]) {
      acc[d] = { shifts: [], npSum: 0, count: 0 };
    }
    acc[d].shifts.push(row);
    acc[d].npSum += Number(row.np || 0);
    acc[d].count += 1;
    return acc;
  }, {});

  const dailyAverages = Object.keys(dailyGroups).reduce((acc: any, d) => {
    const group = dailyGroups[d];
    acc[d] = group.count > 0 ? group.npSum / group.count : 0;
    return acc;
  }, {});

  const daysArray = Object.keys(dailyGroups).sort();
  const totalDays = daysArray.length;

  // แบ่งวันออกเป็นชุดละ 8 วัน สำหรับแยกหน้าพิมพ์
  const dayChunks: string[][] = [];
  for (let i = 0; i < daysArray.length; i += 8) {
    dayChunks.push(daysArray.slice(i, i + 8));
  }

  let sumDailyAverages = 0;
  daysArray.forEach(d => {
    sumDailyAverages += dailyAverages[d];
  });
  const monthlyAveragePerDay = totalDays > 0 ? sumDailyAverages / totalDays : 0;

  const firstDate = daysArray[0];
  const lastDate = daysArray[daysArray.length - 1];

  // 2. คำนวณผลรวมตามเงื่อนไข
  const totals = statsData.reduce((acc, row) => {
    if (row.date === firstDate && (row.shift === 'เวรดึก' || row.shift?.includes('ดึก'))) {
      acc.carry_forward += Number(row.carry_forward || 0);
    }
    if (row.date === lastDate && (row.shift === 'เวรบ่าย' || row.shift?.includes('บ่าย'))) {
      acc.remaining += Number(row.nursing_count || 0);
    }
    acc.new_admission += Number(row.new_admission || 0);
    acc.transfer_in += Number(row.transfer_in || 0);
    acc.discharge += Number(row.discharge || 0);
    acc.transfer_out += Number(row.transfer_out || 0);
    acc.dead += Number(row.dead || 0);
    acc.high_flow += Number(row.high_flow || 0);
    acc.ventilator += Number(row.ventilator || 0);
    acc.score_5 += Number(row.score_gt_5 ?? row.score_5 ?? 0);
    acc.score_4 += Number(row.score_4 || 0);
    acc.score_3 += Number(row.score_3 || 0);
    acc.score_2 += Number(row.score_2 || 0);
    acc.score_1 += Number(row.score_1 || 0);
    return acc;
  }, {
    carry_forward: 0, new_admission: 0, transfer_in: 0, discharge: 0, 
    transfer_out: 0, dead: 0, remaining: 0, high_flow: 0, ventilator: 0, 
    score_5: 0, score_4: 0, score_3: 0, score_2: 0, score_1: 0
  });

  let lastRenderedDate = '';

  const formatThaiMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthName = thaiMonths[Number(m) - 1] || '';
    const thaiYear = Number(y) + 543;
    return `${monthName} ${thaiYear}`;
  };

  // ฟังก์ชันพิมพ์ผ่านหน้าต่างแยกอิสระ (ปรับลดระยะเพื่อให้พอดีใน 1 หน้ากระดาษ)
  const handleDirectPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let chunksHTML = '';
    dayChunks.forEach((chunkDays, chunkIndex) => {
      const chunkStats = statsData.filter(row => chunkDays.includes(row.date));
      let printLastRenderedDate = '';

      let rowsHTML = '';
      chunkStats.forEach((row) => {
        const isNewDate = row.date !== printLastRenderedDate;
        if (isNewDate) {
          printLastRenderedDate = row.date;
        }
        const rowSpanCount = isNewDate ? (dailyGroups[row.date]?.count || 1) : 1;
        const dayAvgNp = dailyAverages[row.date] || 0;

        rowsHTML += `
          <tr>
            <td>${row.date}</td>
            <td style="font-weight: bold; color: #047857;">${row.shift}</td>
            <td>${row.carry_forward ?? 0}</td>
            <td>${row.new_admission ?? 0}</td>
            <td>${row.transfer_in ?? 0}</td>
            <td>${row.discharge ?? 0}</td>
            <td>${row.transfer_out ?? 0}</td>
            <td style="font-weight: 600;">${row.dead ?? 0}</td>
            <td style="font-weight: bold; background-color: #ecfdf5;">${row.nursing_count ?? 0}</td>
            <td>${row.high_flow ?? 0}</td>
            <td>${row.ventilator ?? 0}</td>
            <td>${row.score_gt_5 ?? row.score_5 ?? 0}</td>
            <td>${row.score_4 ?? 0}</td>
            <td>${row.score_3 ?? 0}</td>
            <td>${row.score_2 ?? 0}</td>
            <td>${row.score_1 ?? 0}</td>
            ${isNewDate ? `<td rowspan="${rowSpanCount}" style="font-weight: bold; background-color: #f0fdf4; vertical-align: middle;">${Number(dayAvgNp).toFixed(2)}</td>` : ''}
            <td style="text-align: left; padding-left: 6px; padding-right: 6px;">${Array.isArray(row.staff_names) ? row.staff_names.join(', ') : (row.staff_names || '-')}</td>
          </tr>
        `;
      });

      let tfootHTML = '';
      if (chunkIndex === dayChunks.length - 1 && statsData.length > 0) {
        tfootHTML = `
          <tr style="background-color: #d1fae5; font-weight: bold;">
            <td colspan="2" style="text-align: right; padding: 4px 2px;">รวมทั้งสิ้น:</td>
            <td>${totals.carry_forward}</td>
            <td>${totals.new_admission}</td>
            <td>${totals.transfer_in}</td>
            <td>${totals.discharge}</td>
            <td>${totals.transfer_out}</td>
            <td style="color: #dc2626;">${totals.dead}</td>
            <td style="background-color: #a7f3d0;">${totals.remaining}</td>
            <td>${totals.high_flow}</td>
            <td>${totals.ventilator}</td>
            <td>${totals.score_5}</td>
            <td>${totals.score_4}</td>
            <td>${totals.score_3}</td>
            <td>${totals.score_2}</td>
            <td>${totals.score_1}</td>
            <td style="background-color: #99f6e4;">${monthlyAveragePerDay.toFixed(2)}</td>
            <td style="text-align: left; padding-left: 6px;">ค่าเฉลี่ย NP ภาพรวมรายวัน</td>
          </tr>
        `;
      }

      chunksHTML += `
        <div class="page-block">
          <h2>รายงานสถิติ หอผู้ป่วย ${departmentName || '..................................................'}</h2>
          <p>ประจำเดือน ${formatThaiMonth(selectedMonth)} (หน้า ${chunkIndex + 1}/${dayChunks.length})</p>
          <table>
            <thead>
              <tr>
                <th style="width: 7%;">วัน/เดือน/ปี</th>
                <th style="width: 5%;">เวร</th>
                <th style="width: 3.2%;">ยอดยกมา</th>
                <th style="width: 2.8%;">รับใหม่</th>
                <th style="width: 2.8%;">รับย้าย</th>
                <th style="width: 3.2%;">จำหน่าย</th>
                <th style="width: 2.8%;">ย้ายไป</th>
                <th style="width: 2.8%;">DEAD</th>
                <th style="width: 4.2%;">คงพยาบาล</th>
                <th style="width: 2.8%;">HF</th>
                <th style="width: 2.8%;">Vent</th>
                <th style="width: 2.2%;">5</th>
                <th style="width: 2.2%;">4</th>
                <th style="width: 2.2%;">3</th>
                <th style="width: 2.2%;">2</th>
                <th style="width: 2.2%;">1</th>
                <th style="width: 5%;">NP</th>
                <th style="width: 26.4%;">รายชื่อพยาบาล</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
              ${tfootHTML}
            </tbody>
          </table>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงานสถิติ หอผู้ป่วย ${departmentName}</title>
        <style>
          @page { size: A4 landscape; margin: 4mm; }
          body { font-family: sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 0; background: white; }
          .page-block {
            box-sizing: border-box;
            padding: 2mm 2mm 8mm 2mm;
            min-height: 100vh;
            page-break-after: always;
            break-after: page;
          }
          .page-block:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          h2 { text-align: center; margin-bottom: 2px; font-size: 13px; color: #0f172a; }
          p { text-align: center; margin-top: 0; margin-bottom: 6px; font-size: 10px; color: #475569; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 4px 1px; text-align: center; font-size: 9px; color: #0f172a; }
          td { border: 1px solid #cbd5e1; padding: 5.5px 1px; text-align: center; overflow: hidden; word-break: break-word; }
          tr { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        ${chunksHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* ส่วนควบคุมบนหน้าเว็บปกติ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>📊 รายงานสถิติหอผู้ป่วย ประจำเดือน {selectedMonth}</span>
        </h3>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">เลือกเดือน:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>ตรวจสอบก่อนพิมพ์</span>
          </button>
        </div>
      </div>

      {/* ตารางแสดงผลปกติบนหน้าเว็บ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[700px]">
          <table className="w-full divide-y divide-slate-200 text-xs text-center border-collapse table-fixed">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="w-[7%] px-0.5 py-3 border-r border-slate-300 bg-slate-100">วัน/เดือน/ปี</th>
                <th className="w-[5%] px-0.5 py-3 border-r border-slate-300 bg-slate-100">เวร</th>
                <th className="w-[3.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">ยอดยกมา</th>
                <th className="w-[2.8%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">รับใหม่</th>
                <th className="w-[2.8%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">รับย้าย</th>
                <th className="w-[3.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">จำหน่าย</th>
                <th className="w-[2.8%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">ย้ายไป</th>
                <th className="w-[2.8%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">DEAD</th>
                <th className="w-[4.2%] px-0.1 py-3 border-r border-slate-300 bg-emerald-50/80 text-emerald-900">คงพยาบาล</th>
                <th className="w-[2.8%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">HF</th>
                <th className="w-[2.8%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">Vent</th>
                <th className="w-[2.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">5</th>
                <th className="w-[2.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">4</th>
                <th className="w-[2.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">3</th>
                <th className="w-[2.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">2</th>
                <th className="w-[2.2%] px-0.1 py-3 border-r border-slate-200 bg-slate-100">1</th>
                <th className="w-[5%] px-0.5 py-3 border-r border-slate-300 bg-teal-50 text-teal-900">NP</th>
                <th className="w-[26.4%] px-2 py-3 text-left bg-slate-100">รายชื่อพยาบาล</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-12 text-slate-500 font-medium">กำลังโหลดข้อมูลสถิติ...</td>
                </tr>
              ) : statsData.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-slate-400 font-medium">ไม่พบข้อมูลสถิติประจำเดือน {selectedMonth}</td>
                </tr>
              ) : (
                statsData.map((row, index) => {
                  const isNewDate = row.date !== lastRenderedDate;
                  if (isNewDate) {
                    lastRenderedDate = row.date;
                  }

                  const rowSpanCount = isNewDate ? (dailyGroups[row.date]?.count || 1) : 1;
                  const dayAvgNp = dailyAverages[row.date] || 0;

                  return (
                    <tr key={row.id || index} className="hover:bg-slate-50/80 transition">
                      <td className="px-1 py-2 border-r border-slate-200 whitespace-nowrap font-medium text-slate-700 bg-slate-50/40">
                        {row.date}
                      </td>
                      <td className="px-0.5 py-2 border-r border-slate-200 whitespace-nowrap font-bold text-emerald-700">
                        {row.shift}
                      </td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.carry_forward ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.new_admission ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.transfer_in ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.discharge ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.transfer_out ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200 font-semibold">{row.dead ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200 font-bold text-slate-900 bg-emerald-50/30">
                        {row.nursing_count ?? 0}
                      </td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.high_flow ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.ventilator ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.score_gt_5 ?? row.score_5 ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.score_4 ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.score_3 ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.score_2 ?? 0}</td>
                      <td className="px-0.1 py-2 border-r border-slate-200">{row.score_1 ?? 0}</td>
                      
                      {isNewDate && (
                        <td 
                          rowSpan={rowSpanCount} 
                          className="px-0.5 py-2 border-r border-slate-300 text-teal-800 font-extrabold bg-teal-50/50 align-middle text-xs"
                        >
                          {Number(dayAvgNp).toFixed(2)}
                        </td>
                      )}

                      <td className="px-2 py-2 text-left text-slate-700 truncate" title={Array.isArray(row.staff_names) ? row.staff_names.join(', ') : (row.staff_names || '')}>
                        {Array.isArray(row.staff_names) ? row.staff_names.join(', ') : (row.staff_names || '-')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {statsData.length > 0 && (
              <tfoot className="bg-emerald-100/90 font-extrabold text-slate-900 border-t-2 border-emerald-600">
                <tr>
                  <td colSpan={2} className="px-2 py-3 border-r border-slate-300 text-right">
                    รวมทั้งสิ้น ({statsData.length} เวร / {totalDays} วัน):
                  </td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.carry_forward}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.new_admission}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.transfer_in}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.discharge}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.transfer_out}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200 text-red-600">{totals.dead}</td>
                  <td className="px-0.1 py-3 border-r border-slate-300 bg-emerald-200/50">{totals.remaining}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.high_flow}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.ventilator}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.score_5}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.score_4}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.score_3}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.score_2}</td>
                  <td className="px-0.1 py-3 border-r border-slate-200">{totals.score_1}</td>
                  <td className="px-1 py-3 border-r border-slate-300 text-teal-900 bg-teal-100/80 text-xs">
                    {monthlyAveragePerDay.toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-left text-emerald-950">ค่าเฉลี่ย NP ภาพรวมรายวัน</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal พรีวิวก่อนพิมพ์ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6">
          <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col my-auto overflow-hidden">
            
            {/* แถบหัว Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">
                พรีวิวรายงานสถิติ หอผู้ป่วย {departmentName || '..................................................'} ประจำเดือน {formatThaiMonth(selectedMonth)}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDirectPrint}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>สั่งพิมพ์เอกสาร (แนวนอน)</span>
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span>ปิด</span>
                </button>
              </div>
            </div>

            {/* ส่วนพรีวิวบนหน้าจอ (แก้ไขการประกาศตัวแปรเช็ควันใหม่ให้ถูกต้อง) */}
            <div className="p-6 bg-slate-100 overflow-y-auto max-h-[80vh] flex justify-center">
              <div className="bg-white p-6 shadow-md rounded-xl w-full max-w-[1200px] space-y-4">
                
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold text-slate-900">
                    รายงานสถิติ หอผู้ป่วย {departmentName || '..................................................'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-600">
                    ประจำเดือน {formatThaiMonth(selectedMonth)}
                  </p>
                </div>

                <table className="w-full divide-y divide-slate-300 text-xs text-center border border-slate-300 table-fixed">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="w-[7%] px-0.5 py-2.5 border border-slate-300">วัน/เดือน/ปี</th>
                      <th className="w-[5%] px-0.5 py-2.5 border border-slate-300">เวร</th>
                      <th className="w-[3.2%] px-0.1 py-2.5 border border-slate-300">ยอดยกมา</th>
                      <th className="w-[2.8%] px-0.1 py-2.5 border border-slate-300">รับใหม่</th>
                      <th className="w-[2.8%] px-0.1 py-2.5 border border-slate-300">รับย้าย</th>
                      <th className="w-[3.2%] px-0.1 py-2.5 border border-slate-300">จำหน่าย</th>
                      <th className="w-[2.8%] px-0.1 py-2.5 border border-slate-300">ย้ายไป</th>
                      <th className="w-[2.8%] px-0.1 py-2.5 border border-slate-300">DEAD</th>
                      <th className="w-[4.2%] px-0.1 py-2.5 border border-slate-300 bg-emerald-50">คงพยาบาล</th>
                      <th className="w-[2.8%] px-0.1 py-2.5 border border-slate-300">HF</th>
                      <th className="w-[2.8%] px-0.1 py-2.5 border border-slate-300">Vent</th>
                      <th className="w-[2.2%] px-0.1 py-2.5 border border-slate-300">5</th>
                      <th className="w-[2.2%] px-0.1 py-2.5 border border-slate-300">4</th>
                      <th className="w-[2.2%] px-0.1 py-2.5 border border-slate-300">3</th>
                      <th className="w-[2.2%] px-0.1 py-2.5 border border-slate-300">2</th>
                      <th className="w-[2.2%] px-0.1 py-3 border border-slate-300">1</th>
                      <th className="w-[5%] px-0.5 py-2.5 border border-slate-300 bg-teal-50">NP</th>
                      <th className="w-[26.4%] px-2 py-2.5 text-left border border-slate-300">รายชื่อพยาบาล</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-300 text-[11px]">
                    {(() => {
                      let previewLastDate = '';
                      return statsData.map((row, index) => {
                        const isNewDate = row.date !== previewLastDate;
                        if (isNewDate) {
                          previewLastDate = row.date;
                        }
                        const rowSpanCount = isNewDate ? (dailyGroups[row.date]?.count || 1) : 1;
                        const dayAvgNp = dailyAverages[row.date] || 0;

                        return (
                          <tr key={row.id || index}>
                            <td className="px-1 py-1.5 border border-slate-300 font-medium text-slate-700">{row.date}</td>
                            <td className="px-0.5 py-1.5 border border-slate-300 font-bold text-emerald-700">{row.shift}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.carry_forward ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.new_admission ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.transfer_in ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.discharge ?? 0}</td>
                            <td className="px-0.1 py-2 border border-slate-300">{row.transfer_out ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300 font-semibold">{row.dead ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300 font-bold bg-emerald-50/50">{row.nursing_count ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.high_flow ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.ventilator ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.score_gt_5 ?? row.score_5 ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.score_4 ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.score_3 ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.score_2 ?? 0}</td>
                            <td className="px-0.1 py-1.5 border border-slate-300">{row.score_1 ?? 0}</td>
                            
                            {isNewDate && (
                              <td rowSpan={rowSpanCount} className="px-0.5 py-1.5 border border-slate-300 text-teal-800 font-extrabold bg-teal-50/50 align-middle text-xs">
                                {Number(dayAvgNp).toFixed(2)}
                              </td>
                            )}

                            <td className="px-2 py-1.5 text-left border border-slate-300 text-slate-700">
                              {Array.isArray(row.staff_names) ? row.staff_names.join(', ') : (row.staff_names || '-')}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  {statsData.length > 0 && (
                    <tfoot className="bg-emerald-100 font-extrabold text-slate-900 text-[11px]">
                      <tr>
                        <td colSpan={2} className="px-2 py-2.5 border border-slate-300 text-right">รวมทั้งสิ้น:</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.carry_forward}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.new_admission}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.transfer_in}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.discharge}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.transfer_out}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300 text-red-600">{totals.dead}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300 bg-emerald-200">{totals.remaining}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.high_flow}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.ventilator}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.score_5}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.score_4}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.score_3}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.score_2}</td>
                        <td className="px-0.1 py-2.5 border border-slate-300">{totals.score_1}</td>
                        <td className="px-1 py-2.5 border border-slate-300 bg-teal-100">{monthlyAveragePerDay.toFixed(2)}</td>
                        <td className="px-2 py-2.5 text-left border border-slate-300">ค่าเฉลี่ย NP ภาพรวมรายวัน</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}