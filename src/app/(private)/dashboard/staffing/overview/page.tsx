// src/app/(private)/dashboard/staffing/overview/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  ArrowPathIcon,
  BriefcaseIcon
} from '@heroicons/react/24/solid';

interface StaffMember {
  id: number;
  full_name: string;
  position: string;
}

interface RosterRecord {
  staff_id: number;
  date: string;
  shift: string;
}

export default function StaffingOverviewPage() {
  const supabase = createClient();
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | number>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [rosterRecords, setRosterRecords] = useState<RosterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // ดึงรายชื่อหอผู้ป่วย
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, Department')
          .order('Department', { ascending: true });

        if (error) {
          console.error('Error fetching departments:', error.message);
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

  // คำนวณจำนวนวันในเดือนที่เลือก
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  // ดึงข้อมูลพยาบาลและตารางเวรประจำเดือน
  const fetchOverviewData = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. ดึงรายชื่อบุคลากรในแผนก
    const { data: staffRes } = await supabase
      .from('staff')
      .select('id, full_name, position')
      .eq('department_id', selectedDept)
      .order('id', { ascending: true });

    setStaffList(staffRes || []);

    // 2. ดึงข้อมูลเวรในเดือนนั้น
    const { data: rosterRes } = await supabase
      .from('monthly_roster')
      .select('staff_id, date, shift')
      .eq('department_id', selectedDept)
      .gte('date', startDate)
      .lte('date', endDate);

    setRosterRecords(rosterRes || []);
    setLoading(false);
  }, [supabase, selectedDept, selectedMonth, daysInMonth]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  // คำนวณสถิติสรุปภาพรวมรายบุคคล
  const staffSummary = staffList.map((staff) => {
    const userShifts = rosterRecords.filter((r) => r.staff_id === staff.id);
    
    let morningCount = 0;
    let afternoonCount = 0;
    let nightCount = 0;
    let offCount = 0;
    let vacCount = 0;
    let otherCount = 0;
    let otCount = 0;

    const workedDates = new Set<string>();

    userShifts.forEach((r) => {
      const shift = (r.shift || '').trim().toUpperCase();
      if (!shift) return;

      let isWorkDay = false;

      const isOTShift = shift.includes('/') || (shift.includes('ช') && shift.includes('บ')) || (shift.includes('ช') && shift.includes('ด')) || (shift.includes('บ') && shift.includes('ด'));
      if (isOTShift) {
        otCount++;
      }

      if (shift.includes('ช')) {
        morningCount++;
        isWorkDay = true;
      }
      if (shift.includes('บ')) {
        afternoonCount++;
        isWorkDay = true;
      }
      if (shift.includes('ด')) {
        nightCount++;
        isWorkDay = true;
      }

      if (!shift.includes('ช') && !shift.includes('บ') && !shift.includes('ด')) {
        if (shift === '0' || shift.includes('/0')) {
          offCount++;
        } else if (shift === 'VAC') {
          offCount++;
          vacCount++;
        } else {
          otherCount++;
          isWorkDay = true;
        }
      } else {
        isWorkDay = true;
      }

      if (isWorkDay && r.date) {
        workedDates.add(r.date);
      }
    });

    return {
      ...staff,
      morningCount,
      afternoonCount,
      nightCount,
      offCount,
      vacCount,
      otherCount,
      otCount,
      totalWorkDays: workedDates.size,
    };
  });

  // สถิติรวมของหอผู้ป่วย
  const totalStaffCount = staffList.length;
  const rnCount = staffList.filter((s) => (s.position || '').toUpperCase().includes('RN')).length;
  
 // นับจำนวนแยกตามตำแหน่งจริงแบบตรงตัวเป๊ะ
  const pnCount = staffList.filter((s) => (s.position || '').trim().toUpperCase() === 'PN').length;
  const naCount = staffList.filter((s) => (s.position || '').trim().toUpperCase() === 'NA').length;
  const pnwCount = staffList.filter((s) => (s.position || '').trim() === 'พนง').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 lg:p-6 space-y-6 font-sans">
      {/* ส่วนหัว Header และตัวเลือก */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-wide">ภาพรวมอัตรากำลัง (Staffing Overview)</h1>
            <a href="/dashboard/staffing" className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium">← กลับหน้าภาพรวม</a>
          </div>
          <p className="text-xs text-slate-500 mt-1">สรุปผลการปฏิบัติงาน สถิติจำนวนเวร และอัตรากำลังพลประจำเดือนของหอผู้ป่วย</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium cursor-pointer"
          >
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.Department}</option>
            ))}
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium cursor-pointer"
          />

          <button
            onClick={fetchOverviewData}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* การ์ดสถิติภาพรวม */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">บุคลากรทั้งหมดในสังกัด</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalStaffCount} <span className="text-xs font-normal text-slate-500">คน</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <BriefcaseIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">พยาบาลวิชาชีพ (RN)</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{rnCount} <span className="text-xs font-normal text-slate-500">คน</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <CalendarDaysIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">PN / NA / ผู้ช่วยเหลือฯ</p>
            <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
              {pnCount} <span className="text-xs font-normal text-slate-500">คน / </span> 
              {naCount} <span className="text-xs font-normal text-slate-500">คน / </span> 
              {pnwCount} <span className="text-xs font-normal text-slate-500">คน </span>
            </h3>
          </div>
        </div>
      </div>

      {/* ตารางสรุปสถิติจำนวนเวรรายบุคคล */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">สรุปสถิติภาระงานและจำนวนเวรรายบุคคล (ประจำเดือน {selectedMonth})</h3>
          <span className="text-xs text-slate-500">รวมทั้งหมด {staffList.length} รายการ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ลำดับ</th>
                <th className="px-4 py-3">ชื่อ-สกุลบุคลากร</th>
                <th className="px-4 py-3 text-center">ตำแหน่ง</th>
                <th className="px-4 py-3 text-center">เวรเช้า (ช)</th>
                <th className="px-4 py-3 text-center">เวรบ่าย (บ)</th>
                <th className="px-4 py-3 text-center">เวรดึก (ด)</th>
                <th className="px-4 py-3 text-center">เวรอื่นๆ</th>
                <th className="px-4 py-3 text-center text-rose-700 font-bold">จำนวน OT</th>
                <th className="px-4 py-3 text-center font-extrabold text-emerald-800">วันทำงาน</th>
                <th className="px-4 py-3 text-center text-slate-500">วันหยุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">กำลังโหลดข้อมูลสรุปภาพรวม...</td>
                </tr>
              ) : staffSummary.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">ไม่พบข้อมูลบุคลากรในหน่วยงานนี้</td>
                </tr>
              ) : (
                staffSummary.map((staff, index) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{staff.full_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold border border-slate-200">
                        {staff.position || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{staff.morningCount}</td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-700">{staff.afternoonCount}</td>
                    <td className="px-4 py-3 text-center font-semibold text-purple-700">{staff.nightCount}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-700">{staff.otherCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600 bg-rose-50/40">{staff.otCount}</td>
                    <td className="px-4 py-3 text-center font-extrabold text-emerald-900 bg-emerald-50/50">{staff.totalWorkDays}</td>
                    <td className="px-4 py-3 text-center text-slate-600 font-medium">
                      {staff.offCount} {staff.vacCount > 0 && <span className="text-slate-400 text-[11px]">(vac{staff.vacCount})</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}