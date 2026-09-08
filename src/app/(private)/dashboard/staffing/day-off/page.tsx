'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  getVisibleDepartments,
  canSelectDepartment,
  type UserProfile,
} from '@/lib/permissions/staffingAccess';

type Department = {
  id: number;
  Department: string;
  group?: string | null;
};

type Staff = {
  id: number;
  full_name: string;
  position: string | null;
  department_id: number;
  active: boolean | null;
};

type DayOffStatus = 'pending' | 'approved' | 'rejected';

type DayOffRequest = {
  id: number;
  department_id: number;
  staff_id: number;
  request_date: string;
  request_type: string;
  requested_shift: string | null;
  status: DayOffStatus;
  note: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DayOffCapacityRule = {
  id: number;
  start_date: string;
  end_date: string;
  max_nurse_off_per_day: number | null;
  max_pn_off_per_day: number | null;
  max_na_off_per_day: number | null;
  max_employee_off_per_day: number | null;
  active: boolean;
};

type DayOffStaffGroup = 'nurse' | 'pn' | 'na' | 'employee';
type DayOffUsage = Record<string, Record<DayOffStaffGroup, number>>;

const DEFAULT_MAX_OFF_PER_GROUP = 2;
const NURSE_POSITIONS = new Set(['RN', 'HW', 'TN']);

function getDayOffStaffGroup(position: string | null | undefined): DayOffStaffGroup {
  const normalized = (position || '').trim().toUpperCase();
  if (NURSE_POSITIONS.has(normalized)) return 'nurse';
  if (normalized === 'PN') return 'pn';
  if (normalized === 'NA') return 'na';
  return 'employee';
}

function getDayOffGroupLabel(group: DayOffStaffGroup) {
  if (group === 'nurse') return 'พยาบาล';
  if (group === 'pn') return 'PN';
  if (group === 'na') return 'NA';
  return 'พนง.';
}

const statusLabel: Record<DayOffStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
};

function getDaysInMonth(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function buildDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');

    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatThaiDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCalendarDays(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const leadingDays = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: leadingDays + daysInMonth }, (_, index) => {
    if (index < leadingDays) return null;
    return toDateValue(new Date(year, month - 1, index - leadingDays + 1));
  });
}

