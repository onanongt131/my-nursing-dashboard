// src/app/(private)/dashboard/staffing/schedule/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CheckCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';

interface RosterRecord {
  staff_id: number | string;
  date: string;
  shift: string;
}

export default function StaffingSchedulePage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | number>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rosterData, setRosterData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // คำนวณจำนวนวันในเดือนที่เลือก
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  // ฟังก์ชันเช็คว่าวันที่นั้นๆ เป็นวันเสาร์ (6) หรือวันอาทิตย์ (0) หรือไม่
  const isWeekend = (dayStr: string) => {
    const dayNum = Number(dayStr);
    const dateObj = new Date(year, month - 1, dayNum);
    const weekDay = dateObj.getDay();
    return weekDay === 0 || weekDay === 6; // 0 = อาทิตย์, 6 = เสาร์
  };

  // โหลดรายชื่อหอผู้ป่วยจาก Supabase
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, Department')
          .order('Department', { ascending: true });

        if (error) {
          console.error('Error fetching departments details:', error.message);
        } else if (data && data.length > 0) {
          setDepartments(data);
          setSelectedDept(data[0].id);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    }
    fetchDepartments();
  }, [supabase]);

  // โหลดรายชื่อพยาบาลและตารางเวรของแผนกที่เลือก
  const fetchRosterData = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const { data: staffRes } = await supabase
      .from('staff')
      .select('id, full_name, position')
      .eq('department_id', selectedDept)
      .order('id', { ascending: true });

    setStaffList(staffRes || []);

    const { data: rosterRes } = await supabase
      .from('monthly_roster')
      .select('*')
      .eq('department_id', selectedDept)
      .gte('date', startDate)
      .lte('date', endDate);

    if (rosterRes) {
      const map: Record<string, string> = {};
      rosterRes.forEach((row: RosterRecord) => {
        const dayPart = row.date.split('-')[2];
        map[`${row.staff_id}_${dayPart}`] = row.shift;
      });
      setRosterData(map);
    } else {
      setRosterData({});
    }

    setLoading(false);
  }, [supabase, selectedDept, selectedMonth, daysInMonth]);

  useEffect(() => {
    fetchRosterData();
  }, [fetchRosterData]);

  // ฟังก์ชันเปลี่ยนค่าเวรในช่องกรอก
  const handleShiftChange = (staffId: string | number, day: string, value: string) => {
    setRosterData((prev) => ({
      ...prev,
      [`${staffId}_${day}`]: value,
    }));
  };

  // ฟังก์ชันนำเข้า Excel ชีทเดียว กรองเฉพาะแถวข้อมูลพยาบาลตัวจริง
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let importedCount = 0;
        const newRoster = { ...rosterData };

        console.log('--- เริ่มต้นอ่านไฟล์ Excel (แบบชีทเดียว กรองแถวแม่นยำ) ---');

        // อ่านเฉพาะชีทแรกหรือวนลูปตามที่มี
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          console.log(`กำลังอ่านชีท: ${sheetName}`);

          jsonData.forEach((row, rowIndex) => {
            if (!row || row.length === 0) return;

            const rowString = row.join(' ');
            
            // ข้ามแถวที่ไม่ใช่รายชื่อบุคลากร (เช่น แถวหัวข้อ, สรุปผล, ลายเซ็น, หรือแถวว่าง)
            if (
              rowString.includes('สรุปกำลังงาน') || 
              rowString.includes('ลงชื่อ') || 
              rowString.includes('หมายเหตุ') ||
              rowString.includes('เวรเช้า') ||
              rowString.includes('เวรบ่าย') ||
              rowString.includes('เวรดึก') ||
              rowString.includes('รวม') ||
              rowString.includes('ลำดับที่')
            ) {
              return;
            }

            let matchedStaff: any = null;

            // 1. ค้นหาชื่อพยาบาลจากคอลัมน์ B หรือ C (index 1 หรือ 2 เท่านั้น)
            for (let c = 1; c <= 2; c++) {
              const cellVal = String(row[c] || '').trim().replace(/\s+/g, ' ');
              if (cellVal.length >= 4) {
                const found = staffList.find((s) => {
                  const dbName = String(s.full_name || '').trim().replace(/\s+/g, ' ');
                  return dbName === cellVal || dbName.includes(cellVal) || cellVal.includes(dbName);
                });

                if (found) {
                  matchedStaff = found;
                  break;
                }
              }
            }

            // 2. เมื่อเจอพยาบาลตัวจริง ดึงข้อมูลจากคอลัมน์ D (index 3) เป็นต้นไปยาวตามจำนวนวัน
            if (matchedStaff) {
              for (let d = 1; d <= daysInMonth; d++) {
                const colIndex = 3 + (d - 1); // วันที่ 1 อยู่ที่ index 3 (คอลัมน์ D)
                const rawVal = row[colIndex];
                
                let shiftVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim().toUpperCase() : '';

                // ข้ามช่องว่างหรือขีด
                if (shiftVal === '' || shiftVal === '-') continue;

                // ตัดตัวเลขวันที่หน้าที่อาจติดมาด้วยออก (เช่น "1ช" เหลือ "ช") แต่เก็บ '0' ไว้
                if (shiftVal !== '0' && /^\d+/.test(shiftVal)) {
                  shiftVal = shiftVal.replace(/^\d+/, '');
                }

                // ป้องกันไม่ให้ดึงคำนำหน้าชื่อหรือชื่อคนอื่นมาใส่ในช่องเวรเด็ดขาด
                if (
                  shiftVal.includes('นางสาว') || 
                  shiftVal.includes('นาย') || 
                  shiftVal.includes('นาง') ||
                  shiftVal.length > 8
                ) {
                  continue;
                }

                const dayStr = String(d).padStart(2, '0');
                newRoster[`${matchedStaff.id}_${dayStr}`] = shiftVal;
                importedCount++;
              }
            }
          });
        });

        setRosterData(newRoster);
        alert(`นำเข้าข้อมูลสำเร็จ! อัปเดตข้อมูลเวรจำนวน ${importedCount} รายการ`);
      } catch (err) {
        console.error('Error reading excel file:', err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ฟังก์ชันจัดสีตามรหัสเวร
  const getShiftBadgeStyle = (code: string) => {
    const upperCode = (code || '').trim().toUpperCase();
    if (!upperCode) return 'bg-white text-slate-700 border-slate-200';

    if (upperCode.includes('ช')) {
      if (upperCode.includes('บ') || upperCode.includes('ด') || upperCode.includes('ปช')) {
        return 'bg-teal-100 text-teal-900 border-teal-300 font-bold';
      }
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    }
    if (upperCode.includes('บ')) {
      return 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    }
    if (upperCode.includes('ด')) {
      return 'bg-purple-50 text-purple-800 border-purple-300 font-bold';
    }
    if (upperCode.includes('ปช')) {
      return 'bg-sky-50 text-sky-800 border-sky-300 font-bold';
    }
    if (upperCode === '0' || upperCode.includes('/0') || upperCode === 'F/0' || upperCode === 'R/0' || upperCode === 'VAC') {
      return 'bg-slate-100 text-slate-400 border-slate-200';
    }
    if (upperCode.includes('ป่วย') || upperCode.includes('ลากิจ') || upperCode.includes('คลอด') || upperCode.includes('ฉพท')) {
      return 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
    }
    return 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
  };

  // บันทึกข้อมูลลงฐานข้อมูล (Upsert)
  const handleSaveRoster = async () => {
    setSaving(true);
    setSuccessMessage('');

    const recordsToUpsert: any[] = [];
    Object.keys(rosterData).forEach((key) => {
      const [staffId, day] = key.split('_');
      const shift = rosterData[key];
      if (shift) {
        recordsToUpsert.push({
          department_id: selectedDept,
          staff_id: Number(staffId),
          date: `${selectedMonth}-${day}`,
          shift: shift,
        });
      }
    });

    if (recordsToUpsert.length === 0) {
      alert('ยังไม่มีข้อมูลเวรที่เปลี่ยนแปลง');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('monthly_roster')
      .upsert(recordsToUpsert, { onConflict: 'department_id, staff_id, date' });

    setSaving(false);

    if (error) {
      console.error('Error saving:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกตารางเวร');
    } else {
      setSuccessMessage('บันทึกตารางเวรเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pt-0 px-4 pb-6 space-y-4 font-sans">
      {/* ส่วนหัว Header และตัวเลือกแผนก/เดือน/นำเข้า Excel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-wide">ตารางเวรปฏิบัติงาน</h1>
            <a href="/dashboard/staffing" className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium">← กลับหน้าภาพรวม</a>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">จัดการและบันทึกเวรประจำเดือนของบุคลากรในหอผู้ป่วย</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium cursor-pointer"
          >
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.Department}</option>
            ))}
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium cursor-pointer"
          />

          <label className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs">
            <ArrowUpTrayIcon className="w-4 h-4 text-emerald-700" />
            <span>นำเข้า Excel</span>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleSaveRoster}
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกตารางเวร'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ตารางเมทริกซ์รายชื่อพยาบาลและวันในเดือน */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[700px]">
          <table className="w-full border-collapse text-xs text-center table-fixed">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="w-[160px] px-2 py-3 border-r border-slate-300 text-left bg-slate-100">รายชื่อบุคลากร</th>
                <th className="w-[70px] px-1 py-3 border-r border-slate-300 text-center bg-slate-100">ตำแหน่ง</th>
                {daysArray.map((day) => {
                  const weekend = isWeekend(day);
                  return (
                    <th 
                      key={day} 
                      className={`px-0 py-3 border-r border-slate-200 ${weekend ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'}`}
                      title={`วันที่ ${day} ${weekend ? '(วันหยุดเสาร์-อาทิตย์)' : ''}`}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="py-12 text-slate-500 font-medium">กำลังโหลดข้อมูลตารางเวร...</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="py-12 text-slate-400 font-medium">ไม่พบรายชื่อบุคลากรในหน่วยงานนี้</td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-2 py-2 border-r border-slate-200 text-left font-bold text-slate-700 truncate bg-slate-50/40">
                      {staff.full_name}
                    </td>
                    <td className="px-1 py-2 border-r border-slate-200 text-center text-slate-500 font-semibold bg-slate-50/40 text-[11px]">
                      {staff.position || '-'}
                    </td>
                    {daysArray.map((day) => {
                      const cellKey = `${staff.id}_${day}`;
                      const currentShift = rosterData[cellKey] || '';
                      const weekend = isWeekend(day);
                      return (
                        <td key={day} className={`px-0.5 py-1 border-r border-slate-200 ${weekend ? 'bg-amber-50/40' : ''}`}>
                          <input
                            type="text"
                            maxLength={8}
                            value={currentShift}
                            onChange={(e) => handleShiftChange(staff.id, day, e.target.value)}
                            placeholder="-"
                            className={`w-full text-center py-1 text-[11px] rounded border uppercase focus:outline-none focus:ring-1 focus:ring-emerald-600 transition ${getShiftBadgeStyle(currentShift)}`}
                            title={`วันที่ ${day}/${selectedMonth} - ${staff.full_name}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* คำอธิบายรหัสเวร */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 shadow-sm space-y-2">
        <span className="font-bold text-slate-700 block">แนวทางรหัสเวรที่รองรับในระบบ:</span>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200"><b>ช</b> (เวรเช้า)</span>
          <span className="px-2 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200"><b>บ</b> (เวรบ่าย)</span>
          <span className="px-2 py-1 bg-purple-50 text-purple-800 rounded border border-purple-200"><b>ด</b> (เวรดึก)</span>
          <span className="px-2 py-1 bg-teal-50 text-teal-800 rounded border border-teal-200"><b>ช/บ, ช/ด</b> (เวรควบ)</span>
          <span className="px-2 py-1 bg-sky-50 text-sky-800 rounded border border-sky-200"><b>ปช</b> (ประชุม)</span>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200"><b>0, F/0, VAC</b> (วันหยุด)</span>
          <span className="px-2 py-1 bg-rose-50 text-rose-800 rounded border border-rose-200"><b>ป่วย, ลากิจ, คลอด</b> (การลา)</span>
        </div>
      </div>
    </div>
  );
}