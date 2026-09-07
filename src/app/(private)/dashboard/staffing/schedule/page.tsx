// src/app/(private)/dashboard/staffing/schedule/page.tsx
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sarabun } from 'next/font/google';
import { createClient } from '@/utils/supabase/client';
import { CheckCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';
import { parseShift, type WorkShift } from '@/lib/scheduling/shiftParser';
import { validateNightToMorning } from '@/lib/scheduling/rosterValidator';
import { loadSchedulingRules, type SchedulingRule } from '@/lib/scheduling/ruleLoader';
import { getVisibleDepartments, canSelectDepartment, canEditStaffing, type UserProfile, } from '@/lib/permissions/staffingAccess';
import { generateAutoSchedule, type AutoScheduleWarning, } from '@/lib/scheduling/autoScheduler';

interface RosterRecord {
  staff_id: number | string;
  date: string;
  shift: string;
}

interface ValidationIssue {
  ruleCode: string;
  message: string;
  day?: string;
  previousDay?: string;
  staffId?: number | string;
  staffName?: string;
  shiftCode?: WorkShift;
}

interface ShiftValidationSummary {
  day: string;
  date: string;
  shiftCode: WorkShift;
  rnCount: number;
  requiredRn: number;
  seniorCount: number;
  requiredSenior: number;
  leaderCount: number;
  requiredLeader: number;

  pnCount: number;
  requiredPn: number;
  naCount: number;
  requiredNa: number;
  supportCount: number;
  requiredSupport: number;

  valid: boolean;
}

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

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
  const [previousDayRoster, setPreviousDayRoster] = useState<Record<string, string>>({});
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState<boolean>(false);
  const [rulesError, setRulesError] = useState<string>('');
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [shiftValidationSummary, setShiftValidationSummary] = useState<ShiftValidationSummary[]>([]);
  const [hasValidated, setHasValidated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userGroup, setUserGroup] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [autoScheduleWarnings, setAutoScheduleWarnings] = useState<AutoScheduleWarning[]>([]);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [selectedProblemDay, setSelectedProblemDay] = useState<string | null>(null);
  const [staffView, setStaffView] = useState<'all' | 'nurse' | 'support'>('all');
  const [holidays, setHolidays] = useState<
    Array<{ holiday_date: string; holiday_name: string }>
  >([]);

  const holidayMap = useMemo(
    () =>
      new Map(
        holidays.map((holiday) => [
          holiday.holiday_date,
          holiday.holiday_name,
        ])
      ),
    [holidays]
  );

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

  const getHolidayName = (dayStr: string) =>
    holidayMap.get(`${selectedMonth}-${dayStr}`) || '';

  const isSpecialHoliday = (dayStr: string) =>
    Boolean(getHolidayName(dayStr));

  // วันหยุดทั้งหมด = เสาร์-อาทิตย์ + วันหยุดพิเศษ
  const isHoliday = (dayStr: string) =>
    isWeekend(dayStr) || isSpecialHoliday(dayStr);

  // โหลดวันหยุดส่วนกลางที่ Admin กำหนด ใช้ร่วมกันทุกหน่วยงาน
  useEffect(() => {
    async function loadHolidays() {
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('staffing_holidays')
        .select('holiday_date, holiday_name')
        .eq('active', true)
        .is('department_id', null)
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate)
        .order('holiday_date', { ascending: true });

      if (error) {
        console.warn('Load staffing holidays warning:', error.message);
        setHolidays([]);
        return;
      }

      setHolidays(data || []);
    }

    loadHolidays();
  }, [daysInMonth, selectedMonth, supabase]);

  useEffect(() => {
  async function loadSessionUser() {
    try {
      const response = await fetch('/api/session-user', {
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('ไม่พบ session ของผู้ใช้');
        setCurrentUserEmail('');
        return;
      }

      const result = await response.json();

      setCurrentUserEmail(
        result?.user?.email ?? ''
      );
    } catch (error) {
      console.error(
        'Load session user error:',
        error
      );

      setCurrentUserEmail('');
    }
  }

  loadSessionUser();
}, []);

  // โหลด profile + สิทธิ์หน่วยงานจาก email ของ session
  useEffect(() => {
    async function loadAccessContext() {
      if (!currentUserEmail) return;

      try {
        console.log('CURRENT USER EMAIL =', currentUserEmail);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            department_id,
            role,
            email
          `)
          .eq('email', currentUserEmail)
          .single();

        console.log('PROFILE =', profile);
        console.log('PROFILE ERROR =', profileError);

        if (profileError || !profile) {
          console.error('Cannot load profile:', profileError);
          setUserProfile(null);
          setUserGroup(null);
          setDepartments([]);
          setSelectedDept('');
          return;
        }

        const normalizedProfile: UserProfile = {
          id: profile.id,
          full_name: profile.full_name ?? null,
          department_id: profile.department_id ?? null,
          role: profile.role ?? null,
          email: profile.email ?? null,
        };

        setUserProfile(normalizedProfile);

        // หา group ของหน่วยงานผู้ใช้ เพื่อใช้กับ head_group
        let currentUserGroup: string | null = null;

        if (normalizedProfile.department_id) {
          const { data: ownDepartment, error: ownDepartmentError } = await supabase
            .from('departments')
            .select('group')
            .eq('id', normalizedProfile.department_id)
            .single();

          if (ownDepartmentError) {
            console.error('Cannot load user group:', ownDepartmentError);
          } else {
            currentUserGroup = ownDepartment?.group ?? null;
          }
        }

        setUserGroup(currentUserGroup);

        // โหลดหน่วยงานทั้งหมด แล้วค่อยกรองตาม role
        const { data: departmentRows, error: departmentsError } = await supabase
          .from('departments')
          .select('id, Department, group')
          .order('Department', { ascending: true });

        if (departmentsError) {
          console.error('Error fetching departments:', departmentsError.message);
          setDepartments([]);
          setSelectedDept('');
          return;
        }

        const allDepartments = departmentRows || [];
        setDepartments(allDepartments);

        const allowedDepartments = getVisibleDepartments(
          allDepartments,
          normalizedProfile,
          currentUserGroup
        );

        console.log('ROLE =', normalizedProfile.role);
        console.log('USER GROUP =', currentUserGroup);
        console.log('ALL DEPARTMENTS =', allDepartments);
        console.log('ALLOWED DEPARTMENTS =', allowedDepartments);

        // admin / head_nurse / head_group เลือกหน่วยงานได้
        if (canSelectDepartment(normalizedProfile.role)) {
          const ownDeptExists = allowedDepartments.some(
            (dept) =>
              Number(dept.id) === Number(normalizedProfile.department_id)
          );

          setSelectedDept(
            ownDeptExists
              ? Number(normalizedProfile.department_id)
              : allowedDepartments[0]?.id ?? ''
          );
        } else {
          // head_department และ role อื่น ล็อกที่หน่วยงานของตัวเอง
          setSelectedDept(normalizedProfile.department_id ?? '');
        }
      } catch (error) {
        console.error('Load access context error:', error);
        setUserProfile(null);
        setUserGroup(null);
        setDepartments([]);
        setSelectedDept('');
      }
    }

    loadAccessContext();
  }, [supabase, currentUserEmail]);

  const visibleDepartments = getVisibleDepartments(
    departments,
    userProfile,
    userGroup
  );

  const allowDepartmentSelect = canSelectDepartment(userProfile?.role);
  const allowEdit = canEditStaffing(userProfile?.role);

  // โหลดรายชื่อพยาบาลและตารางเวรของแผนกที่เลือก
  const fetchRosterData = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const { data: staffRes, error: staffError } = await supabase
      .from('staff')
      .select('id, full_name, position, competency_level, can_be_shift_leader, active, schedule_mode')
      .eq('department_id', selectedDept)
      .eq('active', true)
      .order('id', { ascending: true });

    if (staffError) {
      console.error('Error fetching staff:', staffError.message);
    }

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

    // ดึงเวรของวันสุดท้ายเดือนก่อน เพื่อใช้ตรวจ ด → ช ในวันที่ 1 ของเดือน
    const previousDateObj = new Date(year, month - 1, 0);
    const previousDate = `${previousDateObj.getFullYear()}-${String(previousDateObj.getMonth() + 1).padStart(2, '0')}-${String(previousDateObj.getDate()).padStart(2, '0')}`;

    const { data: previousRosterRes, error: previousRosterError } = await supabase
      .from('monthly_roster')
      .select('staff_id, date, shift')
      .eq('department_id', selectedDept)
      .eq('date', previousDate);

    if (previousRosterError) {
      console.error('Error fetching previous month roster:', previousRosterError.message);
    }

    const previousMap: Record<string, string> = {};
    (previousRosterRes || []).forEach((row: RosterRecord) => {
      previousMap[String(row.staff_id)] = row.shift;
    });
    setPreviousDayRoster(previousMap);

    setValidationIssues([]);
    setShiftValidationSummary([]);
    setHasValidated(false);
    setLoading(false);
  }, [supabase, selectedDept, selectedMonth, daysInMonth]);

  useEffect(() => {
    fetchRosterData();
  }, [fetchRosterData]);

  // โหลดกติกาจัดเวรแยกจาก roster เพื่อให้ตรวจสอบ error / RLS ได้ชัดเจน
  const fetchSchedulingRules = useCallback(async () => {
    if (!selectedDept) {
      setSchedulingRules([]);
      setRulesError('');
      return;
    }

    setRulesLoading(true);
    setRulesError('');

    try {
      const rules = await loadSchedulingRules(supabase, Number(selectedDept));
      setSchedulingRules(rules);

      if (rules.length === 0) {
        setRulesError(
          'ไม่พบกติกาที่เปิดใช้สำหรับหน่วยงานนี้ กรุณาตรวจสอบ scheduling_rules หรือ RLS policy'
        );
      }
    } catch (error: any) {
      console.error('Error loading scheduling rules:', error);
      setSchedulingRules([]);
      setRulesError(
        error?.message || 'ไม่สามารถโหลดกติกาจาก scheduling_rules ได้'
      );
    } finally {
      setRulesLoading(false);
    }
  }, [supabase, selectedDept]);

  useEffect(() => {
    fetchSchedulingRules();
  }, [fetchSchedulingRules]);

  // อ่านค่าตัวเลขจาก scheduling_rules โดยมี fallback เพื่อให้ระบบยังตรวจได้
  const getRuleNumber = useCallback(
    (
      ruleCode: string,
      valueKey: string,
      fallback: number
    ): number => {
      const rule = schedulingRules.find(
        (item) => item.rule_code === ruleCode && item.enabled
      );

      if (!rule?.value_json) return fallback;

      const rawValue = (rule.value_json as Record<string, unknown>)[valueKey];
      const parsed = Number(rawValue);

      return Number.isFinite(parsed) ? parsed : fallback;
    },
    [schedulingRules]
  );

  const staffingRequirement = {
    ช: getRuleNumber('MIN_RN_MORNING', 'min_staff', 7),
    บ: getRuleNumber('MIN_RN_EVENING', 'min_staff', 6),
    ด: getRuleNumber('MIN_RN_NIGHT', 'min_staff', 5),
  } satisfies Record<WorkShift, number>;

  const pnStaffingRequirement = {
    ช: getRuleNumber('MIN_PN_MORNING', 'min_staff', 0),
    บ: getRuleNumber('MIN_PN_EVENING', 'min_staff', 0),
    ด: getRuleNumber('MIN_PN_NIGHT', 'min_staff', 0),
  } satisfies Record<WorkShift, number>;

  const naStaffingRequirement = {
    ช: getRuleNumber('MIN_NA_MORNING', 'min_staff', 0),
    บ: getRuleNumber('MIN_NA_EVENING', 'min_staff', 0),
    ด: getRuleNumber('MIN_NA_NIGHT', 'min_staff', 0),
  } satisfies Record<WorkShift, number>;

  const supportStaffingRequirement = {
    ช: getRuleNumber('MIN_SUPPORT_MORNING', 'min_staff', 0),
    บ: getRuleNumber('MIN_SUPPORT_EVENING', 'min_staff', 0),
    ด: getRuleNumber('MIN_SUPPORT_NIGHT', 'min_staff', 0),
  } satisfies Record<WorkShift, number>;

  const requiredSenior = getRuleNumber(
    'MIN_SENIOR_RN_PER_SHIFT',
    'min_count',
    2
  );

  const requiredLeader = getRuleNumber(
    'SHIFT_LEADER_REQUIRED',
    'min_count',
    2
  );

  // ฟังก์ชันเปลี่ยนค่าเวรในช่องกรอก
  const handleShiftChange = (staffId: string | number, day: string, value: string) => {
    setRosterData((prev) => ({
      ...prev,
      [`${staffId}_${day}`]: value,
    }));
    setHasValidated(false);
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
        setHasValidated(false);
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

  const handleAutoSchedule = async () => {
  if (!allowEdit) {
    alert('บัญชีนี้มีสิทธิ์ดูข้อมูลอย่างเดียว');
    return;
  }

  if (!selectedDept) {
    alert('กรุณาเลือกหน่วยงาน');
    return;
  }

  if (staffList.length === 0) {
    alert('ไม่พบรายชื่อบุคลากรในหน่วยงานนี้');
    return;
  }

  setAutoScheduling(true);
  setAutoScheduleWarnings([]);
  setSuccessMessage('');

  try {
    // 1. โหลดคำขอหยุดที่อนุมัติแล้ว
    const startDate = `${selectedMonth}-01`;

    const endDate = `${selectedMonth}-${String(
      daysInMonth
    ).padStart(2, '0')}`;

    const { data: offRequests, error: offError } =
      await supabase
        .from('staff_requests')
        .select('staff_id, request_date')
        .eq('department_id', Number(selectedDept))
        .eq('request_type', 'OFF')
        .eq('status', 'approved')
        .gte('request_date', startDate)
        .lte('request_date', endDate);

    if (offError) {
      throw new Error(
        `โหลดคำขอหยุดไม่สำเร็จ: ${offError.message}`
      );
    }

    // 2. สร้าง key ของวันหยุดที่อนุมัติแล้ว
    const approvedDayOffKeys = new Set<string>(
      (offRequests || []).map(
        (item: {
          staff_id: number | string;
          request_date: string;
        }) =>
          `${item.staff_id}_${item.request_date}`
      )
    );

    const result = generateAutoSchedule({
  staffList,
  daysArray,
  existingRoster: rosterData,
  approvedDayOffKeys,
  selectedMonth,
  previousDayRoster,

  requirements: {
    morningRn: staffingRequirement.ช,
    eveningRn: staffingRequirement.บ,
    nightRn: staffingRequirement.ด,
    seniorPerShift: requiredSenior,
    leaderPerShift: requiredLeader,

    maxConsecutiveWorkDays: 5,
    preferredRestAfterDays: 3,
    maxConsecutiveNightShifts: 2,

    morningPn: pnStaffingRequirement.ช,
    eveningPn: pnStaffingRequirement.บ,
    nightPn: pnStaffingRequirement.ด,

    morningNa: naStaffingRequirement.ช,
    eveningNa: naStaffingRequirement.บ,
    nightNa: naStaffingRequirement.ด,

    morningSupport: supportStaffingRequirement.ช,
    eveningSupport: supportStaffingRequirement.บ,
    nightSupport: supportStaffingRequirement.ด,
  },

  targetGroup: staffView,
  preserveExisting: true,
}); // ต้องมีบรรทัดนี้

// 4. Fix HW ให้ขึ้นเวรเช้าทุกวันราชการ เว้นวันลา/คำขอหยุดที่อนุมัติแล้ว
// วันเสาร์-อาทิตย์และวันหยุดพิเศษให้ลง 0
const rosterWithFixedHw = { ...result.roster };

if (staffView !== 'support') {
  const hwStaff = staffList.filter(
    (staff) =>
      String(staff.position || '').trim().toUpperCase() === 'HW'
  );

  const isLeaveCode = (value: unknown) => {
    const code = String(value || '').trim().toUpperCase();
    return (
      code.includes('ลา') ||
      code.includes('ป่วย') ||
      code.includes('คลอด') ||
      code.includes('ฉพท') ||
      code.includes('VAC')
    );
  };

  hwStaff.forEach((staff) => {
    daysArray.forEach((day) => {
      const cellKey = `${staff.id}_${day}`;
      const fullDate = `${selectedMonth}-${day}`;
      const approvedOffKey = `${staff.id}_${fullDate}`;
      const existingValue =
        rosterData[cellKey] || rosterWithFixedHw[cellKey] || '';

      // วันลาที่กรอกไว้เดิมต้องไม่ถูกระบบเขียนทับ
      if (isLeaveCode(existingValue)) {
        rosterWithFixedHw[cellKey] = existingValue;
        return;
      }

      // คำขอหยุดที่อนุมัติแล้วถือเป็นวันหยุดของ HW
      if (approvedDayOffKeys.has(approvedOffKey)) {
        rosterWithFixedHw[cellKey] = '0';
        return;
      }

      rosterWithFixedHw[cellKey] = isHoliday(day) ? '0' : 'ช';
    });
  });
}

// 5. แสดง Preview
setRosterData(rosterWithFixedHw);

setAutoScheduleWarnings(
  result.warnings
);

setHasValidated(false);

    if (result.warnings.length === 0) {
      setSuccessMessage(
        'ช่วยจัดเวรเรียบร้อยแล้ว ระบบตรวจตารางให้อัตโนมัติ'
      );
    } else {
      setSuccessMessage(
        `ช่วยจัดเวรแล้ว แต่พบ ${result.warnings.length} ประเด็นที่ควรตรวจสอบ`
      );
    }
  } catch (error: any) {
    console.error(
      'Auto schedule error:',
      error
    );

    alert(
      error?.message ||
        'เกิดข้อผิดพลาดในการช่วยจัดเวร'
    );
  } finally {
    setAutoScheduling(false);
  }
};

  // ตรวจตารางเวรอัตโนมัติทุกครั้งที่ข้อมูลเวรเปลี่ยน
  const handleValidateRoster = useCallback(() => {
    const issues: ValidationIssue[] = [];
    const summaries: ShiftValidationSummary[] = [];
    const shiftCodes: WorkShift[] = ['ช', 'บ', 'ด'];

    if (staffList.length === 0 || daysArray.length === 0) {
      setValidationIssues([]);
      setShiftValidationSummary([]);
      setHasValidated(false);
      return;
    }

    // 1) ตรวจรายบุคคล: ห้าม ด ของวันก่อนหน้า → ช ของวันถัดไป
    staffList.forEach((staff) => {
      let previousShift = previousDayRoster[String(staff.id)] || '';

      daysArray.forEach((day, index) => {
        const currentShift = rosterData[`${staff.id}_${day}`] || '';
        const nightToMorningError = validateNightToMorning(
          previousShift,
          currentShift
        );

        if (nightToMorningError) {
          issues.push({
            ruleCode: nightToMorningError.ruleCode,
            message: nightToMorningError.message,
            staffId: staff.id,
            staffName: staff.full_name,
            day,
            previousDay:
              index === 0
                ? 'วันสุดท้ายเดือนก่อน'
                : daysArray[index - 1],
          });
        }

        // Hard Rule: ห้ามเวรควบ บ/ด และ ด/บ เด็ดขาด
        const normalizedShift = currentShift
          .trim()
          .toUpperCase()
          .replace(/\s/g, '');

        if (
          normalizedShift === 'บ/ด' ||
          normalizedShift === 'ด/บ'
        ) {
          issues.push({
            ruleCode: 'FORBIDDEN_DOUBLE_SHIFT',
            message: 'ห้ามจัดเวรควบ บ/ด หรือ ด/บ',
            staffId: staff.id,
            staffName: staff.full_name,
            day,
          });
        }

        previousShift = currentShift;
      });
    });

    // 2) ตรวจจำนวน RN / Expert-Proficient / Shift Leader ของทุกเวร
    daysArray.forEach((day) => {
      shiftCodes.forEach((shiftCode) => {
        const staffInShift = staffList.filter((staff) => {
          const rosterShift = rosterData[`${staff.id}_${day}`] || '';
          return parseShift(rosterShift).includes(shiftCode);
        });

        const rnStaff = staffInShift.filter(
          (staff) => staff.position === 'RN'
        );

        const pnStaff = staffInShift.filter(
          (staff) => String(staff.position || '').trim().toUpperCase() === 'PN'
        );

        const naStaff = staffInShift.filter(
          (staff) => String(staff.position || '').trim().toUpperCase() === 'NA'
        );

        const supportStaff = staffInShift.filter((staff) => {
          const position = String(staff.position || '').trim();
          return (
            position === 'พนง' ||
            position === 'พนง.' ||
            position.toUpperCase() === 'SUPPORT'
          );
        });

        const seniorStaff = rnStaff.filter(
          (staff) =>
            staff.competency_level === 'Expert' ||
            staff.competency_level === 'Proficient'
        );

        const leaderStaff = rnStaff.filter(
          (staff) => staff.can_be_shift_leader === true
        );

        const requiredRn = staffingRequirement[shiftCode];
        const requiredPn = pnStaffingRequirement[shiftCode];
        const requiredNa = naStaffingRequirement[shiftCode];
        const requiredSupport = supportStaffingRequirement[shiftCode];

        const staffingErrors: Array<{
          ruleCode: string;
          message: string;
        }> = [];

        if (rnStaff.length < requiredRn) {
          staffingErrors.push({
            ruleCode:
              shiftCode === 'ช'
                ? 'MIN_RN_MORNING'
                : shiftCode === 'บ'
                ? 'MIN_RN_EVENING'
                : 'MIN_RN_NIGHT',
            message: `RN ไม่เพียงพอ: ${rnStaff.length}/${requiredRn} คน`,
          });
        }

        if (seniorStaff.length < requiredSenior) {
          staffingErrors.push({
            ruleCode: 'MIN_SENIOR_RN_PER_SHIFT',
            message: `Expert/Proficient ไม่เพียงพอ: ${seniorStaff.length}/${requiredSenior} คน`,
          });
        }

        if (leaderStaff.length < requiredLeader) {
          staffingErrors.push({
            ruleCode: 'SHIFT_LEADER_REQUIRED',
            message: `หัวหน้าเวรไม่เพียงพอ: ${leaderStaff.length}/${requiredLeader} คน`,
          });
        }

        if (requiredPn > 0 && pnStaff.length < requiredPn) {
          staffingErrors.push({
            ruleCode:
              shiftCode === 'ช'
                ? 'MIN_PN_MORNING'
                : shiftCode === 'บ'
                ? 'MIN_PN_EVENING'
                : 'MIN_PN_NIGHT',
            message: `PN ไม่เพียงพอ: ${pnStaff.length}/${requiredPn} คน`,
          });
        }

        if (requiredNa > 0 && naStaff.length < requiredNa) {
          staffingErrors.push({
            ruleCode:
              shiftCode === 'ช'
                ? 'MIN_NA_MORNING'
                : shiftCode === 'บ'
                ? 'MIN_NA_EVENING'
                : 'MIN_NA_NIGHT',
            message: `NA ไม่เพียงพอ: ${naStaff.length}/${requiredNa} คน`,
          });
        }

        if (
          requiredSupport > 0 &&
          supportStaff.length < requiredSupport
        ) {
          staffingErrors.push({
            ruleCode:
              shiftCode === 'ช'
                ? 'MIN_SUPPORT_MORNING'
                : shiftCode === 'บ'
                ? 'MIN_SUPPORT_EVENING'
                : 'MIN_SUPPORT_NIGHT',
            message: `พนง. ไม่เพียงพอ: ${supportStaff.length}/${requiredSupport} คน`,
          });
        }

        summaries.push({
          day,
          date: `${selectedMonth}-${day}`,
          shiftCode,
          rnCount: rnStaff.length,
          requiredRn,
          seniorCount: seniorStaff.length,
          requiredSenior,
          leaderCount: leaderStaff.length,
          requiredLeader,

          pnCount: pnStaff.length,
          requiredPn,
          naCount: naStaff.length,
          requiredNa,
          supportCount: supportStaff.length,
          requiredSupport,

          valid: staffingErrors.length === 0,
        });

        staffingErrors.forEach((error) => {
          issues.push({
            ruleCode: error.ruleCode,
            message: error.message,
            day,
            shiftCode,
          });
        });
      });
    });

    setValidationIssues(issues);
    setShiftValidationSummary(summaries);
    setHasValidated(true);
  }, [
    staffList,
    previousDayRoster,
    daysArray,
    rosterData,
    selectedMonth,
    staffingRequirement.ช,
    staffingRequirement.บ,
    staffingRequirement.ด,
    pnStaffingRequirement.ช,
    pnStaffingRequirement.บ,
    pnStaffingRequirement.ด,
    naStaffingRequirement.ช,
    naStaffingRequirement.บ,
    naStaffingRequirement.ด,
    supportStaffingRequirement.ช,
    supportStaffingRequirement.บ,
    supportStaffingRequirement.ด,
    requiredSenior,
    requiredLeader,
  ]);

  // Real-time validation: ไม่ต้องกดปุ่มตรวจตารางเวร
  useEffect(() => {
    if (loading || rulesLoading) return;

    const timer = window.setTimeout(() => {
      handleValidateRoster();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [handleValidateRoster, loading, rulesLoading]);

  const invalidSequenceCellKeys = new Set(
    validationIssues
      .filter(
        (issue) =>
          (
            issue.ruleCode === 'NIGHT_TO_MORNING' ||
            issue.ruleCode === 'FORBIDDEN_DOUBLE_SHIFT'
          ) &&
          issue.staffId &&
          issue.day
      )
      .map((issue) => `${issue.staffId}_${issue.day}`)
  );


  const problemDays = new Set(
    validationIssues
      .filter((issue) => Boolean(issue.day))
      .map((issue) => issue.day as string)
  );

  const selectedDayIssues = selectedProblemDay
    ? validationIssues.filter((issue) => issue.day === selectedProblemDay)
    : [];

  const selectedDaySummary = selectedProblemDay
    ? shiftValidationSummary.filter(
        (item) => item.day === selectedProblemDay
      )
    : [];

  const isNurseOnlyIssue = (issue: ValidationIssue) => {
    const rnRuleCodes = new Set([
      'NIGHT_TO_MORNING',
      'FORBIDDEN_DOUBLE_SHIFT',
      'MIN_RN_MORNING',
      'MIN_RN_EVENING',
      'MIN_RN_NIGHT',
      'MIN_SENIOR_RN_PER_SHIFT',
      'SHIFT_LEADER_REQUIRED',
    ]);

    return rnRuleCodes.has(issue.ruleCode);
  };

  const isSupportOnlyIssue = (issue: ValidationIssue) => {
    return (
      issue.ruleCode.startsWith('MIN_PN_') ||
      issue.ruleCode.startsWith('MIN_NA_') ||
      issue.ruleCode.startsWith('MIN_SUPPORT_')
    );
  };

  const visibleValidationIssues = validationIssues.filter((issue) => {
    if (staffView === 'nurse') return isNurseOnlyIssue(issue);
    if (staffView === 'support') return isSupportOnlyIssue(issue);
    return true;
  });

  const visibleProblemDays = new Set(
    visibleValidationIssues
      .filter((issue) => Boolean(issue.day))
      .map((issue) => issue.day as string)
  );

  const visibleSelectedDayIssues = selectedProblemDay
    ? visibleValidationIssues.filter(
        (issue) => issue.day === selectedProblemDay
      )
    : [];

  const visibleSelectedDaySummary = selectedProblemDay
    ? shiftValidationSummary
        .filter((item) => item.day === selectedProblemDay)
        .map((item) => {
          if (staffView === 'nurse') {
            return {
              ...item,
              requiredPn: 0,
              requiredNa: 0,
              requiredSupport: 0,
              valid:
                item.rnCount >= item.requiredRn &&
                item.seniorCount >= item.requiredSenior &&
                item.leaderCount >= item.requiredLeader,
            };
          }

          if (staffView === 'support') {
            return {
              ...item,
              requiredRn: 0,
              requiredSenior: 0,
              requiredLeader: 0,
              valid:
                item.pnCount >= item.requiredPn &&
                item.naCount >= item.requiredNa &&
                item.supportCount >= item.requiredSupport,
            };
          }

          return item;
        })
    : [];

  const problemShiftCount = visibleSelectedDaySummary.length > 0
    ? shiftValidationSummary.filter((item) => {
        if (staffView === 'nurse') {
          return !(
            item.rnCount >= item.requiredRn &&
            item.seniorCount >= item.requiredSenior &&
            item.leaderCount >= item.requiredLeader
          );
        }

        if (staffView === 'support') {
          return !(
            item.pnCount >= item.requiredPn &&
            item.naCount >= item.requiredNa &&
            item.supportCount >= item.requiredSupport
          );
        }

        return !item.valid;
      }).length
    : shiftValidationSummary.filter((item) => {
        if (staffView === 'nurse') {
          return !(
            item.rnCount >= item.requiredRn &&
            item.seniorCount >= item.requiredSenior &&
            item.leaderCount >= item.requiredLeader
          );
        }

        if (staffView === 'support') {
          return !(
            item.pnCount >= item.requiredPn &&
            item.naCount >= item.requiredNa &&
            item.supportCount >= item.requiredSupport
          );
        }

        return !item.valid;
      }).length;

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

  const buildRosterPdf = async () => {
    if (!selectedDept || staffList.length === 0) {
      alert('ไม่พบข้อมูลสำหรับสร้าง PDF');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const departmentName =
        visibleDepartments.find(
          (dept) => Number(dept.id) === Number(selectedDept)
        )?.Department || 'หน่วยงาน';

      const exportStaff =
        staffView === 'all'
          ? staffList
          : staffList.filter((staff) => {
              const position = String(staff.position || '')
                .trim()
                .toUpperCase();

              if (staffView === 'nurse') {
                return ['RN', 'HW', 'TN'].includes(position);
              }

              return !['RN', 'HW', 'TN'].includes(position);
            });

      const [selectedYear, selectedMonthNumber] =
        selectedMonth.split('-').map(Number);

      const thaiMonths = [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม',
      ];

      const thaiMonth =
        thaiMonths[selectedMonthNumber - 1] || '';

      const buddhistYear = selectedYear + 543;

      const workingDays = daysArray.filter(
        (day) => !isHoliday(day)
      ).length;

      const escapeHtml = (value: unknown) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const normalizeRosterCode = (value: unknown) =>
        String(value ?? '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '');

      const splitRosterTokens = (value: unknown) =>
        normalizeRosterCode(value)
          .split('/')
          .map((token) => token.trim())
          .filter(Boolean);

      const isWorkToken = (token: string) =>
        token === 'ช' || token === 'บ' || token === 'ด';

      const countShift = (
        staffId: number | string,
        shiftCode: WorkShift
      ) =>
        daysArray.reduce((sum, day) => {
          const code =
            rosterData[`${staffId}_${day}`] || '';

          return parseShift(code).includes(shiftCode)
            ? sum + 1
            : sum;
        }, 0);

      // เวร OFF = มี 0 อยู่ในรหัสเวร
      // เช่น 0, ช/0, บ/0, ด/0
      const countOff = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const tokens = splitRosterTokens(
            rosterData[`${staffId}_${day}`] || ''
          );

          return tokens.includes('0')
            ? sum + 1
            : sum;
        }, 0);

      // จำนวนเวรทั้งหมด = นับทุกเวร ช / บ / ด ที่ปฏิบัติงานจริง
      // เวรควบ 1 วันจึงนับได้ 2 เวร
      const countAllWorkedShifts = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const tokens = splitRosterTokens(
            rosterData[`${staffId}_${day}`] || ''
          );

          return (
            sum +
            tokens.filter(isWorkToken).length
          );
        }, 0);

      // Total OT = จำนวนวันที่มี OT
      // รวม:
      // - เวรควบ เช่น ช/บ, ช/ด
      // - เวรคุณภาพที่มีเวรทำงานร่วมด้วย เช่น ปช/บ, ปช/ด
      // บ/ด เป็น Hard Rule และไม่ควรเกิดในตาราง
      const countTotalOt = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const code = normalizeRosterCode(
            rosterData[`${staffId}_${day}`] || ''
          );

          const tokens = splitRosterTokens(code);

          const workShiftCount =
            tokens.filter(isWorkToken).length;

          const hasQuality =
            tokens.includes('ปช') ||
            tokens.includes('ปชช');

          const hasEveningOrNight =
            tokens.includes('บ') ||
            tokens.includes('ด');

          const isDoubleWorkShift =
            workShiftCount >= 2;

          const isQualityOt =
            hasQuality && hasEveningOrNight;

          return (
            isDoubleWorkShift ||
            isQualityOt
          )
            ? sum + 1
            : sum;
        }, 0);

      // ช คุณภาพ (OT) = รหัสที่ขึ้นต้นด้วย ปช/...
      // รองรับ ปชช/... ด้วย เผื่อมีการบันทึกในรูปแบบเดียวกัน
      const countQualityOt = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const code = normalizeRosterCode(
            rosterData[`${staffId}_${day}`] || ''
          );

          return (
            code.startsWith('ปช/') ||
            code.startsWith('ปชช/')
          )
            ? sum + 1
            : sum;
        }, 0);

      // ช คุณภาพ (ไม่ OT) = .../ปช หรือ ปชช
      const countQualityNonOt = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const code = normalizeRosterCode(
            rosterData[`${staffId}_${day}`] || ''
          );

          return (
            code.endsWith('/ปช') ||
            code === 'ปชช'
          )
            ? sum + 1
            : sum;
        }, 0);

      // ช ward = มีเวรเช้า แต่ไม่มี ปช / ปชช
      const countWardMorning = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const code = normalizeRosterCode(
            rosterData[`${staffId}_${day}`] || ''
          );

          const tokens = splitRosterTokens(code);
          const hasMorning = tokens.includes('ช');
          const hasQuality =
            code.includes('ปช') ||
            code.includes('ปชช');

          return hasMorning && !hasQuality
            ? sum + 1
            : sum;
        }, 0);

      const countVac = (
        staffId: number | string
      ) =>
        daysArray.reduce((sum, day) => {
          const code = normalizeRosterCode(
            rosterData[`${staffId}_${day}`] || ''
          );

          return code.includes('VAC')
            ? sum + 1
            : sum;
        }, 0);

      const dayHeaders = daysArray
        .map((day) => {
          const holiday = isHoliday(day);
          const holidayTitle =
            getHolidayName(day) ||
            (isWeekend(day) ? 'วันหยุดเสาร์-อาทิตย์' : '');

          return `
            <th class="day-head ${
              holiday ? 'weekend' : ''
            }" title="${escapeHtml(holidayTitle)}">${Number(day)}</th>
          `;
        })
        .join('');

      const staffRows = exportStaff
        .map((staff, index) => {
          const shiftCells = daysArray
            .map((day) => {
              const code =
                rosterData[`${staff.id}_${day}`] || '';

              const upperCode = code
                .trim()
                .toUpperCase();

              const isOff = upperCode === '0';

              return `
                <td class="day-cell ${
                  isOff ? 'off-cell' : ''
                }">${escapeHtml(code)}</td>
              `;
            })
            .join('');

          return `
            <tr>
              <td class="index-cell">${index + 1}</td>
              <td class="name-cell">${escapeHtml(
                staff.full_name
              )}</td>
              <td class="position-cell">${escapeHtml(
                staff.position
              )}</td>
              ${shiftCells}
              <td class="summary-cell">${countOff(
                staff.id
              )}</td>
              <td class="summary-cell">${countAllWorkedShifts(
                staff.id
              )}</td>
              <td class="summary-cell">${countTotalOt(
                staff.id
              )}</td>
              <td class="summary-cell">${countQualityOt(
                staff.id
              )}</td>
              <td class="summary-cell">${countQualityNonOt(
                staff.id
              )}</td>
              <td class="summary-cell">${countWardMorning(
                staff.id
              )}</td>
              <td class="summary-cell">${countShift(
                staff.id,
                'บ'
              )}</td>
              <td class="summary-cell">${countShift(
                staff.id,
                'ด'
              )}</td>
              <td class="summary-cell">${countVac(
                staff.id
              )}</td>
            </tr>
          `;
        })
        .join('');

      const countPositionShift = (
        positionFilter: (staff: any) => boolean,
        day: string,
        shift: WorkShift
      ) =>
        staffList.filter((staff) => {
          if (!positionFilter(staff)) return false;

          const code =
            rosterData[`${staff.id}_${day}`] || '';

          return parseShift(code).includes(shift);
        }).length;

      const rnOnly = (staff: any) =>
        String(staff.position || '')
          .trim()
          .toUpperCase() === 'RN';

      const tnOnly = (staff: any) =>
        String(staff.position || '')
          .trim()
          .toUpperCase() === 'TN';

      const totalWardStaffPerDay = (day: string) => {
        const morningRn = countPositionShift(
          rnOnly,
          day,
          'ช'
        );
        const morningTn = countPositionShift(
          tnOnly,
          day,
          'ช'
        );
        const eveningRn = countPositionShift(
          rnOnly,
          day,
          'บ'
        );
        const nightRn = countPositionShift(
          rnOnly,
          day,
          'ด'
        );

        return (
          morningRn +
          morningTn +
          eveningRn +
          nightRn
        );
      };

      const summaryRows =
        staffView === 'support'
          ? ''
          : `
          <tr class="summary-title-row">
            <td colspan="3" class="summary-title-cell">
              สรุปกำลังงานปฏิบัติงานใน ward แต่ละวัน
            </td>
            ${daysArray.map(() => '<td></td>').join('')}
            <td colspan="9"></td>
          </tr>

          <tr class="summary-row">
            <td colspan="2" class="summary-label">
              เวรเช้า (ไม่รวม HW)
            </td>
            <td>RN</td>
            ${daysArray
              .map(
                (day) =>
                  `<td class="day-cell">${countPositionShift(
                    rnOnly,
                    day,
                    'ช'
                  )}</td>`
              )
              .join('')}
            <td colspan="9"></td>
          </tr>

          <tr class="summary-row">
            <td colspan="2" class="summary-label"></td>
            <td>TN</td>
            ${daysArray
              .map(
                (day) =>
                  `<td class="day-cell">${countPositionShift(
                    tnOnly,
                    day,
                    'ช'
                  )}</td>`
              )
              .join('')}
            <td colspan="9"></td>
          </tr>

          <tr class="summary-row">
            <td colspan="2" class="summary-label">
              เวรบ่าย
            </td>
            <td>RN</td>
            ${daysArray
              .map(
                (day) =>
                  `<td class="day-cell">${countPositionShift(
                    rnOnly,
                    day,
                    'บ'
                  )}</td>`
              )
              .join('')}
            <td colspan="9"></td>
          </tr>

          <tr class="summary-row">
            <td colspan="2" class="summary-label">
              เวรดึก
            </td>
            <td>RN</td>
            ${daysArray
              .map(
                (day) =>
                  `<td class="day-cell">${countPositionShift(
                    rnOnly,
                    day,
                    'ด'
                  )}</td>`
              )
              .join('')}
            <td colspan="9"></td>
          </tr>

          <tr class="summary-total-row">
            <td colspan="3" class="summary-label">รวม</td>
            ${daysArray
              .map(
                (day) =>
                  `<td class="day-cell">${totalWardStaffPerDay(day)}</td>`
              )
              .join('')}
            <td colspan="9"></td>
          </tr>
        `;

      const viewLabel =
        staffView === 'nurse'
          ? 'พยาบาล'
          : staffView === 'support'
          ? 'สนับสนุน'
          : 'ทั้งหมด';

      const printRoot = document.createElement('div');

      printRoot.style.position = 'fixed';
      printRoot.style.left = '-100000px';
      printRoot.style.top = '0';
      printRoot.style.width = '1780px';
      printRoot.style.background = '#ffffff';
      printRoot.style.padding = '16px';
      printRoot.className = sarabun.className;
      printRoot.style.fontFamily =
        '"Sarabun", "TH Sarabun New", "TH SarabunPSK", Tahoma, sans-serif';

      printRoot.innerHTML = `
        <style>
          .pdf-sheet {
            width: 100%;
            color: #111827;
            background: white;
          }

          .pdf-title {
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            line-height: 1.35;
            margin-bottom: 4px;
          }

          .pdf-subtitle {
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .pdf-meta {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            font-size: 13px;
            margin-bottom: 4px;
            padding-right: 6px;
          }


          .roster-pdf-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            font-size: 16px;
          }

          .roster-pdf-table th,
          .roster-pdf-table td {
            border: 1px solid #52525b;
            text-align: center;
            vertical-align: middle;
            padding: 5px 1px;
            height: 40px;
            overflow: hidden;
            white-space: nowrap;
          }

          .roster-pdf-table thead th {
            background: #ffffff;
            font-weight: 600;
          }

          .roster-pdf-table thead .major-head {
            height: 28px;
            font-size: 13px;
            padding: 0 6px;
          }

          .roster-pdf-table thead .major-head-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 100%;
          }

          .roster-pdf-table thead .staffing-ratio {
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.2px;
            padding-right: 4px;
          }

          .roster-pdf-table thead .day-head {
            height: 28px;
            font-size: 13px;
            font-weight: 500;
            line-height: 1;
            white-space: nowrap;
          }

          .roster-pdf-table thead .position-head {
            position: relative;
            width: 30px;
            min-width: 30px;
            max-width: 30px;
            padding: 0;
            overflow: hidden;
            vertical-align: middle;
          }

          .roster-pdf-table thead .position-head-text {
            position: absolute;
            left: 50%;
            top: 50%;
            display: block;
            white-space: nowrap;
            transform: translate(-50%, -50%) rotate(-90deg);
            transform-origin: center center;
            font-size: 10px;
            font-weight: 400;
            line-height: 1;
          }

          .roster-pdf-table .weekend {
            background: #e5e7eb;
          }

          .roster-pdf-table .day-head,
          .roster-pdf-table .day-cell {
            width: 33px;
            min-width: 33px;
            max-width: 33px;
            padding-left: 0;
            padding-right: 0;
            text-align: center;
          }

          .roster-pdf-table .index-cell {
            width: 28px;
          }

          .roster-pdf-table .name-cell {
            text-align: left;
            padding-left: 5px;
            width: 195px;
            font-size: 16px;
            font-weight: 600;
          }

          .roster-pdf-table .position-cell {
            width: 30px;
            font-weight: 400;
            font-size: 12px;
          }

          .roster-pdf-table .off-cell {
            color: #dc2626;
          }


          .roster-pdf-table .summary-cell,
          .roster-pdf-table thead .summary-head {
            background: #fffce8;
            width: 20px;
            min-width: 20px;
            max-width: 20px;
            padding-left: 0;
            padding-right: 0;
            font-size: 12px;
          }

          .roster-pdf-table thead .summary-head {
            position: relative;
            height: 94px;
            padding: 0;
            background: #fffce8 !important;
            overflow: hidden;
            vertical-align: middle;
          }

          .roster-pdf-table thead .summary-head-text {
            position: absolute;
            left: 50%;
            top: 50%;
            display: block;
            width: 86px;
            text-align: center;
            white-space: nowrap;
            transform: translate(-50%, -50%) rotate(-90deg);
            transform-origin: center center;
            font-size: 8.5px;
            font-weight: 500;
            line-height: 1;
            letter-spacing: 0;
          }

          .roster-pdf-table thead .summary-head.short .summary-head-text {
            width: 42px;
            font-size: 9px;
          }

          .roster-pdf-table .summary-title-row td,
          .roster-pdf-table .summary-row td,
          .roster-pdf-table .summary-total-row td {
            background: #fffce8;
            height: 27px;
            font-size: 11px;
          }

          .roster-pdf-table .summary-title-cell {
            text-align: left;
            padding-left: 5px;
            font-weight: 700;
            text-decoration: underline;
          }

          .roster-pdf-table .summary-total-row td {
            font-weight: 700;
          }

          .roster-pdf-table .summary-label {
            text-align: left;
            padding-left: 5px;
            font-weight: 700;
          }

          .note-section {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin-top: 8px;
            font-size: 11px;
          }

          .note-text {
            flex: 1;
          }

          .signature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 50px;
            margin-top: 18px;
            text-align: center;
            font-size: 11px;
          }

          .signature-line {
            margin-bottom: 5px;
          }
        </style>

        <div class="pdf-sheet">
          <div class="pdf-title">
            ตารางเวรปฏิบัติงาน ${escapeHtml(
              departmentName
            )} กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต
          </div>

          <div class="pdf-subtitle">
            ประจำเดือน ${thaiMonth} พ.ศ.${buddhistYear}
            ${
              staffView === 'all'
                ? ''
                : ` - ${viewLabel}`
            }
          </div>

          <div class="pdf-meta">
            <span>จำนวน</span>
            <b>${daysInMonth}</b>
            <span>วัน</span>
            <span>/</span>
            <b>${workingDays}</b>
            <span>วันทำการ</span>
          </div>


          <table class="roster-pdf-table">
            <colgroup>
              <col style="width:28px" />
              <col style="width:195px" />
              <col style="width:30px" />
              ${daysArray
                .map(() => '<col style="width:33px" />')
                .join('')}
              ${Array.from({ length: 9 })
                .map(() => '<col style="width:20px" />')
                .join('')}
            </colgroup>

            <thead>
              <tr>
                <th rowspan="2" style="width:28px">ที่</th>
                <th rowspan="2" style="width:195px">ชื่อ-สกุล</th>
                <th rowspan="2" class="position-head" style="width:30px">
                  <span class="position-head-text">ตำแหน่ง</span>
                </th>

                <th
                  colspan="${daysInMonth}"
                  class="major-head"
                >
                  <div class="major-head-content">
                    <span>วันที่</span>
                    <span class="staffing-ratio">7&nbsp;&nbsp;:&nbsp;&nbsp;6&nbsp;&nbsp;:&nbsp;&nbsp;5</span>
                  </div>
                </th>

                <th rowspan="2" class="summary-head short"><span class="summary-head-text">เวร OFF</span></th>
                <th rowspan="2" class="summary-head"><span class="summary-head-text">จน.เวรทั้งหมด</span></th>
                <th rowspan="2" class="summary-head short"><span class="summary-head-text">Total OT</span></th>
                <th rowspan="2" class="summary-head"><span class="summary-head-text">ช คุณภาพ(OT)</span></th>
                <th rowspan="2" class="summary-head"><span class="summary-head-text">ช คุณภาพไม่ OT</span></th>
                <th rowspan="2" class="summary-head short"><span class="summary-head-text">ช ward</span></th>
                <th rowspan="2" class="summary-head short"><span class="summary-head-text">บ</span></th>
                <th rowspan="2" class="summary-head short"><span class="summary-head-text">ด</span></th>
                <th rowspan="2" class="summary-head short"><span class="summary-head-text">vac</span></th>
              </tr>

              <tr>
                ${dayHeaders}
              </tr>
            </thead>

            <tbody>
              ${staffRows}
              ${summaryRows}
            </tbody>
          </table>

          <div class="note-section">
            <div class="note-text">
              <b>หมายเหตุ</b>
              &nbsp;&nbsp;
              เวรเช้า (ช) ปฏิบัติงาน 08.30 - 16.30 น.
              &nbsp;&nbsp;
              เวรบ่าย (บ) 16.30 - 00.30 น.
              &nbsp;&nbsp;
              เวรดึก (ด) 00.30 - 08.30 น. ของวันรุ่งขึ้น
            </div>
          </div>

          <div class="signature-grid">
            <div>
              <div class="signature-line">
                ลงชื่อ ................................................ ผู้จัด
              </div>
              <div>(................................................)</div>
            </div>

            <div>
              <div class="signature-line">
                ลงชื่อ ................................................ ผู้ตรวจสอบ
              </div>
              <div>(................................................)</div>
            </div>

            <div>
              <div class="signature-line">
                ลงชื่อ ................................................ ผู้อนุมัติ
              </div>
              <div>(................................................)</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(printRoot);

      const canvas = await html2canvas(printRoot, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(printRoot);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 4;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const imageRatio =
        canvas.width / canvas.height;

      let renderWidth = maxWidth;
      let renderHeight = renderWidth / imageRatio;

      if (renderHeight > maxHeight) {
        renderHeight = maxHeight;
        renderWidth = renderHeight * imageRatio;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      const imageData = canvas.toDataURL(
        'image/jpeg',
        0.95
      );

      pdf.addImage(
        imageData,
        'JPEG',
        x,
        y,
        renderWidth,
        renderHeight,
        undefined,
        'FAST'
      );

      const safeDepartmentName =
        String(departmentName)
          .replace(/[\\/:*?"<>|]/g, '-')
          .trim();

      const fileName =
        `ตารางเวร_${safeDepartmentName}_${selectedMonth}_${viewLabel}.pdf`;

      return {
        pdf,
        fileName,
      };
    } catch (error) {
      console.error('Export PDF error:', error);

      alert(
        'สร้าง PDF ไม่สำเร็จ กรุณาตรวจสอบว่าได้ติดตั้ง html2canvas และ jspdf แล้ว'
      );

      return null;
    }
  };

  const handlePreviewPdf = async () => {
    if (pdfExporting) return;

    setPdfExporting(true);

    try {
      const result = await buildRosterPdf();

      if (!result) return;

      const pdfBlob = result.pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const previewWindow = window.open(
        pdfUrl,
        '_blank',
        'noopener,noreferrer'
      );

      if (!previewWindow) {
        alert(
          'เบราว์เซอร์บล็อกหน้าต่าง PDF กรุณาอนุญาต Pop-up แล้วลองใหม่'
        );
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 60_000);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfExporting) return;

    setPdfExporting(true);

    try {
      const result = await buildRosterPdf();

      if (!result) return;

      result.pdf.save(result.fileName);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!selectedDept || staffList.length === 0) {
      alert('ไม่พบข้อมูลสำหรับดาวน์โหลด');
      return;
    }

    const departmentName =
      visibleDepartments.find(
        (dept) => Number(dept.id) === Number(selectedDept)
      )?.Department || 'หน่วยงาน';

    const exportStaff =
      staffView === 'all'
        ? staffList
        : staffList.filter((staff) => {
            const position = String(staff.position || '')
              .trim()
              .toUpperCase();

            if (staffView === 'nurse') {
              return ['RN', 'HW', 'TN'].includes(position);
            }

            return !['RN', 'HW', 'TN'].includes(position);
          });

    // ใช้ array-of-arrays เพื่อบังคับลำดับคอลัมน์
    // หลีกเลี่ยง json_to_sheet เพราะ key วันที่ 10-31
    // ถูก JavaScript จัดเป็น numeric keys และย้ายไปหน้า column อัตโนมัติ
    const aoa: (string | number)[][] = [
      [
        'รายชื่อบุคลากร',
        'ตำแหน่ง',
        ...daysArray,
      ],
      ...exportStaff.map((staff) => [
        staff.full_name || '',
        staff.position || '',
        ...daysArray.map(
          (day) =>
            rosterData[`${staff.id}_${day}`] || ''
        ),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // ความกว้างคอลัมน์
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 10 },
      ...daysArray.map(() => ({ wch: 5 })),
    ];

    // Freeze หัวตาราง/ชื่อบุคลากรไว้ (Excel ที่รองรับจะใช้งานได้)
    (worksheet as any)['!freeze'] = {
      xSplit: 2,
      ySplit: 1,
      topLeftCell: 'C2',
      activePane: 'bottomRight',
      state: 'frozen',
    };

    const workbook = XLSX.utils.book_new();

    const viewLabel =
      staffView === 'nurse'
        ? 'พยาบาล'
        : staffView === 'support'
        ? 'สนับสนุน'
        : 'ทั้งหมด';

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      viewLabel.substring(0, 31)
    );

    const safeDepartmentName = String(departmentName)
      .replace(/[\\/:*?"<>|]/g, '-')
      .trim();

    const fileName =
      `ตารางเวร_${safeDepartmentName}_${selectedMonth}_${viewLabel}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const NURSE_GROUP_POSITIONS = ['RN', 'HW', 'TN'];

  const filteredStaffList = staffList.filter((staff) => {
    const position = String(staff.position || '').trim().toUpperCase();

    if (staffView === 'nurse') {
      return NURSE_GROUP_POSITIONS.includes(position);
    }

    if (staffView === 'support') {
      return !NURSE_GROUP_POSITIONS.includes(position);
    }

    return true;
  });

  const nurseCount = staffList.filter((staff) =>
    NURSE_GROUP_POSITIONS.includes(
      String(staff.position || '').trim().toUpperCase()
    )
  ).length;

  const supportCount = staffList.length - nurseCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pt-0 px-4 pb-6 space-y-4 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                ตารางเวรปฏิบัติงาน
              </h1>

              <a
                href="/dashboard/staffing"
                className="text-[11px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition font-semibold"
              >
                ← กลับหน้าภาพรวม
              </a>
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              จัดเวร ตรวจอัตรากำลัง และบันทึกเวรประจำเดือนของบุคลากรในหน่วยงาน
            </p>

            {userProfile && !allowEdit && (
              <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                โหมดดูอย่างเดียว ({userProfile.role || 'user'})
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              disabled={!allowDepartmentSelect}
              className={`h-10 min-w-[180px] border border-slate-300 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold ${
                allowDepartmentSelect
                  ? 'bg-white cursor-pointer'
                  : 'bg-slate-100 text-slate-600 cursor-not-allowed'
              }`}
            >
              {visibleDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.Department}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 border border-slate-300 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-semibold cursor-pointer"
            />

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStaffView('all')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  staffView === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ทั้งหมด {staffList.length}
              </button>

              <button
                type="button"
                onClick={() => setStaffView('nurse')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  staffView === 'nurse'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                พยาบาล (RN/HW/TN) {nurseCount}
              </button>

              <button
                type="button"
                onClick={() => setStaffView('support')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  staffView === 'support'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                สนับสนุน {supportCount}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-2 bg-slate-50/60">
          {/* ทุก staff ที่ login แล้วต้องเห็นปุ่มขอหยุด */}
          {userProfile && (
            <a
              href="/dashboard/staffing/day-off"
              className="h-9 inline-flex items-center bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 rounded-xl text-[11px] font-bold transition"
            >
              ขอหยุด
            </a>
          )}

          {/* ปุ่มจัดการระบบ แสดงเฉพาะผู้ที่มีสิทธิ์แก้ตารางเวร */}
          {allowEdit && (
            <>
              <label className="h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 rounded-xl text-[11px] font-bold cursor-pointer transition flex items-center gap-1.5">
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
                type="button"
                onClick={handleExportExcel}
                disabled={loading || staffList.length === 0}
                className="h-9 inline-flex items-center bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 px-3 rounded-xl text-[11px] font-bold transition disabled:opacity-50"
              >
                ดาวน์โหลด Excel
              </button>

              <button
                type="button"
                onClick={handlePreviewPdf}
                disabled={
                  pdfExporting ||
                  loading ||
                  staffList.length === 0
                }
                className="h-9 inline-flex items-center bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 rounded-xl text-[11px] font-bold transition disabled:opacity-50"
              >
                {pdfExporting
                  ? 'กำลังสร้าง PDF...'
                  : 'ดูตัวอย่าง PDF'}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={
                  pdfExporting ||
                  loading ||
                  staffList.length === 0
                }
                className="h-9 inline-flex items-center bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 px-3 rounded-xl text-[11px] font-bold transition disabled:opacity-50"
              >
                ดาวน์โหลด PDF
              </button>

              <a
                href="/dashboard/staffing/staff"
                className="h-9 inline-flex items-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 rounded-xl text-[11px] font-bold transition"
              >
                จัดการบุคลากร
              </a>

              <a
                href="/dashboard/staffing/rules"
                className="h-9 inline-flex items-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 rounded-xl text-[11px] font-bold transition"
              >
                ตั้งค่ากติกา
              </a>

              {userProfile?.role === 'admin' && (
                <a
                  href="/dashboard/staffing/holidays"
                  className="h-9 inline-flex items-center bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 px-3 rounded-xl text-[11px] font-bold transition"
                >
                  จัดการวันหยุด
                </a>
              )}
            </>
          )}

          <button
            onClick={handleAutoSchedule}
            disabled={
              autoScheduling ||
              loading ||
              !allowEdit ||
              staffList.length === 0
            }
            className="h-9 bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 px-3 rounded-xl text-[11px] font-bold transition disabled:opacity-50"
          >
            {autoScheduling
              ? 'กำลังช่วยจัดเวร...'
              : staffView === 'support'
              ? 'ช่วยจัดเวรสนับสนุน'
              : staffView === 'nurse'
              ? 'ช่วยจัดเวรพยาบาล'
              : 'ช่วยจัดเวรทั้งหมด'}
          </button>

          <div className="flex-1" />

          <button
            onClick={handleSaveRoster}
            disabled={saving || !allowEdit}
            className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white px-4 rounded-xl text-[11px] font-bold shadow-sm transition disabled:opacity-50"
          >
            {!allowEdit
              ? 'ดูอย่างเดียว'
              : saving
              ? 'กำลังบันทึก...'
              : 'บันทึกตารางเวร'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {(rulesLoading || rulesError) && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold ${
            rulesError
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          {rulesLoading ? 'กำลังโหลดกติกาการจัดเวร...' : rulesError}
        </div>
      )}

      {hasValidated && staffList.length > 0 && (
        <div className="space-y-3">
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs ${
              visibleValidationIssues.length === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="font-semibold">
              {visibleValidationIssues.length === 0
                ? 'ตารางเวรผ่านกติกาที่ตรวจอัตโนมัติทั้งหมด'
                : `ตรวจอัตโนมัติพบ ${visibleProblemDays.size} วันที่มีปัญหา (${problemShiftCount} เวร / ${visibleValidationIssues.length} ประเด็น)`}
            </div>

            <div className="text-[11px] opacity-80">
              วันที่มีปัญหาจะแสดงเป็นสีแดง — คลิกเลขวันที่เพื่อดูรายละเอียด
            </div>
          </div>

          {selectedProblemDay && (
            <div className="bg-white border border-rose-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-rose-800">
                    รายละเอียดปัญหา วันที่ {Number(selectedProblemDay)}
                  </h3>
                  <p className="text-[11px] text-rose-600 mt-0.5">
                    {staffView === 'nurse'
                      ? 'แสดงเฉพาะปัญหากลุ่มพยาบาล: RN / Skill Mix / หัวหน้าเวร'
                      : staffView === 'support'
                      ? 'แสดงเฉพาะปัญหากลุ่มสนับสนุน: PN / NA / พนง.'
                      : 'แสดงผลตรวจ RN / Skill Mix / PN / NA / พนง. แยกตามเวรของวันที่เลือก'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProblemDay(null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"
                >
                  ปิด
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3">
                {visibleSelectedDaySummary.map((item) => (
                  <div
                    key={`${item.day}-${item.shiftCode}`}
                    className={`p-4 border-b md:border-b-0 md:border-r last:border-r-0 border-slate-100 ${
                      item.valid ? 'bg-white' : 'bg-rose-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="font-bold text-slate-800">
                        เวร {item.shiftCode}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          item.valid
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.valid ? 'ผ่าน' : 'ต้องแก้ไข'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {staffView !== 'support' && (
                        <>
                          <div
                            className={
                              item.rnCount < item.requiredRn
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            RN: {item.rnCount}/{item.requiredRn} คน
                          </div>

                          <div
                            className={
                              item.seniorCount < item.requiredSenior
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            Expert/Proficient: {item.seniorCount}/
                            {item.requiredSenior} คน
                          </div>

                          <div
                            className={
                              item.leaderCount < item.requiredLeader
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            หัวหน้าเวร: {item.leaderCount}/
                            {item.requiredLeader} คน
                          </div>
                        </>
                      )}

                      {staffView !== 'nurse' && item.requiredPn > 0 && (
                        <div
                          className={
                            item.pnCount < item.requiredPn
                              ? 'text-rose-700 font-bold'
                              : 'text-slate-600'
                          }
                        >
                          PN: {item.pnCount}/{item.requiredPn} คน
                        </div>
                      )}

                      {staffView !== 'nurse' && item.requiredNa > 0 && (
                        <div
                          className={
                            item.naCount < item.requiredNa
                              ? 'text-rose-700 font-bold'
                              : 'text-slate-600'
                          }
                        >
                          NA: {item.naCount}/{item.requiredNa} คน
                        </div>
                      )}

                      {staffView !== 'nurse' && item.requiredSupport > 0 && (
                        <div
                          className={
                            item.supportCount < item.requiredSupport
                              ? 'text-rose-700 font-bold'
                              : 'text-slate-600'
                          }
                        >
                          พนง.: {item.supportCount}/{item.requiredSupport} คน
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {visibleSelectedDayIssues.filter(
                (issue) =>
                  issue.ruleCode === 'NIGHT_TO_MORNING' ||
                  issue.ruleCode === 'FORBIDDEN_DOUBLE_SHIFT'
              ).length > 0 && (
                <div className="border-t border-slate-200 px-4 py-3 bg-white">
                  <div className="text-xs font-bold text-slate-700 mb-1">
                    ปัญหารายบุคคล
                  </div>
                  {visibleSelectedDayIssues
                    .filter(
                      (issue) =>
                        issue.ruleCode === 'NIGHT_TO_MORNING' ||
                        issue.ruleCode === 'FORBIDDEN_DOUBLE_SHIFT'
                    )
                    .map((issue, index) => (
                      <div
                        key={`${issue.staffId || 'staff'}-${issue.ruleCode}-${index}`}
                        className="text-xs text-rose-700 py-1"
                      >
                        • {issue.staffName || 'บุคลากร'} — {issue.message}
                        {issue.previousDay
                          ? ` (เวรก่อนหน้า: ${issue.previousDay})`
                          : ''}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
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
                  const holidayName = getHolidayName(day);
                  const hasProblem = visibleProblemDays.has(day);
                  const isSelected = selectedProblemDay === day;

                  return (
                    <th
                      key={day}
                      onClick={() => {
                        if (hasProblem) {
                          setSelectedProblemDay(
                            isSelected ? null : day
                          );
                        }
                      }}
                      className={`px-0 py-2.5 border-r border-slate-200 transition select-none ${
                        hasProblem
                          ? isSelected
                            ? 'bg-rose-600 text-white cursor-pointer'
                            : 'bg-rose-100 text-rose-700 cursor-pointer hover:bg-rose-200'
                          : holidayName
                          ? 'bg-rose-100 text-rose-800'
                          : weekend
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100'
                      }`}
                      title={
                        hasProblem
                          ? `วันที่ ${Number(day)} มีปัญหา — คลิกเพื่อดูรายละเอียด`
                          : `วันที่ ${Number(day)} ${
                              holidayName
                                ? `(${holidayName})`
                                : weekend
                                ? '(วันหยุดเสาร์-อาทิตย์)'
                                : ''
                            }`
                      }
                    >
                      <div className="leading-none font-extrabold">
                        {day}
                      </div>
                      {!hasProblem && holidayName && (
                        <div className="mt-1 text-[7px] font-bold text-rose-600">
                          หยุด
                        </div>
                      )}
                      {hasProblem && (
                        <div
                          className={`text-[8px] mt-1 ${
                            isSelected ? 'text-white' : 'text-rose-500'
                          }`}
                        >
                          ●
                        </div>
                      )}
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
              ) : filteredStaffList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="py-12 text-slate-400 font-medium">
                    ไม่พบบุคลากรในกลุ่มที่เลือก
                  </td>
                </tr>
              ) : (
                filteredStaffList.map((staff) => (
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
                      const holiday = isHoliday(day);
                      return (
                        <td key={day} className={`px-0.5 py-1 border-r border-slate-200 ${holiday ? 'bg-amber-50/40' : ''}`}>
                          <input
                            type="text"
                            maxLength={8}
                            value={currentShift}
                            readOnly={!allowEdit}
                            onChange={(e) => {
                              if (allowEdit) {
                                handleShiftChange(staff.id, day, e.target.value);
                              }
                            }}
                            placeholder="-"
                            className={`w-full text-center py-1 text-[11px] rounded border uppercase focus:outline-none focus:ring-1 transition ${
                              invalidSequenceCellKeys.has(cellKey)
                                ? 'bg-rose-100 text-rose-900 border-rose-500 ring-1 ring-rose-400 font-extrabold'
                                : getShiftBadgeStyle(currentShift)
                            }`}
                            title={
                              invalidSequenceCellKeys.has(cellKey)
                                ? validationIssues
                                    .filter(
                                      (issue) =>
                                        String(issue.staffId) === String(staff.id) &&
                                        issue.day === day &&
                                        (
                                          issue.ruleCode === 'NIGHT_TO_MORNING' ||
                                          issue.ruleCode === 'FORBIDDEN_DOUBLE_SHIFT'
                                        )
                                    )
                                    .map((issue) => issue.message)
                                    .join(' | ')
                                : `วันที่ ${day}/${selectedMonth} - ${staff.full_name}`
                            }
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
          <span className="px-2 py-1 bg-teal-50 text-teal-800 rounded border border-teal-200"><b>ช/บ, ช/ด, บ/ช, ด/ช</b> (เวรควบที่อนุญาต)</span>
          <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded border border-rose-300 font-bold"><b>บ/ด, ด/บ</b> (ห้ามจัด — Hard Rule)</span>
          <span className="px-2 py-1 bg-sky-50 text-sky-800 rounded border border-sky-200"><b>ปช, ปชช</b> (ประชุม)</span>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200"><b>0, F/0, VAC</b> (วันหยุด)</span>
          <span className="px-2 py-1 bg-rose-50 text-rose-800 rounded border border-rose-200"><b>ป่วย, ลากิจ, คลอด</b> (การลา)</span>
        </div>
      </div>
    </div>
  );
}
