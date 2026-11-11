'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Printer } from 'lucide-react';
import {INSPECTION_WARDS} from '@/lib/inspectionWards';


const reportHeaderCss = `
.inspection-table{table-layout:fixed;width:100%}
.inspection-table th{vertical-align:middle;text-align:center;overflow:visible}
.inspection-table .vertical-heading{position:relative;height:92px;padding:0!important}
.inspection-table .vertical-heading span{position:absolute;left:50%;top:50%;display:block;white-space:nowrap;word-break:normal;transform:translate(-50%,-50%) rotate(-90deg);line-height:1.2}
.inspection-table .heading-group{padding:4px 2px;white-space:nowrap;font-size:10px}
.inspection-table .patient-category{font-size:8px}
.inspection-table .category-heading{height:28px;padding:3px 1px}
`;

export default function NursingInspectionReportPage() {
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedShift, setSelectedShift] = useState('เวรเช้า');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState({
    totalPatients: 0,
    admit: 0,
    transferIn: 0,
    discharge: 0,
    transferOut: 0,
    death: 0,
    operation: 0,
    sickBaby: 0,
    highFlow: 0,
    ventilator: 0,
    nurse5: 0,
    nurse4: 0,
    totalStaff: 0,
    spontaneousLabor: 0, 
    totalLaborSum: 0,     
    waitingLabor: 0,      
  });

  const wardOrder = INSPECTION_WARDS;

  const formatVal = (val: number) => (val && val !== 0 ? val : '-');

  useEffect(() => {
    const controller = new AbortController();
    async function fetchReportData() {
      try {
        setLoading(true);
        setErrorMessage('');
        setReportData([]);
        const response = await fetch(`/api/staffing/inspection-report-view?${new URLSearchParams({date:selectedDate,shift:selectedShift})}`, {cache:'no-store',signal:controller.signal});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'โหลดรายงานไม่สำเร็จ');
        if (controller.signal.aborted) return;
        const deptData = result.departments;
        const records = result.records || [];
        const normalizeWard = (name:string) => name.replace(/\s/g,'').replace('หลวงพอ','หลวงพ่อ');
        const data = (deptData || []).filter((d:any)=>wardOrder.some(name=>normalizeWard(name)===normalizeWard(d.Department||'')))
          .map((d:any)=>records.find((row:any)=>Number(row.department_id)===Number(d.id)) || {department_id:d.id,missing:true});

        const deptMap = new Map();
        if (deptData) {
          deptData.forEach((d: any) => {
            deptMap.set(Number(d.id), d.Department ? d.Department.trim() : '');
          });
        }

        if (data && data.length > 0) {
          data.sort((a: any, b: any) => {
            const wardA = deptMap.get(Number(a.department_id)) || a.department_name || '';
            const wardB = deptMap.get(Number(b.department_id)) || b.department_name || '';
            
            let indexA = wardOrder.indexOf(wardA);
            let indexB = wardOrder.indexOf(wardB);

            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;

            return indexA - indexB;
          });

          let pTotal = 0, pAdmit = 0, pTIn = 0, pDis = 0, pTOut = 0, pDeath = 0, pOp = 0, pSickBaby = 0, pHighFlow = 0, pVent = 0, p5 = 0, p4 = 0, pStaff = 0;
          let sLabor = 0, tLaborSum = 0, wLabor = 0;
          
          const formatted = data.map((item: any, idx: number) => {
            const nursingCount = Number(item.carry_forward || 0);
            const admit = Number(item.new_admission || 0);
            const transferIn = Number(item.transfer_in || 0);
            const discharge = Number(item.discharge || 0);
            const transferOut = Number(item.transfer_out || 0);
            const death = Number(item.dead || 0);
            const operation = Number(item.surgery || 0);
            const sickBaby = Number(item.sick_baby || 0);
            const highFlow = Number(item.high_flow || 0);
            const ventilator = Number(item.ventilator || 0);
            const nurse5 = Number(item.score_5 || 0);
            const nurse4 = Number(item.score_4 || 0);
            const actualStaff = Number(item.nursing_count || 0);
            const staffNames = Array.isArray(item.staff_names) ? item.staff_names.join(', ') : item.staff_names || '-';
            
            const deptIdNum = Number(item.department_id);
            const wardName = deptMap.get(deptIdNum) || item.department_name || `หน่วยงาน ID: ${item.department_id}`;

            if (wardName === 'ห้องคลอด') {
              sLabor = Number(item.normal_labor || 0);
              tLaborSum = Number(item.normal_labor || 0) + Number(item.surgery || 0);
              wLabor = Number(item.in_labor || 0);
            }

            pTotal += nursingCount;
            pAdmit += admit;
            pTIn += transferIn;
            pDis += discharge;
            pTOut += transferOut;
            pDeath += death;
            pOp += operation;
            pSickBaby += sickBaby;
            pHighFlow += highFlow;
            pVent += ventilator;
            p5 += nurse5;
            p4 += nurse4;
            pStaff += actualStaff;

            return {
              missing: item.missing === true,
              no: idx + 1,
              ward: wardName,
              nursingCount,
              admit,
              transferIn,
              discharge,
              transferOut,
              death,
              operation,
              sickBaby,
              highFlow,
              ventilator,
              nurse5,
              nurse4,
              actualStaff,
              staffNames,
            };
          });

          setReportData(formatted);
          setSummaryData({
            totalPatients: pTotal, admit: pAdmit, transferIn: pTIn, discharge: pDis, transferOut: pTOut,
            death: pDeath, operation: pOp, sickBaby: pSickBaby, highFlow: pHighFlow, ventilator: pVent, nurse5: p5, nurse4: p4, totalStaff: pStaff,
            spontaneousLabor: sLabor, totalLaborSum: tLaborSum, waitingLabor: wLabor,
          });
        } else {
          setReportData([]);
          setSummaryData({
            totalPatients: 0, admit: 0, transferIn: 0, discharge: 0, transferOut: 0,
            death: 0, operation: 0, sickBaby: 0, highFlow: 0, ventilator: 0, nurse5: 0, nurse4: 0, totalStaff: 0,
            spontaneousLabor: 0, totalLaborSum: 0, waitingLabor: 0,
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setErrorMessage(err instanceof Error ? err.message : 'โหลดรายงานไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchReportData();
    return () => controller.abort();
  }, [selectedDate, selectedShift]);

  const handlePrint = () => {
    const report = document.querySelector('.report-page-container');
    if (!report) return;
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) {setErrorMessage('กรุณาอนุญาตหน้าต่างป๊อปอัปสำหรับพิมพ์รายงาน');return;}
    popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>รายงานเวรตรวจการ</title><style>
      @page{size:A4 portrait;margin:8mm 6mm}
      *{box-sizing:border-box}body{margin:0;color:#000;font:11px Tahoma,sans-serif}
      .report-page-container{width:100%;margin:0;padding:0}h2{text-align:center;font-size:15px;margin:0 0 5px}
      .report-page-container>div:first-child{text-align:center;margin-bottom:8px}
      .report-page-container>div:first-child>div{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 12px}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}
      th,td{border:1px solid #000;padding:4px 2px;overflow-wrap:break-word;vertical-align:top;text-align:center}
      ${reportHeaderCss}
      tbody td:nth-child(2),tbody td:last-child{text-align:left}thead{display:table-header-group}
      tfoot{display:table-row-group}tr{break-inside:avoid}th{background:#eee}strong{font-weight:bold}
    </style></head><body>${report.outerHTML}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const formatThaiDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const thaiMonths = [
      '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const thaiYear = parseInt(year, 10) + 543;
    const thaiMonthName = thaiMonths[parseInt(month, 10)];
    return `วันที่ ${parseInt(day, 10)} เดือน ${thaiMonthName} พ.ศ. ${thaiYear}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 pt-0 px-2 pb-2 font-sans flex flex-col items-center">
      
      {/* ส่วนควบคุมด้านบน (ซ่อนตอนพิมพ์) */}
      <div className="w-full bg-white p-3 rounded-xl border border-gray-200 mb-3 gap-3 shadow-xs flex flex-wrap items-center justify-between print:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-sm font-bold text-emerald-900">รายงานพยาบาลเวรตรวจการ</h1>
          <a href="/dashboard/staffing" className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium">← กลับหน้าภาพรวม</a>
        </div>
      </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-2 md:mt-0">
          <div className="flex items-center bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-gray-700 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200">
            <span className="font-semibold text-gray-700">เวร:</span>
            {['เวรเช้า', 'เวรบ่าย', 'เวรดึก'].map((shiftOption) => (
              <label key={shiftOption} className="flex items-center space-x-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="shiftRadio" 
                  checked={selectedShift === shiftOption}
                  onChange={() => setSelectedShift(shiftOption)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>{shiftOption}</span>
              </label>
            ))}
          </div>

          <button 
            onClick={handlePrint}
            disabled={loading || !!errorMessage || reportData.length === 0}
            className="flex items-center space-x-1 bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      <style>{reportHeaderCss}</style>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&display=swap');

        @page {
          size: A4 portrait;
          margin: 4mm 4mm 2mm 4mm;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .report-page-container, .report-page-container * {
            visibility: visible;
          }
          .report-page-container {
            position: fixed;
            left: 0;
            top: 0;
            bottom: auto;
            transform: none !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important; 
            font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
          }
          .report-page-container table {
            width: 100% !important;
            font-size: 10px !important;
            font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
            border-collapse: collapse !important;
          }
          .report-page-container th, 
          .report-page-container td {
            padding: 2.5px 2px !important; /* เพิ่มความสูงของแถวโดยการขยาย Padding ด้านบนและล่าง */
            word-break: break-word !important;
            font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
          }
          .report-page-container thead {display:table-header-group}
          .report-page-container tr {break-inside:avoid}
          .report-page-container td {overflow:visible !important;white-space:normal !important}
          .report-page-container th {word-break:normal !important}
          .print-scroll-fix {
            overflow: visible !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {errorMessage && <div role="alert" className="w-full mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 print:hidden">{errorMessage}</div>}
      {/* กรอบรายงาน */}
      <div className="report-page-container bg-white w-full p-4 rounded-xl border border-gray-300 shadow-md">
        
        <div className="text-center mb-2">
          <h2 className="text-base font-bold text-gray-900">รายงานพยาบาลเวรตรวจการ โรงพยาบาลวชิระภูเก็ต จังหวัดภูเก็ต</h2>
          <div className="mt-1 flex flex-wrap justify-center items-center gap-x-6 gap-y-1 font-medium text-gray-800 text-sm">
            <span>{formatThaiDate(selectedDate)}</span>
            <div className="flex items-center space-x-3">
              <span className="font-semibold">เวลาปฏิบัติงาน</span>
              <span className="inline-flex items-center space-x-1">
                <span className="inline-block w-3 h-3 border border-black text-center leading-[10px] font-bold text-[9px]">{selectedShift === 'เวรเช้า' ? '✓' : ''}</span>
                <span>08.30-16.30 น.</span>
              </span>
              <span className="inline-flex items-center space-x-1">
                <span className="inline-block w-3 h-3 border border-black text-center leading-[10px] font-bold text-[9px]">{selectedShift === 'เวรบ่าย' ? '✓' : ''}</span>
                <span>16.30-00.30 น.</span>
              </span>
              <span className="inline-flex items-center space-x-1">
                <span className="inline-block w-3 h-3 border border-black text-center leading-[10px] font-bold text-[9px]">{selectedShift === 'เวรดึก' ? '✓' : ''}</span>
                <span>00.30-08.30 น.</span>
              </span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto print-scroll-fix">
          <table className="inspection-table w-full border-collapse border border-black text-center leading-normal text-xs">
            <colgroup><col style={{width:'3%'}}/><col style={{width:'13%'}}/>{Array.from({length:10},(_,i)=><col key={i} style={{width:'3.3%'}}/>)}<col style={{width:'3%'}}/><col style={{width:'3%'}}/><col style={{width:'4%'}}/><col style={{width:'41%'}}/></colgroup>
            <thead>
              <tr className="bg-gray-100 text-black font-bold">
                <th className="border border-black p-1" rowSpan={3}>ลำดับ</th>
                <th className="border border-black p-1" rowSpan={3}>หอผู้ป่วย</th>
                <th className="border border-black heading-group" colSpan={13}>รายละเอียดข้อมูลแต่ละหน่วยงาน</th>
                <th className="border border-black p-1" rowSpan={3}>รายชื่อพยาบาลเวร</th>
              </tr>
              <tr className="bg-gray-50 text-[11px] text-black font-semibold">
                {['ยอดยกมา','รับใหม่','รับย้าย','จำหน่าย','ย้ายไป','Dead','ผ่าตัด','ทารกป่วย','High Flow','Ventilator'].map(label=><th key={label} className="border border-black vertical-heading" rowSpan={2} style={{position:"relative",height:92,padding:0,verticalAlign:"middle"}}><span style={{position:"absolute",left:"50%",top:"50%",display:"block",width:"max-content",whiteSpace:"nowrap",wordBreak:"normal",writingMode:"horizontal-tb",transform:"translate(-50%, -50%) rotate(-90deg)",transformOrigin:"center",lineHeight:1.2}}>{label}</span></th>)}
                <th className="border border-black heading-group patient-category" colSpan={2}>ประเภทผู้ป่วย</th>
                <th className="border border-black vertical-heading" rowSpan={2}><span>คงพยาบาล</span></th>
              </tr>
              <tr className="bg-gray-50 text-black font-semibold">
                <th className="border border-black category-heading">5</th>
                <th className="border border-black category-heading">4</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={16} className="py-6 text-center text-gray-500 text-sm">กำลังโหลดรายงานเวรตรวจการ...</td></tr>
              ) : errorMessage ? (
                <tr><td colSpan={16} className="py-6 text-center text-red-700">{errorMessage}</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={16} className="py-6 text-center text-gray-500 text-sm">ไม่พบข้อมูลรายงานในวันที่และเวรดังกล่าว</td></tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={row.no} className="text-xs">
                    <td className="border border-black p-1">{idx + 1}</td>
                    <td className="border border-black p-1 text-left font-medium truncate">{row.ward}</td>
                    {row.missing ? <td colSpan={14} className="border border-black p-1 text-center">ไม่มีข้อมูล</td> : <>
                    <td className="border border-black p-1">{formatVal(row.nursingCount)}</td>
                    <td className="border border-black p-1">{formatVal(row.admit)}</td>
                    <td className="border border-black p-1">{formatVal(row.transferIn)}</td>
                    <td className="border border-black p-1">{formatVal(row.discharge)}</td>
                    <td className="border border-black p-1">{formatVal(row.transferOut)}</td>
                    <td className="border border-black p-1">{formatVal(row.death)}</td>
                    <td className="border border-black p-1">{formatVal(row.operation)}</td>
                    <td className="border border-black p-1">{formatVal(row.sickBaby)}</td>
                    <td className="border border-black p-1">{formatVal(row.highFlow)}</td>
                    <td className="border border-black p-1">{formatVal(row.ventilator)}</td>
                    <td className="border border-black p-1">{formatVal(row.nurse5)}</td>
                    <td className="border border-black p-1">{formatVal(row.nurse4)}</td>
                    <td className="border border-black p-1 font-bold">{formatVal(row.actualStaff)}</td>
                    <td className="border border-black p-1 text-left text-xs">{row.staffNames}</td></>}
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !errorMessage && <tfoot>
              <tr className="bg-gray-50 font-semibold text-black text-left text-xs">
                <td className="border border-black p-2" colSpan={16}>
                  <div className="flex flex-wrap gap-10 px-2">
                    <span>คลอดเอง &nbsp;<strong>{summaryData.spontaneousLabor || '-'}</strong>&nbsp; คน</span>
                    <span>สรุปรวมคลอดทั้งหมด &nbsp;<strong>{summaryData.totalLaborSum || '-'}</strong>&nbsp; คน</span>
                    <span>รอคลอด &nbsp;<strong>{summaryData.waitingLabor || '-'}</strong></span>
                  </div>
                </td>
              </tr>
              <tr className="bg-gray-100 font-bold text-black text-xs">
                <td className="border border-black p-2" colSpan={2}>สรุปรวม</td>
                <td className="border border-black p-2">{formatVal(summaryData.totalPatients)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.admit)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.transferIn)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.discharge)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.transferOut)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.death)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.operation)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.sickBaby)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.highFlow)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.ventilator)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.nurse5)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.nurse4)}</td>
                <td className="border border-black p-2">{formatVal(summaryData.totalStaff)}</td>
                <td className="border border-black p-2"></td>
              </tr>
            </tfoot>}
          </table>
        </div>

      </div>
    </div>
  );
}