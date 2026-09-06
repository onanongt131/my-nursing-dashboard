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

type RuleForm = {
  morningRn: number;
  eveningRn: number;
  nightRn: number;
  seniorPerShift: number;
  leaderPerShift: number;

  morningPn: number;
  eveningPn: number;
  nightPn: number;

  morningNa: number;
  eveningNa: number;
  nightNa: number;

  morningSupport: number;
  eveningSupport: number;
  nightSupport: number;
};

export default function StaffingRulesPage() {
  const supabase = createClient();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userGroup, setUserGroup] = useState<string | null>(null);

  const [form, setForm] = useState<RuleForm>({
    morningRn: 7,
    eveningRn: 6,
    nightRn: 5,
    seniorPerShift: 2,
    leaderPerShift: 2,

    morningPn: 0,
    eveningPn: 0,
    nightPn: 0,

    morningNa: 0,
    eveningNa: 0,
    nightNa: 0,

    morningSupport: 0,
    eveningSupport: 0,
    nightSupport: 0,
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

  useEffect(() => {
    if (!selectedDept) return;

    async function loadRules() {
      setLoading(true);
      setMessage('');

      const { data, error } = await supabase
        .from('scheduling_rules')
        .select('rule_code, value_json')
        .eq('department_id', Number(selectedDept))
        .eq('enabled', true)
        .in('rule_code', [
          'MIN_RN_MORNING',
          'MIN_RN_EVENING',
          'MIN_RN_NIGHT',
          'MIN_SENIOR_RN_PER_SHIFT',
          'SHIFT_LEADER_REQUIRED',

          'MIN_PN_MORNING',
          'MIN_PN_EVENING',
          'MIN_PN_NIGHT',

          'MIN_NA_MORNING',
          'MIN_NA_EVENING',
          'MIN_NA_NIGHT',

          'MIN_SUPPORT_MORNING',
          'MIN_SUPPORT_EVENING',
          'MIN_SUPPORT_NIGHT',
        ]);

      if (error) {
        console.error(error);
        setMessage('ไม่สามารถโหลดกติกาของหน่วยงานนี้ได้');
        setLoading(false);
        return;
      }

      type RuleValue = {
        min_staff?: number;
        min_count?: number;
        required?: boolean;
        levels?: string[];
        };

        const map = new Map<string, RuleValue>(
        (data || []).map((rule: any) => [
            rule.rule_code,
            (rule.value_json || {}) as RuleValue,
        ])
        );

      const getNumber = (
        ruleCode: string,
        key: 'min_staff' | 'min_count',
        fallback: number
      ) => {
        const raw = map.get(ruleCode)?.[key];
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
      };

      setForm({
        morningRn: getNumber('MIN_RN_MORNING', 'min_staff', 7),
        eveningRn: getNumber('MIN_RN_EVENING', 'min_staff', 6),
        nightRn: getNumber('MIN_RN_NIGHT', 'min_staff', 5),

        seniorPerShift: getNumber(
          'MIN_SENIOR_RN_PER_SHIFT',
          'min_count',
          2
        ),
        leaderPerShift: getNumber(
          'SHIFT_LEADER_REQUIRED',
          'min_count',
          2
        ),

        morningPn: getNumber('MIN_PN_MORNING', 'min_staff', 0),
        eveningPn: getNumber('MIN_PN_EVENING', 'min_staff', 0),
        nightPn: getNumber('MIN_PN_NIGHT', 'min_staff', 0),

        morningNa: getNumber('MIN_NA_MORNING', 'min_staff', 0),
        eveningNa: getNumber('MIN_NA_EVENING', 'min_staff', 0),
        nightNa: getNumber('MIN_NA_NIGHT', 'min_staff', 0),

        morningSupport: getNumber('MIN_SUPPORT_MORNING', 'min_staff', 0),
        eveningSupport: getNumber('MIN_SUPPORT_EVENING', 'min_staff', 0),
        nightSupport: getNumber('MIN_SUPPORT_NIGHT', 'min_staff', 0),
      });

      setLoading(false);
    }

    loadRules();
  }, [selectedDept, supabase]);

  const updateNumber = (
    field: keyof RuleForm,
    value: string
  ) => {
    if (!allowEdit) return;

    setForm((prev) => ({
      ...prev,
      [field]: Math.max(0, Number(value)),
    }));
  };

  const handleSave = async () => {
    if (!allowEdit) {
      setMessage('บัญชีนี้มีสิทธิ์ดูข้อมูลอย่างเดียว');
      return;
    }

    if (!selectedDept) return;

    setSaving(true);
    setMessage('');

    const departmentId = Number(selectedDept);

    const records = [
      {
        department_id: departmentId,
        rule_code: 'MIN_RN_MORNING',
        rule_name: 'จำนวน RN ขั้นต่ำเวรเช้า',
        rule_type: 'hard',
        enabled: true,
        value_json: {
          min_staff: form.morningRn,
        },
        description: `เวรเช้าต้องมี RN อย่างน้อย ${form.morningRn} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_RN_EVENING',
        rule_name: 'จำนวน RN ขั้นต่ำเวรบ่าย',
        rule_type: 'hard',
        enabled: true,
        value_json: {
          min_staff: form.eveningRn,
        },
        description: `เวรบ่ายต้องมี RN อย่างน้อย ${form.eveningRn} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_RN_NIGHT',
        rule_name: 'จำนวน RN ขั้นต่ำเวรดึก',
        rule_type: 'hard',
        enabled: true,
        value_json: {
          min_staff: form.nightRn,
        },
        description: `เวรดึกต้องมี RN อย่างน้อย ${form.nightRn} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_SENIOR_RN_PER_SHIFT',
        rule_name: 'Expert/Proficient ขั้นต่ำต่อเวร',
        rule_type: 'hard',
        enabled: true,
        value_json: {
          levels: ['Expert', 'Proficient'],
          min_count: form.seniorPerShift,
          apply_to: ['ช', 'บ', 'ด'],
        },
        description: `ทุกเวรต้องมี Expert หรือ Proficient อย่างน้อย ${form.seniorPerShift} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'SHIFT_LEADER_REQUIRED',
        rule_name: 'จำนวนหัวหน้าเวรขั้นต่ำ',
        rule_type: 'hard',
        enabled: true,
        value_json: {
          required: true,
          min_count: form.leaderPerShift,
        },
        description: `ทุกเวรต้องมี RN ที่สามารถเป็นหัวหน้าเวรได้อย่างน้อย ${form.leaderPerShift} คน`,
      },

      {
        department_id: departmentId,
        rule_code: 'MIN_PN_MORNING',
        rule_name: 'จำนวน PN ขั้นต่ำเวรเช้า',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.morningPn },
        description: `เวรเช้าต้องมี PN อย่างน้อย ${form.morningPn} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_PN_EVENING',
        rule_name: 'จำนวน PN ขั้นต่ำเวรบ่าย',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.eveningPn },
        description: `เวรบ่ายต้องมี PN อย่างน้อย ${form.eveningPn} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_PN_NIGHT',
        rule_name: 'จำนวน PN ขั้นต่ำเวรดึก',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.nightPn },
        description: `เวรดึกต้องมี PN อย่างน้อย ${form.nightPn} คน`,
      },

      {
        department_id: departmentId,
        rule_code: 'MIN_NA_MORNING',
        rule_name: 'จำนวน NA ขั้นต่ำเวรเช้า',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.morningNa },
        description: `เวรเช้าต้องมี NA อย่างน้อย ${form.morningNa} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_NA_EVENING',
        rule_name: 'จำนวน NA ขั้นต่ำเวรบ่าย',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.eveningNa },
        description: `เวรบ่ายต้องมี NA อย่างน้อย ${form.eveningNa} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_NA_NIGHT',
        rule_name: 'จำนวน NA ขั้นต่ำเวรดึก',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.nightNa },
        description: `เวรดึกต้องมี NA อย่างน้อย ${form.nightNa} คน`,
      },

      {
        department_id: departmentId,
        rule_code: 'MIN_SUPPORT_MORNING',
        rule_name: 'จำนวนพนักงานช่วยเหลือขั้นต่ำเวรเช้า',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.morningSupport },
        description: `เวรเช้าต้องมี พนง. อย่างน้อย ${form.morningSupport} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_SUPPORT_EVENING',
        rule_name: 'จำนวนพนักงานช่วยเหลือขั้นต่ำเวรบ่าย',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.eveningSupport },
        description: `เวรบ่ายต้องมี พนง. อย่างน้อย ${form.eveningSupport} คน`,
      },
      {
        department_id: departmentId,
        rule_code: 'MIN_SUPPORT_NIGHT',
        rule_name: 'จำนวนพนักงานช่วยเหลือขั้นต่ำเวรดึก',
        rule_type: 'hard',
        enabled: true,
        value_json: { min_staff: form.nightSupport },
        description: `เวรดึกต้องมี พนง. อย่างน้อย ${form.nightSupport} คน`,
      },
    ];

    const { error } = await supabase
      .from('scheduling_rules')
      .upsert(records, {
        onConflict: 'department_id,rule_code',
      });

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
      return;
    }

    setMessage('บันทึกกติกาตารางเวรเรียบร้อยแล้ว');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-3 md:px-4 pb-6">
      <div className="max-w-[1500px] mx-auto space-y-3">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                  ตั้งค่ากติกาตารางเวร
                </h1>

                <a
                href="/dashboard/staffing/schedule"
                className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                ← กลับหน้าตารางเวร
                </a>
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดอัตรากำลังขั้นต่ำและ Skill Mix แยกตามหน่วยงาน
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
                <option key={dept.id} value={dept.id}>
                  {dept.Department}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
              message.includes('เรียบร้อย')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <div className="grid grid-rows-[auto_1fr] gap-3 h-full">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-bold text-[15px] text-slate-900">
              จำนวน RN ขั้นต่ำต่อเวร
            </h2>

            <p className="text-[11px] text-slate-500 mt-1">
              ระบบตรวจตารางเวรจะใช้ค่าของหน่วยงานที่เลือกโดยอัตโนมัติ
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              กำลังโหลดกติกา...
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">

              <RuleNumberCard
                title="เวรเช้า"
                code="ช"
                value={form.morningRn}
                onChange={(v) => updateNumber('morningRn', v)}
                disabled={!allowEdit}
              />

              <RuleNumberCard
                title="เวรบ่าย"
                code="บ"
                value={form.eveningRn}
                onChange={(v) => updateNumber('eveningRn', v)}
                disabled={!allowEdit}
              />

              <RuleNumberCard
                title="เวรดึก"
                code="ด"
                value={form.nightRn}
                onChange={(v) => updateNumber('nightRn', v)}
                disabled={!allowEdit}
              />
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-bold text-[15px] text-slate-900">
              Skill Mix และหัวหน้าเวร
            </h2>
          </div>

          <div className="p-4 grid grid-cols-1 gap-3">

            <RuleNumberCard
              title="Expert / Proficient"
              description="จำนวนขั้นต่ำต่อทุกเวร"
              value={form.seniorPerShift}
              onChange={(v) => updateNumber('seniorPerShift', v)}
              disabled={!allowEdit}
            />

            <RuleNumberCard
              title="หัวหน้าเวร"
              description="RN ที่ can_be_shift_leader = true"
              value={form.leaderPerShift}
              onChange={(v) => updateNumber('leaderPerShift', v)}
              disabled={!allowEdit}
            />

          </div>
        </div>
          </div>

          <div className="grid grid-rows-[auto_1fr] gap-3 h-full">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-bold text-[15px] text-slate-900">
              บุคลากรสนับสนุนขั้นต่ำต่อเวร
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              กำหนดจำนวน PN / NA / พนง. ขั้นต่ำแยกตามเวร ถ้าไม่ต้องการบังคับตำแหน่งนั้นให้ตั้งเป็น 0
            </p>
          </div>

          <div className="p-3.5 space-y-3.5">
            <div>
              <div className="text-[13px] font-extrabold text-slate-800 mb-2">PN</div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                <RuleNumberCard title="เวรเช้า" code="ช" value={form.morningPn} onChange={(v) => updateNumber('morningPn', v)} disabled={!allowEdit} />
                <RuleNumberCard title="เวรบ่าย" code="บ" value={form.eveningPn} onChange={(v) => updateNumber('eveningPn', v)} disabled={!allowEdit} />
                <RuleNumberCard title="เวรดึก" code="ด" value={form.nightPn} onChange={(v) => updateNumber('nightPn', v)} disabled={!allowEdit} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3.5">
              <div className="text-[13px] font-extrabold text-slate-800 mb-2">NA</div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                <RuleNumberCard title="เวรเช้า" code="ช" value={form.morningNa} onChange={(v) => updateNumber('morningNa', v)} disabled={!allowEdit} />
                <RuleNumberCard title="เวรบ่าย" code="บ" value={form.eveningNa} onChange={(v) => updateNumber('eveningNa', v)} disabled={!allowEdit} />
                <RuleNumberCard title="เวรดึก" code="ด" value={form.nightNa} onChange={(v) => updateNumber('nightNa', v)} disabled={!allowEdit} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3.5">
              <div className="text-[13px] font-extrabold text-slate-800 mb-2">พนง.</div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                <RuleNumberCard title="เวรเช้า" code="ช" value={form.morningSupport} onChange={(v) => updateNumber('morningSupport', v)} disabled={!allowEdit} />
                <RuleNumberCard title="เวรบ่าย" code="บ" value={form.eveningSupport} onChange={(v) => updateNumber('eveningSupport', v)} disabled={!allowEdit} />
                <RuleNumberCard title="เวรดึก" code="ด" value={form.nightSupport} onChange={(v) => updateNumber('nightSupport', v)} disabled={!allowEdit} />
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading || !allowEdit}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50"
          >
            {!allowEdit ? 'ดูอย่างเดียว' : saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>

      </div>
    </div>
  );
}

function RuleNumberCard({
  title,
  code,
  description,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  code?: string;
  description?: string;
  value: number;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/70 px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="font-bold text-[13px] leading-tight text-slate-800">
            {title}
            {code && (
              <span className="ml-1.5 text-emerald-700">
                ({code})
              </span>
            )}
          </div>

          {description && (
            <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              {description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min={0}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-[64px] h-9 text-center border border-slate-300 rounded-lg px-2 font-extrabold text-[16px] bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />

          <span className="text-[10px] text-slate-500">
            คน
          </span>
        </div>
      </div>
    </div>
  );
}
