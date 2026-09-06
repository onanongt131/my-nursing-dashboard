'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  getVisibleDepartments,
  canSelectDepartment,
  canEditStaffing,
  type UserProfile,
} from '@/lib/permissions/staffingAccess';

type Department = {
  id: number;
  Department: string;
  group?: string | null;
};

type StaffForm = {
  full_name: string;
  position: string;
  competency_level: string;
  can_be_shift_leader: boolean;
  active: boolean;
};

export default function StaffingStaffPage() {
  const supabase = createClient();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | string>('');

  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userGroup, setUserGroup] = useState<string | null>(null);

  const [form, setForm] = useState<StaffForm>({
    full_name: '',
    position: 'RN',
    competency_level: 'Competent',
    can_be_shift_leader: false,
    active: true,
  });

  // อ่านผู้ใช้ที่ login จาก NextAuth session API
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
  const allowEdit = canEditStaffing(userProfile?.role);

  const loadStaff = async () => {
    if (!selectedDept) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('staff')
      .select(`
        id,
        full_name,
        position,
        department_id,
        active,
        competency_level,
        can_be_shift_leader
      `)
      .eq('department_id', Number(selectedDept))
      .order('id');

    if (error) {
      console.error(error);
      setMessage(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`);
    } else {
      setStaffList(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, [selectedDept]);

  const resetForm = () => {
    setEditingId(null);

    setForm({
      full_name: '',
      position: 'RN',
      competency_level: 'Competent',
      can_be_shift_leader: false,
      active: true,
    });
  };

  const handleSave = async () => {
    if (!allowEdit) {
      setMessage('บัญชีนี้มีสิทธิ์ดูข้อมูลอย่างเดียว');
      return;
    }

    if (!selectedDept) return;

    if (!form.full_name.trim()) {
      setMessage('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      full_name: form.full_name.trim(),
      position: form.position,
      department_id: Number(selectedDept),
      competency_level:
        form.position === 'RN'
            ? form.competency_level
            : null,

        can_be_shift_leader:
        form.position === 'RN'
            ? form.can_be_shift_leader
            : false,
      active: form.active,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from('staff')
        .update(payload)
        .eq('id', editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from('staff')
        .insert(payload);

      error = result.error;
    }

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
      return;
    }

    setMessage(
      editingId
        ? 'แก้ไขข้อมูลบุคลากรเรียบร้อยแล้ว'
        : 'เพิ่มบุคลากรเรียบร้อยแล้ว'
    );

    resetForm();
    await loadStaff();
  };

  const handleEdit = (staff: any) => {
    if (!allowEdit) return;

    setEditingId(staff.id);

    setForm({
      full_name: staff.full_name || '',
      position: staff.position || 'RN',
      competency_level: staff.competency_level || 'Competent',
      can_be_shift_leader: staff.can_be_shift_leader === true,
      active: staff.active !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8">
      <div className="max-w-6xl mx-auto space-y-4">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">
                  จัดการบุคลากร
                </h1>

                <a
                  href="/dashboard/staffing/schedule"
                  className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  ← กลับหน้าตารางเวร
                </a>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                เพิ่มและแก้ไขข้อมูลบุคลากรสำหรับการจัดตารางเวร
              </p>

              {userProfile && !allowEdit && (
                <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                  โหมดดูอย่างเดียว ({userProfile.role || 'user'})
                </p>
              )}
            </div>

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
                <option
                  key={dept.id}
                  value={dept.id}
                >
                  {dept.Department}
                </option>
              ))}
            </select>

          </div>
        </div>

        {message && (
          <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold">
            {message}
          </div>
        )}

        {allowEdit && (
          <>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4">
              {editingId ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากร'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <div>
                <label className="text-xs font-bold text-slate-600">
                  ชื่อ-นามสกุล
                </label>

                <input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2"
                  placeholder="กรอกชื่อ-นามสกุล"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  ตำแหน่ง
                </label>

                <select
                  value={form.position}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      position: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="RN">RN</option>
                  <option value="PN">PN</option>
                  <option value="NA">NA</option>
                  <option value="HW">HW</option>
                  <option value="พนง">พนง</option>
                </select>
              </div>

              {form.position === 'RN' && (
                  <>
                      <div>
                      <label className="text-xs font-bold text-slate-600">
                          Competency Level
                      </label>

                      <select
                          value={form.competency_level}
                          onChange={(e) =>
                          setForm({
                              ...form,
                              competency_level: e.target.value,
                          })
                          }
                          className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                      >
                          <option value="Novice">Novice</option>
                          <option value="Advanced Beginner">Advanced Beginner</option>
                          <option value="Competent">Competent</option>
                          <option value="Proficient">Proficient</option>
                          <option value="Expert">Expert</option>
                      </select>
                      </div>

                      <label className="flex items-center gap-3 border border-slate-200 rounded-xl p-3">
                      <input
                          type="checkbox"
                          checked={form.can_be_shift_leader}
                          onChange={(e) =>
                          setForm({
                              ...form,
                              can_be_shift_leader: e.target.checked,
                          })
                          }
                      />

                      <span className="text-sm font-semibold">
                          สามารถเป็นหัวหน้าเวร
                      </span>
                      </label>
                  </>
                  )}

              <label className="flex items-center gap-3 border border-slate-200 rounded-xl p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      active: e.target.checked,
                    })
                  }
                />

                <span className="text-sm font-semibold">
                  Active
                </span>
              </label>

            </div>

            <div className="flex justify-end gap-2 mt-5">

              {editingId && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                >
                  ยกเลิก
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {saving
                  ? 'กำลังบันทึก...'
                  : editingId
                  ? 'บันทึกการแก้ไข'
                  : 'เพิ่มบุคลากร'}
              </button>

            </div>
          </div>

          </>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                รายชื่อบุคลากร
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ทั้งหมด {staffList.length} คน
              </p>
            </div>

            {!allowEdit && userProfile && (
              <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                ดูอย่างเดียว
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="px-4 py-3">
                    ตำแหน่ง
                  </th>
                  <th className="px-4 py-3">
                    Competency
                  </th>
                  <th className="px-4 py-3">
                    หัวหน้าเวร
                  </th>
                  <th className="px-4 py-3">
                    สถานะ
                  </th>
                  {allowEdit && (
                    <th className="px-4 py-3">
                      จัดการ
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={allowEdit ? 6 : 5}
                      className="text-center py-8"
                    >
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {staff.full_name}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {staff.position}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {staff.competency_level || '-'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {staff.can_be_shift_leader
                          ? '✓'
                          : '-'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {staff.active
                          ? 'ใช้งาน'
                          : 'ไม่ใช้งาน'}
                      </td>

                      {allowEdit && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleEdit(staff)}
                            className="text-blue-700 font-bold hover:underline"
                          >
                            แก้ไข
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
}