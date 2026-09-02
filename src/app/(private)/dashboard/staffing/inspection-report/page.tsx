'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Printer } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

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

  const wardOrder = [
    "อายุรกรรม 2", "อายุรกรรม 3", "อายุรกรรม 4", "อายุรกรรม 5", "อายุรกรรม 6", "อายุรกรรม 7",
    "พิเศษอายุรกรรม 5", "พิเศษอายุรกรรม 6", "พิเศษอายุรกรรม 7",
    "Stroke unit", "สงฆ์อาพาธ", "รส 200 ปีล่าง", "รส 200 ปีบน", "รติพัฒน์",
    "ศัลยกรรมประสาท", "ศัลยกรรมกระดูก", "ศัลยกรรมหญิง", "ศัลยกรรมชาย",
    "EENT", "น้อมเกล้า 2", "น้อมเกล้า 3", "น้อมเกล้า 4",
    "กุมารเวชกรรม 1", "กุมารเวชกรรม 2", "Sick newborn", "PICU", "NICU",
    "SICU", "MICU", "RCU", "CCU", "ICCU",
    "สูติกรรมหลังคลอด", "นรีเวชกรรม", "หลวงพอแช่มชั้น 2", "หลวงพ่อแช่มชั้น 3", "หลวงพ่อแช่มชั้น 4", "ห้องคลอด"
  ];

  const formatVal = (val: number) => (val && val !== 0 ? val : '-');

  useEffect(() => {
    async function fetchReportData() {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, Department');

        if (deptError) {
          console.error('Error fetching departments:', deptError);
        }

        const deptMap = new Map();
        if (deptData) {
          deptData.forEach((d: any) => {
            deptMap.set(Number(d.id), d.Department ? d.Department.trim() : '');
          });
        }

        let { data, error } = await supabase
          .from('daily_staffing')
          .select('*')
          .eq('date', selectedDate)
          .eq('shift', selectedShift);

        if (error) {
          console.error('Error fetching inspection report:', error);
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
            const staffNames = item.staff_names || '-';
            
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
        console.error('Error loading report:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [selectedDate, selectedShift]);

  const handlePrint = () => {
    window.print();
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
    <div className="min-h-screen bg-gray-100 text-gray-800 p-2 font-sans flex flex-col items-center">
      
      {/* ส่วนควบคุมด้านบน (ซ่อนตอนพิมพ์) */}
      <div className="w-full bg-white p-3 rounded-xl border border-gray-200 mb-4 shadow-xs flex flex-wrap items-center justify-between print:hidden">
        <div>
          <h1 className="text-sm font-bold text-emerald-900">รายงานพยาบาลเวรตรวจการ</h1>
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
            className="flex items-center space-x-1 bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

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
            position: absolute;
            left: 0;
            top: 0;
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
            font-size: 10.5px !important;
            font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
            border-collapse: collapse !important;
          }
          .report-page-container th, 
          .report-page-container td {
            padding: 2.5px 2px !important; /* เพิ่มความสูงของแถวโดยการขยาย Padding ด้านบนและล่าง */
            word-break: break-word !important;
            font-family: 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
          }
          .print-scroll-fix {
            overflow: visible !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>

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
          <table className="w-full border-collapse border border-black text-center leading-normal text-xs">
            <thead>
              <tr className="bg-gray-100 text-black font-bold">
                <th className="border border-black p-1.5 w-8" rowSpan={2}>ลำดับ</th>
                <th className="border border-black p-1.5 text-left w-[95px] max-w-[95px]" rowSpan={2}>หอผู้ป่วย</th>
                <th className="border border-black p-1.5" colSpan={11}>รายละเอียดข้อมูลแต่ละหน่วยงาน</th>
                <th className="border border-black p-1.5 w-10" rowSpan={2}>คงพยาบาล</th>
                <th className="border border-black p-1.5 text-left w-[290px]" rowSpan={2}>รายชื่อพยาบาลเวร</th>
              </tr>
              <tr className="bg-gray-50 text-[11px] text-black font-semibold">
                <th className="border border-black p-1 w-7">ยอดยกมา</th>
                <th className="border border-black p-1 w-6">รับใหม่</th>
                <th className="border border-black p-1 w-6">รับย้าย</th>
                <th className="border border-black p-1 w-6">จำหน่าย</th>
                <th className="border border-black p-1 w-6">ย้ายไป</th>
                <th className="border border-black p-1 w-6">Dead</th>
                <th className="border border-black p-1 w-6">ผ่าตัด</th>
                <th className="border border-black p-1 w-6">ทารกป่วย</th>
                <th className="border border-black p-1 w-8">High Flow</th>
                <th className="border border-black p-1 w-7">Vent</th>
                <th className="border border-black p-1 w-9">5/4</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} className="py-6 text-center text-gray-500 text-sm">กำลังโหลดรายงานเวรตรวจการ...</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td colSpan={15} className="py-6 text-center text-gray-500 text-sm">ไม่พบข้อมูลรายงานในวันที่และเวรดังกล่าว</td></tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={row.no} className="text-xs">
                    <td className="border border-black p-1">{idx + 1}</td>
                    <td className="border border-black p-1 text-left font-medium truncate">{row.ward}</td>
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
                    <td className="border border-black p-1">{row.nurse5 || row.nurse4 ? `${row.nurse5}/${row.nurse4}` : '-'}</td>
                    <td className="border border-black p-1 font-bold">{formatVal(row.actualStaff)}</td>
                    <td className="border border-black p-1 text-left text-xs">{row.staffNames}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-black text-left text-xs">
                <td className="border border-black p-2" colSpan={15}>
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
                <td className="border border-black p-2">{summaryData.nurse5 || summaryData.nurse4 ? `${summaryData.nurse5}/${summaryData.nurse4}` : '-'}</td>
                <td className="border border-black p-2">{formatVal(summaryData.totalStaff)}</td>
                <td className="border border-black p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  );
}