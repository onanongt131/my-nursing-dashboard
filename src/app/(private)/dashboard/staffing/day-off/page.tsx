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

  const [selectedStaffId, setSelectedStaffId] = useState<number | string>('');
  const [requestStartDate, setRequestStartDate] = useState('');
  const [requestEndDate, setRequestEndDate] = useState('');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  type PositionConflict = {
  id: number;
  staff_id: number;
  request_date: string;
  status: DayOffStatus;
};

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

  const findPositionConflicts = async (
  dates: string[]
): Promise<PositionConflict[]> => {
  if (!selectedStaff?.position || !selectedDept || dates.length === 0) {
    return [];
  }

  const samePositionStaffIds = staffList
    .filter(
      (staff) =>
        staff.position === selectedStaff.position &&
        Number(staff.id) !== Number(selectedStaff.id)
    )
    .map((staff) => Number(staff.id));

  if (samePositionStaffIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('staff_requests')
    .select('id, staff_id, request_date, status')
    .eq('department_id', Number(selectedDept))
    .eq('request_type', 'OFF')
    .in('status', ['pending', 'approved'])
    .in('staff_id', samePositionStaffIds)
    .in('request_date', dates);

  if (error) {
    throw new Error(
      `ตรวจสอบคำขอซ้ำไม่สำเร็จ: ${error.message}`
    );
  }

  return (data || []) as PositionConflict[];
};

  const handleCreateRequest = async () => {
    if (!canCreateRequest) {
      setMessage('บัญชีนี้ไม่มีสิทธิ์เพิ่มคำขอหยุด');
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

    if (!requestStartDate || !requestEndDate) {
      setMessage('กรุณาเลือกจากวันที่และถึงวันที่');
      return;
    }

    if (requestEndDate < requestStartDate) {
      setMessage('ถึงวันที่ต้องไม่น้อยกว่าจากวันที่');
      return;
    }

    const dates = buildDateRange(requestStartDate, requestEndDate);

    if (dates.length === 0) {
      setMessage('ไม่พบช่วงวันที่ที่ต้องการขอหยุด');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const conflicts = await findPositionConflicts(dates);

      if (conflicts.length > 0) {
        const conflictDates = Array.from(
          new Set(conflicts.map((item) => item.request_date))
        )
          .sort()
          .map(formatThaiDate)
          .join(', ');

        setMessage(
          `ไม่สามารถบันทึกได้: ตำแหน่ง ${selectedStaff.position} มีผู้ขอหยุดแล้วในวันที่ ${conflictDates}`
        );
        setSaving(false);
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

    // ก่อนอนุมัติ ตรวจตำแหน่งซ้ำอีกครั้ง
    if (status === 'approved') {
      const requestStaff = staffMap.get(Number(request.staff_id));

      if (requestStaff?.position) {
        const samePositionStaffIds = staffList
          .filter(
            (staff) =>
              staff.position === requestStaff.position &&
              Number(staff.id) !== Number(request.staff_id)
          )
          .map((staff) => Number(staff.id));

        if (samePositionStaffIds.length > 0) {
          const { data: conflictData, error: conflictError } = await supabase
            .from('staff_requests')
            .select('id, staff_id, request_date, status')
            .eq('department_id', Number(selectedDept))
            .eq('request_type', 'OFF')
            .in('status', ['pending', 'approved'])
            .in('staff_id', samePositionStaffIds)
            .eq('request_date', request.request_date)
            .neq('id', requestId);

          if (conflictError) {
            setMessage(
              `ตรวจสอบก่อนอนุมัติไม่สำเร็จ: ${conflictError.message}`
            );
            return;
          }

          if ((conflictData || []).length > 0) {
            setMessage(
              `ไม่สามารถอนุมัติได้: ตำแหน่ง ${requestStaff.position} มีผู้ขอหยุดแล้วในวันที่ ${formatThaiDate(
                request.request_date
              )}`
            );
            return;
          }
        }
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">ขอหยุด</h1>

                <a
                  href="/dashboard/staffing/schedule"
                  className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  ← กลับหน้าตารางเวร
                </a>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                บันทึกและอนุมัติคำขอหยุดก่อนจัดตารางเวร กติกา: ในวันเดียวกัน ตำแหน่งเดียวกัน ขอหยุดได้ไม่เกิน 1 คนต่อหน่วยงาน
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
            <h2 className="font-bold text-slate-900 mb-4">เพิ่มคำขอหยุด</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
              <div className="xl:col-span-3">
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

              <div className="xl:col-span-2">
                <label className="text-xs font-bold text-slate-600">
                  จากวันที่
                </label>

                <input
                  type="date"
                  value={requestStartDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setRequestStartDate(nextStart);

                    if (requestEndDate && nextStart > requestEndDate) {
                      setRequestEndDate(nextStart);
                    }
                  }}
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="xl:col-span-2">
                <label className="text-xs font-bold text-slate-600">
                  ถึงวันที่
                </label>

                <input
                  type="date"
                  value={requestEndDate}
                  min={requestStartDate || undefined}
                  onChange={(e) => setRequestEndDate(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="xl:col-span-3">
                <label className="text-xs font-bold text-slate-600">
                  หมายเหตุ
                </label>

                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ไม่บังคับ"
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="xl:col-span-2">
                <button
                  onClick={handleCreateRequest}
                  disabled={
                    saving ||
                    !selectedStaffId ||
                    !requestStartDate ||
                    !requestEndDate
                  }
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกคำขอหยุด'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Requests list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">รายการคำขอหยุด</h2>
              <p className="text-xs text-slate-500 mt-1">
                ทั้งหมด {requests.length} รายการ
              </p>
            </div>

            {!canApproveRequest && (
              <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                เพิ่มคำขอได้ • รอหัวหน้าอนุมัติ
              </span>
            )}
          </div>

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
                  requests.map((request) => {
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
        </div>
      </div>
    </div>
  );
}