export default function StaffingDayOffPage() {
  const supabase = createClient();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | string>('');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userGroup, setUserGroup] = useState<string | null>(null);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [requests, setRequests] = useState<DayOffRequest[]>([]);
  const [capacityRules, setCapacityRules] = useState<DayOffCapacityRule[]>([]);
  const [calendarUsage, setCalendarUsage] = useState<DayOffUsage>({});
  const [officialHolidayDates, setOfficialHolidayDates] = useState<Set<string>>(
    new Set()
  );

  const [selectedStaffId, setSelectedStaffId] = useState<number | string>('');
  const [requestStartDate, setRequestStartDate] = useState('');
  const [requestEndDate, setRequestEndDate] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // อ่านผู้ใช้ปัจจุบันจาก NextAuth session API
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
        setCurrentUserEmail(result?.user?.email ?? '');
      } catch (error) {
        console.error('Load session user error:', error);
        setCurrentUserEmail('');
      }
    }

    loadSessionUser();
  }, []);

  // โหลด profile + หน่วยงานตามสิทธิ์
  useEffect(() => {
    async function loadAccessContext() {
      if (!currentUserEmail) return;

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, department_id, role, email')
          .eq('email', currentUserEmail)
          .single();

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

        let currentUserGroup: string | null = null;

        if (normalizedProfile.department_id) {
          const { data: ownDepartment, error: ownDepartmentError } =
            await supabase
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

        const { data: departmentRows, error: departmentsError } =
          await supabase
            .from('departments')
            .select('id, Department, group')
            .order('Department', { ascending: true });

        if (departmentsError) {
          console.error(
            'Error fetching departments:',
            departmentsError.message
          );
          setDepartments([]);
          setSelectedDept('');
          return;
        }

        const allDepartments = (departmentRows || []) as Department[];
        setDepartments(allDepartments);

        const allowedDepartments = getVisibleDepartments(
          allDepartments,
          normalizedProfile,
          currentUserGroup
        );

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
          setSelectedDept(normalizedProfile.department_id ?? '');
        }
      } catch (error) {
        console.error('Load access context error:', error);
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

  // สิทธิ์หน้า "ขอหยุด" แยกจากสิทธิ์แก้ตารางเวร
  // ผู้ใช้ทุกคนที่มี department_id สามารถเพิ่มคำขอหยุดได้
  const canCreateRequest =
    userProfile?.department_id !== null &&
    userProfile?.department_id !== undefined;

  // ผู้อนุมัติคำขอ
  const canApproveRequest =
    userProfile?.role === 'admin' ||
    userProfile?.role === 'head_department';

  // ผู้ลบคำขอ
  const canDeleteRequest =
    userProfile?.role === 'admin' ||
    userProfile?.role === 'head_department';

  // กติกาการขอหยุดสำหรับ staff:
  // ขอหยุด "เดือนถัดไป" ได้เฉพาะวันที่ 1-10 ของเดือนปัจจุบัน
  // admin / head_department ไม่ถูกจำกัดด้วยช่วงเวลานี้
  const isStaffRole = userProfile?.role === 'staff';

  const getRequestWindow = () => {
    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentDay = now.getDate();

    const targetStart = new Date(
      currentYear,
      currentMonth + 1,
      1
    );

    const targetEnd = new Date(
      currentYear,
      currentMonth + 2,
      0
    );

    const toLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(
        date.getMonth() + 1
      ).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    };

    return {
      isOpen: currentDay >= 1 && currentDay <= 10,
      currentDay,
      targetMonth: `${targetStart.getFullYear()}-${String(
        targetStart.getMonth() + 1
      ).padStart(2, '0')}`,
      targetStartDate: toLocalDateString(targetStart),
      targetEndDate: toLocalDateString(targetEnd),
    };
  };

  const requestWindow = getRequestWindow();

  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const getDayCapacity = (date: string, group: DayOffStaffGroup) => {
    const matched = capacityRules
      .filter(
        (rule) =>
          rule.active && date >= rule.start_date && date <= rule.end_date
      )
      .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];

    if (!matched) return DEFAULT_MAX_OFF_PER_GROUP;

    if (group === 'nurse') {
      return matched.max_nurse_off_per_day ?? DEFAULT_MAX_OFF_PER_GROUP;
    }
    if (group === 'pn') return matched.max_pn_off_per_day ?? 1;
    if (group === 'na') return matched.max_na_off_per_day ?? 1;
    return matched.max_employee_off_per_day ?? 1;
  };

  useEffect(() => {
    async function loadCapacityAndUsage() {
      if (!selectedDept || !calendarMonth) {
        setCapacityRules([]);
        setCalendarUsage({});
        return;
      }

      const [year, month] = calendarMonth.split('-').map(Number);
      const startDate = `${calendarMonth}-01`;
      const endDate = `${calendarMonth}-${String(
        new Date(year, month, 0).getDate()
      ).padStart(2, '0')}`;

      const [{ data: rules }, { data: usedRequests }] = await Promise.all([
        supabase
          .from('day_off_capacity_rules')
          .select(
            'id, start_date, end_date, max_nurse_off_per_day, max_pn_off_per_day, max_na_off_per_day, max_employee_off_per_day, active'
          )
          .eq('department_id', Number(selectedDept))
          .eq('active', true)
          .lte('start_date', endDate)
          .gte('end_date', startDate),
        supabase
          .from('staff_requests')
          .select('staff_id, request_date')
          .eq('department_id', Number(selectedDept))
          .eq('request_type', 'OFF')
          .in('status', ['pending', 'approved'])
          .gte('request_date', startDate)
          .lte('request_date', endDate),
      ]);

      setCapacityRules((rules || []) as DayOffCapacityRule[]);

      const staffById = new Map(
        staffList.map((staff) => [Number(staff.id), staff])
      );
      const staffByDateAndGroup = new Map<string, Set<string>>();
      (usedRequests || []).forEach((item: any) => {
        const group = getDayOffStaffGroup(
          staffById.get(Number(item.staff_id))?.position
        );
        const key = `${item.request_date}:${group}`;
        if (!staffByDateAndGroup.has(key)) {
          staffByDateAndGroup.set(key, new Set());
        }
        staffByDateAndGroup.get(key)?.add(String(item.staff_id));
      });

      const usage: DayOffUsage = {};
      staffByDateAndGroup.forEach((staffIds, key) => {
        const separator = key.lastIndexOf(':');
        const date = key.slice(0, separator);
        const group = key.slice(separator + 1) as DayOffStaffGroup;
        usage[date] ||= { nurse: 0, pn: 0, na: 0, employee: 0 };
        usage[date][group] = staffIds.size;
      });
      setCalendarUsage(usage);
    }

    loadCapacityAndUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth, selectedDept, staffList]);

  const selectRequestDate = (date: string) => {
    // คลิกแรกเป็นคำขอ 1 วันทันที และคลิกวันที่ถัดไปเพื่อขยายเป็นช่วง
    if (!requestStartDate || requestEndDate !== requestStartDate) {
      setRequestStartDate(date);
      setRequestEndDate(date);
      return;
    }

    if (date >= requestStartDate) {
      setRequestEndDate(date);
    } else {
      setRequestStartDate(date);
      setRequestEndDate(date);
    }
  };

  const changeCalendarMonth = (offset: number) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const nextMonth = new Date(year, month - 1 + offset, 1);
    setCalendarMonth(
      `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(
        2,
        '0'
      )}`
    );
  };

  const canStaffSubmitRequest =
    !isStaffRole || requestWindow.isOpen;

  // โหลดบุคลากรในหน่วยงาน
  useEffect(() => {
    async function loadStaff() {
      if (!selectedDept) {
        setStaffList([]);
        setSelectedStaffId('');
        return;
      }

      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, position, department_id, active')
        .eq('department_id', Number(selectedDept))
        .eq('active', true)
        .order('id', { ascending: true });

      if (error) {
        console.error('Load staff error:', error);
        setStaffList([]);
        setSelectedStaffId('');
        return;
      }

      const rows = (data || []) as Staff[];
      setStaffList(rows);

      setSelectedStaffId((current) => {
        const stillExists = rows.some(
          (staff) => Number(staff.id) === Number(current)
        );
        return stillExists ? current : rows[0]?.id ?? '';
      });
    }

    loadStaff();
  }, [supabase, selectedDept]);

  const staffMap = useMemo(() => {
    return new Map(staffList.map((staff) => [Number(staff.id), staff]));
  }, [staffList]);

  const sortedRequests = useMemo(() => {
    const statusPriority: Record<DayOffStatus, number> = {
      pending: 0,
      approved: 1,
      rejected: 2,
    };

    return [...requests].sort((a, b) => {
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      const dateDiff = a.request_date.localeCompare(b.request_date);
      if (dateDiff !== 0) return dateDiff;

      return (a.created_at || '').localeCompare(b.created_at || '');
    });
  }, [requests]);

  const requestsByDate = useMemo(() => {
    const grouped = new Map<string, DayOffRequest[]>();
    requests.forEach((request) => {
      const current = grouped.get(request.request_date) || [];
      current.push(request);
      grouped.set(request.request_date, current);
    });
    grouped.forEach((items) => {
      items.sort((a, b) => {
        const priority: Record<DayOffStatus, number> = {
          pending: 0,
          approved: 1,
          rejected: 2,
        };
        return priority[a.status] - priority[b.status];
      });
    });
    return grouped;
  }, [requests]);

  const displayCalendarDays = useMemo(
    () => getCalendarDays(selectedMonth),
    [selectedMonth]
  );

  useEffect(() => {
    async function loadOfficialHolidays() {
      const { data, error } = await supabase
        .from('staffing_holidays')
        .select('*');

      if (error) {
        console.error('Load staffing holidays error:', error);
        setOfficialHolidayDates(new Set());
        return;
      }

      const dates = new Set<string>();
      (data || []).forEach((item: any) => {
        // รองรับทั้งชื่อคอลัมน์ holiday_date และ date
        const holidayDate = item.holiday_date ?? item.date;
        if (
          typeof holidayDate === 'string' &&
          holidayDate.slice(0, 7) === selectedMonth
        ) {
          dates.add(holidayDate.slice(0, 10));
        }
      });
      setOfficialHolidayDates(dates);
    }

    loadOfficialHolidays();
  }, [supabase, selectedMonth]);

  const isOfficialDayOff = (date: string) => {
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6 || officialHolidayDates.has(date);
  };

  const selectedDateRequests = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return requestsByDate.get(selectedCalendarDate) || [];
  }, [requestsByDate, selectedCalendarDate]);

  const selectedStaff = useMemo(
    () => staffList.find((staff) => Number(staff.id) === Number(selectedStaffId)),
    [staffList, selectedStaffId]
  );

  // โหลดคำขอหยุดของเดือนที่เลือก
  const loadRequests = async () => {
    if (!selectedDept || !selectedMonth) {
      setRequests([]);
      return;
    }

    setLoading(true);

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-${String(
      getDaysInMonth(selectedMonth)
    ).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('staff_requests')
      .select(`
        id,
        department_id,
        staff_id,
        request_date,
        request_type,
        requested_shift,
        status,
        note,
        created_at,
        updated_at
      `)
      .eq('department_id', Number(selectedDept))
      .eq('request_type', 'OFF')
      .gte('request_date', startDate)
      .lte('request_date', endDate)
      .order('request_date', { ascending: true });

    if (error) {
      console.error('Load day-off requests error:', error);
      setMessage(`โหลดคำขอหยุดไม่สำเร็จ: ${error.message}`);
      setRequests([]);
    } else {
      setRequests((data || []) as DayOffRequest[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedMonth]);

  const findCapacityConflicts = async (dates: string[], targetStaffId: number) => {
    if (!selectedDept || dates.length === 0) return [] as string[];

    const [{ data: rules, error: rulesError }, { data: used, error: usedError }] =
      await Promise.all([
        supabase
          .from('day_off_capacity_rules')
          .select(
            'start_date, end_date, max_nurse_off_per_day, max_pn_off_per_day, max_na_off_per_day, max_employee_off_per_day, active'
          )
          .eq('department_id', Number(selectedDept))
          .eq('active', true)
          .lte('start_date', dates[dates.length - 1])
          .gte('end_date', dates[0]),
        supabase
          .from('staff_requests')
          .select('staff_id, request_date')
          .eq('department_id', Number(selectedDept))
          .eq('request_type', 'OFF')
          .in('status', ['pending', 'approved'])
          .in('request_date', dates),
      ]);

    if (rulesError) throw new Error(`โหลดกติกาการขอหยุดไม่สำเร็จ: ${rulesError.message}`);
    if (usedError) throw new Error(`ตรวจสอบจำนวนผู้ขอหยุดไม่สำเร็จ: ${usedError.message}`);

    const ruleRows = (rules || []) as DayOffCapacityRule[];
    const targetStaff = staffMap.get(Number(targetStaffId));
    const targetGroup = getDayOffStaffGroup(targetStaff?.position);

    return dates.filter((date) => {
      const matched = ruleRows
        .filter((rule) => date >= rule.start_date && date <= rule.end_date)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
      const maximum = matched
        ? targetGroup === 'nurse'
          ? matched.max_nurse_off_per_day ?? DEFAULT_MAX_OFF_PER_GROUP
          : targetGroup === 'pn'
          ? matched.max_pn_off_per_day ?? 1
          : targetGroup === 'na'
          ? matched.max_na_off_per_day ?? 1
          : matched.max_employee_off_per_day ?? 1
        : targetGroup === 'nurse'
        ? DEFAULT_MAX_OFF_PER_GROUP
        : 1;
      const otherStaff = new Set(
        (used || [])
          .filter(
            (item: any) =>
              item.request_date === date &&
              Number(item.staff_id) !== Number(targetStaffId) &&
              getDayOffStaffGroup(
                staffMap.get(Number(item.staff_id))?.position
              ) === targetGroup
          )
          .map((item: any) => String(item.staff_id))
      ).size;

      return maximum === 0 || otherStaff + 1 > maximum;
    });
  };

  const handleCreateRequest = async () => {
    if (!canCreateRequest) {
      setMessage('บัญชีนี้ไม่มีสิทธิ์เพิ่มคำขอหยุด');
      return;
    }

    if (isStaffRole && !requestWindow.isOpen) {
      setMessage(
        'พนักงานสามารถยื่นคำขอหยุดของเดือนถัดไปได้เฉพาะวันที่ 1-10 ของเดือนปัจจุบัน'
      );
      return;
    }

    if (!selectedDept) {
      setMessage('กรุณาเลือกหน่วยงาน');
      return;
    }

    if (!selectedStaffId || !selectedStaff) {
      setMessage('กรุณาเลือกบุคลากร');
      return;
    }

    if (!selectedStaff.position) {
      setMessage('บุคลากรที่เลือกยังไม่มีตำแหน่ง');
      return;
    }

    if (!requestStartDate) {
      setMessage('กรุณาเลือกวันที่ขอหยุด');
      return;
    }

    // หากเลือกเพียงครั้งเดียว ให้ถือว่าวันสิ้นสุดเป็นวันเดียวกับวันเริ่มต้น
    const effectiveEndDate = requestEndDate || requestStartDate;

    if (effectiveEndDate < requestStartDate) {
      setMessage('ถึงวันที่ต้องไม่น้อยกว่าจากวันที่');
      return;
    }

    if (isStaffRole) {
      const isStartInTargetMonth =
        requestStartDate >= requestWindow.targetStartDate &&
        requestStartDate <= requestWindow.targetEndDate;

      const isEndInTargetMonth =
        effectiveEndDate >= requestWindow.targetStartDate &&
        effectiveEndDate <= requestWindow.targetEndDate;

      if (!isStartInTargetMonth || !isEndInTargetMonth) {
        setMessage(
          'staff สามารถขอหยุดได้เฉพาะเดือนถัดไปเท่านั้น'
        );
        return;
      }
    }

    const dates = buildDateRange(requestStartDate, effectiveEndDate);

    if (dates.length === 0) {
      setMessage('ไม่พบช่วงวันที่ที่ต้องการขอหยุด');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const fullDates = await findCapacityConflicts(
        dates,
        Number(selectedStaffId)
      );

      if (fullDates.length > 0) {
        setMessage(
          `ไม่สามารถบันทึกได้: วันที่ปิดรับหรือจำนวนผู้ขอหยุดเต็มแล้ว ${fullDates
            .map(formatThaiDate)
            .join(', ')}`
        );
        return;
      }

      const records = dates.map((date) => ({
        department_id: Number(selectedDept),
        staff_id: Number(selectedStaffId),
        request_date: date,
        request_type: 'OFF',
        requested_shift: null,
        status: 'pending' as DayOffStatus,
        note: note.trim() || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('staff_requests')
        .upsert(records, {
          onConflict: 'staff_id,request_date',
        });

      if (error) {
        throw new Error(error.message);
      }

      setMessage(`บันทึกคำขอหยุด ${records.length} วัน เรียบร้อยแล้ว`);
      setRequestStartDate('');
      setRequestEndDate('');
      setNote('');
      await loadRequests();
    } catch (error: any) {
      console.error('Create day-off request error:', error);
      setMessage(
        `บันทึกคำขอหยุดไม่สำเร็จ: ${
          error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    requestId: number,
    status: DayOffStatus
  ) => {
    if (!canApproveRequest) {
      setMessage('บัญชีนี้ไม่มีสิทธิ์อนุมัติหรือไม่อนุมัติคำขอหยุด');
      return;
    }

    const request = requests.find((item) => item.id === requestId);

    if (!request) return;

    if (status === 'approved') {
      try {
        const fullDates = await findCapacityConflicts(
          [request.request_date],
          request.staff_id
        );
        if (fullDates.length > 0) {
          const group = getDayOffStaffGroup(
            staffMap.get(Number(request.staff_id))?.position
          );
          setMessage(
            `อนุมัติไม่ได้: กลุ่ม${getDayOffGroupLabel(group)}ขอหยุดเต็มตามกติกาแล้วในวันที่ ${formatThaiDate(
              request.request_date
            )}`
          );
          return;
        }
      } catch (error: any) {
        setMessage(error?.message || 'ตรวจสอบจำนวนผู้ขอหยุดไม่สำเร็จ');
        return;
      }
    }

    const { error } = await supabase
      .from('staff_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('Update request status error:', error);
      setMessage(`ปรับสถานะไม่สำเร็จ: ${error.message}`);
      return;
    }

    setMessage(
      status === 'approved'
        ? 'อนุมัติคำขอหยุดเรียบร้อยแล้ว'
        : status === 'rejected'
        ? 'ไม่อนุมัติคำขอหยุดเรียบร้อยแล้ว'
        : 'ปรับสถานะเรียบร้อยแล้ว'
    );

    await loadRequests();
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!canDeleteRequest) {
      setMessage('บัญชีนี้ไม่มีสิทธิ์ลบคำขอหยุด');
      return;
    }

    const confirmed = window.confirm('ยืนยันลบคำขอหยุดรายการนี้?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('staff_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Delete request error:', error);
      setMessage(`ลบคำขอหยุดไม่สำเร็จ: ${error.message}`);
      return;
    }

    setMessage('ลบคำขอหยุดเรียบร้อยแล้ว');
    await loadRequests();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-xl font-bold text-slate-900">ขอหยุด</h1>

              <a
                href="/dashboard/staffing/schedule"
                className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                ← กลับหน้าตารางเวร
              </a>

              <p className="text-xs text-slate-500">
                บันทึกและอนุมัติคำขอหยุดก่อนจัดตารางเวร โดยกำหนดโควตาตามหน่วยงานและช่วงวันที่
              </p>

              {userProfile && canCreateRequest && !canApproveRequest && (
                <p className="text-[11px] text-blue-700 mt-1 font-semibold">
                  สามารถเพิ่มคำขอหยุดได้ • การอนุมัติเป็นสิทธิ์ของหัวหน้าหน่วยงาน
                </p>
              )}

              {userProfile && !canCreateRequest && (
                <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                  ไม่พบสิทธิ์หน่วยงานสำหรับการเพิ่มคำขอหยุด
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                disabled={!allowDepartmentSelect}
                className={`border border-slate-300 rounded-xl px-4 py-2 text-sm ${
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
                className="border border-slate-300 rounded-xl px-4 py-2 text-sm bg-white"
              />
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
              message.includes('เรียบร้อย')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* Request form */}
        {canCreateRequest && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            {isStaffRole && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 text-xs font-semibold ${
                  requestWindow.isOpen
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {requestWindow.isOpen
                  ? `เปิดรับคำขอหยุดเดือนถัดไป (${requestWindow.targetMonth}) ถึงวันที่ 10 ของเดือนนี้`
                  : 'ปิดรับคำขอหยุดสำหรับ staff — เปิดรับเฉพาะวันที่ 1-10 ของเดือน เพื่อขอหยุดในเดือนถัดไป'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.35fr_2.8fr_2.8fr_2.8fr_1.45fr] gap-4 items-end">
              <div className="xl:self-center">
                <h2 className="font-bold text-slate-900">เพิ่มคำขอหยุด</h2>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  บุคลากร
                </label>

                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                      {staff.position ? ` (${staff.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="text-xs font-bold text-slate-600">
                  วันที่ขอหยุด
                </label>

                <button
                  type="button"
                  disabled={isStaffRole && !requestWindow.isOpen}
                  onClick={() => {
                    const initialMonth =
                      requestStartDate.slice(0, 7) ||
                      (isStaffRole
                        ? requestWindow.targetStartDate.slice(0, 7)
                        : selectedMonth);
                    setCalendarMonth(initialMonth);
                    setIsCalendarOpen((open) => !open);
                  }}
                  className="mt-1 w-full min-h-10 border border-slate-300 rounded-xl px-3 py-2 bg-white text-left disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {requestStartDate
                    ? requestStartDate === requestEndDate
                      ? formatThaiDate(requestStartDate)
                      : `${formatThaiDate(requestStartDate)} – ${formatThaiDate(
                          requestEndDate
                        )}`
                    : 'เลือกวันที่หรือช่วงวันที่'}
                </button>

                {isCalendarOpen && (
                  <div className="absolute z-30 mt-2 w-full min-w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(-1)}
                        className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                      >
                        ‹
                      </button>
                      <div className="font-bold text-slate-800">
                        {new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString(
                          'th-TH',
                          { month: 'long', year: 'numeric' }
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(1)}
                        className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
                      {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date, index) => {
                        if (!date) return <div key={`blank-${index}`} />;

                        const outsideStaffWindow =
                          isStaffRole &&
                          (date < requestWindow.targetStartDate ||
                            date > requestWindow.targetEndDate);
                        const selectedGroup = getDayOffStaffGroup(
                          selectedStaff?.position
                        );
                        const capacity = getDayCapacity(date, selectedGroup);
                        const used = calendarUsage[date]?.[selectedGroup] || 0;
                        const isFull = capacity === 0 || used >= capacity;
                        const inRange =
                          Boolean(requestStartDate) &&
                          date >= requestStartDate &&
                          date <= requestEndDate;
                        const isEdge =
                          date === requestStartDate || date === requestEndDate;

                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={outsideStaffWindow || isFull}
                            onClick={() => selectRequestDate(date)}
                            className={`aspect-square rounded-lg text-sm transition-colors ${
                              isEdge
                                ? 'bg-emerald-700 font-bold text-white'
                                : inRange
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'text-slate-700 hover:bg-emerald-50'
                            } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300`}
                          >
                            {Number(date.slice(-2))}
                            {!outsideStaffWindow && (
                              <span className="block text-[7px] leading-none">
                                {capacity === 0
                                  ? 'ปิด'
                                  : isFull
                                  ? 'เต็ม'
                                  : `ว่าง ${capacity - used}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRequestStartDate('');
                          setRequestEndDate('');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        ล้างวันที่
                      </button>
                      <button
                        type="button"
                        disabled={!requestStartDate}
                        onClick={() => setIsCalendarOpen(false)}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        ยืนยันวันที่
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  หมายเหตุ
                </label>

                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={
                    isStaffRole &&
                    !requestWindow.isOpen
                  }
                  placeholder="ไม่บังคับ"
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <button
                  onClick={handleCreateRequest}
                  disabled={
                    saving ||
                    !selectedStaffId ||
                    !requestStartDate ||
                    !canStaffSubmitRequest
                  }
                  className="w-full min-h-10 whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {saving
                    ? 'กำลังบันทึก...'
                    : isStaffRole && !requestWindow.isOpen
                    ? 'ปิดรับคำขอ'
                    : 'บันทึกคำขอหยุด'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar / Requests list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] xl:items-center gap-4">
            <div>
              <h2 className="font-bold text-slate-900">รายการคำขอหยุด</h2>
              <p className="text-xs text-slate-500 mt-1">
                ทั้งหมด {requests.length} รายการ • รออนุมัติ{' '}
                {requests.filter((item) => item.status === 'pending').length} รายการ
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">● รออนุมัติ</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">● อนุมัติ</span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">● ไม่อนุมัติ</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-slate-600">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-rose-500" />
                วันหยุดราชการ/เสาร์–อาทิตย์
              </span>
            </div>

            <div className="inline-flex justify-self-start rounded-xl border border-slate-200 bg-slate-100 p-1 xl:justify-self-end">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  viewMode === 'calendar'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ปฏิทิน
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCalendarDate(null);
                  setViewMode('list');
                }}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  viewMode === 'list'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                รายการ
              </button>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-7 border-l border-t border-slate-200 text-center text-xs font-bold text-slate-500">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
                  <div key={day} className="border-b border-r border-slate-200 bg-slate-50 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-l border-slate-200">
                {displayCalendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`blank-${index}`} className="min-h-24 border-b border-r border-slate-200 bg-slate-50/60" />;
                  }

                  const dayRequests = requestsByDate.get(date) || [];
                  const pendingCount = dayRequests.filter((item) => item.status === 'pending').length;
                  const isSelected = selectedCalendarDate === date;
                  const isHoliday = isOfficialDayOff(date);

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedCalendarDate(date)}
                      className={`min-h-24 border-b border-r border-slate-200 p-1.5 text-left align-top transition hover:bg-emerald-50/50 ${
                        isSelected ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500' : 'bg-white'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isHoliday
                              ? 'border-2 border-rose-500 bg-rose-50 text-rose-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {Number(date.slice(-2))}
                        </span>
                        {pendingCount > 0 && (
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            รอ {pendingCount}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayRequests.slice(0, 3).map((request) => {
                          const staff = staffMap.get(Number(request.staff_id));
                          return (
                            <div
                              key={request.id}
                              className={`truncate rounded px-1.5 py-1 text-[9px] font-semibold ${
                                request.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : request.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {staff?.full_name || `ID ${request.staff_id}`}{staff?.position ? ` (${staff.position})` : ''}
                            </div>
                          );
                        })}
                        {dayRequests.length > 3 && (
                          <div className="px-1 text-[9px] font-bold text-slate-500">+{dayRequests.length - 3} รายการ</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCalendarDate && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900">
                      {formatThaiDate(selectedCalendarDate)} • {selectedDateRequests.length} รายการ
                    </h3>
                    <button type="button" onClick={() => setSelectedCalendarDate(null)} className="text-xs font-semibold text-slate-500">ปิด</button>
                  </div>
                  {selectedDateRequests.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">ไม่มีผู้ขอหยุดในวันนี้</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateRequests.map((request) => {
                        const staff = staffMap.get(Number(request.staff_id));
                        return (
                          <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{staff?.full_name || `Staff ID ${request.staff_id}`} <span className="font-normal text-slate-500">({staff?.position || '-'})</span></p>
                              <p className="mt-0.5 text-xs text-slate-500">{request.note || 'ไม่มีหมายเหตุ'} • {statusLabel[request.status]}</p>
                            </div>
                            {(canApproveRequest || canDeleteRequest) && (
                              <div className="flex flex-wrap gap-2">
                                {canApproveRequest && <button onClick={() => handleUpdateStatus(request.id, 'approved')} disabled={request.status === 'approved'} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-40">อนุมัติ</button>}
                                {canApproveRequest && <button onClick={() => handleUpdateStatus(request.id, 'rejected')} disabled={request.status === 'rejected'} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40">ไม่อนุมัติ</button>}
                                {canDeleteRequest && <button onClick={() => handleDeleteRequest(request.id)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">ลบ</button>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3">ชื่อบุคลากร</th>
                  <th className="px-4 py-3">ตำแหน่ง</th>
                  <th className="px-4 py-3">วันที่ขอหยุด</th>
                  <th className="px-4 py-3">หมายเหตุ</th>
                  <th className="px-4 py-3">สถานะ</th>
                  {(canApproveRequest || canDeleteRequest) && <th className="px-4 py-3">จัดการ</th>}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={canApproveRequest || canDeleteRequest ? 6 : 5}
                      className="text-center py-10 text-slate-500"
                    >
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canApproveRequest || canDeleteRequest ? 6 : 5}
                      className="text-center py-10 text-slate-400"
                    >
                      ยังไม่มีคำขอหยุดในเดือนนี้
                    </td>
                  </tr>
                ) : (
                  sortedRequests.map((request) => {
                    const staff = staffMap.get(Number(request.staff_id));

                    return (
                      <tr
                        key={request.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {staff?.full_name || `Staff ID ${request.staff_id}`}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {staff?.position || '-'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {formatThaiDate(request.request_date)}
                        </td>

                        <td className="px-4 py-3 text-center text-slate-600">
                          {request.note || '-'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              request.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : request.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {statusLabel[request.status]}
                          </span>
                        </td>

                        {(canApproveRequest || canDeleteRequest) && (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-center gap-2">
                              {canApproveRequest && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(request.id, 'approved')
                                    }
                                    disabled={request.status === 'approved'}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 disabled:opacity-40"
                                  >
                                    อนุมัติ
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(request.id, 'rejected')
                                    }
                                    disabled={request.status === 'rejected'}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 disabled:opacity-40"
                                  >
                                    ไม่อนุมัติ
                                  </button>
                                </>
                              )}

                              {canDeleteRequest && (
                                <button
                                  onClick={() => handleDeleteRequest(request.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200"
                                >
                                  ลบ
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
