'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sarabun } from 'next/font/google';
import { createClient } from '@/utils/supabase/client';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

type Holiday = {
  id: number;
  holiday_date: string;
  holiday_name: string;
  department_id: number | null;
  active: boolean;
  created_at: string | null;
};

type UserProfile = {
  id: number | string;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

const initialDate = new Date().toISOString().slice(0, 10);

function formatThaiDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
}

export default function StaffingHolidaysPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear())
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [holidayDate, setHolidayDate] = useState(initialDate);
  const [holidayName, setHolidayName] = useState('');
  const [active, setActive] = useState(true);

  const isAdmin = profile?.role === 'admin';

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const resetForm = (yearValue = filterYear) => {
    setEditingId(null);
    setHolidayDate(`${yearValue}-01-01`);
    setHolidayName('');
    setActive(true);
  };

  useEffect(() => {
    async function loadProfile() {
      setCheckingAccess(true);
      try {
        const response = await fetch('/api/session-user', { cache: 'no-store' });
        if (!response.ok) throw new Error('ไม่พบข้อมูลผู้เข้าสู่ระบบ');

        const result = await response.json();
        const email = result?.user?.email;
        if (!email) throw new Error('ไม่พบอีเมลผู้เข้าสู่ระบบ');

        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('email', email)
          .single();

        if (error) throw error;
        setProfile(data as UserProfile);
      } catch (error) {
        setProfile(null);
        showMessage(getErrorMessage(error), 'error');
      } finally {
        setCheckingAccess(false);
      }
    }

    loadProfile();
  }, [supabase]);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    const startDate = `${filterYear}-01-01`;
    const endDate = `${filterYear}-12-31`;

    const { data, error } = await supabase
      .from('staffing_holidays')
      .select(
        'id, holiday_date, holiday_name, department_id, active, created_at'
      )
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date', { ascending: true });

    if (error) {
      setHolidays([]);
      showMessage(`โหลดวันหยุดไม่สำเร็จ: ${error.message}`, 'error');
    } else {
      setHolidays((data || []) as Holiday[]);
    }
    setLoading(false);
  }, [filterYear, supabase]);

  useEffect(() => {
    if (!checkingAccess && profile) loadHolidays();
  }, [checkingAccess, loadHolidays, profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      showMessage('เฉพาะ Admin เท่านั้นที่สามารถจัดการวันหยุดได้', 'error');
      return;
    }
    if (!holidayDate || !holidayName.trim()) {
      showMessage('กรุณาระบุวันที่และชื่อวันหยุด', 'error');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      if (editingId !== null) {
        const { error } = await supabase
          .from('staffing_holidays')
          .update({
            holiday_date: holidayDate,
            holiday_name: holidayName.trim(),
            department_id: null,
            active,
          })
          .eq('id', editingId);
        if (error) throw error;
        showMessage('แก้ไขวันหยุดเรียบร้อยแล้ว', 'success');
      } else {
        const { error } = await supabase.from('staffing_holidays').insert({
          holiday_date: holidayDate,
          holiday_name: holidayName.trim(),
          department_id: null,
          active,
        });
        if (error) {
          if (error.code === '23505') {
            throw new Error('วันที่นี้มีรายการวันหยุดอยู่แล้ว');
          }
          throw error;
        }
        showMessage('เพิ่มวันหยุดส่วนกลางเรียบร้อยแล้ว', 'success');
      }

      const savedYear = holidayDate.slice(0, 4);
      resetForm(savedYear);

      if (savedYear === filterYear) {
        await loadHolidays();
      } else {
        // useEffect จะโหลดข้อมูลใหม่หลังเปลี่ยนปี
        setFilterYear(savedYear);
      }
    } catch (error) {
      showMessage(`บันทึกไม่สำเร็จ: ${getErrorMessage(error)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingId(holiday.id);
    setHolidayDate(holiday.holiday_date);
    setHolidayName(holiday.holiday_name);
    setActive(holiday.active);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (holiday: Holiday) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from('staffing_holidays')
      .update({ active: !holiday.active })
      .eq('id', holiday.id);

    if (error) {
      showMessage(`ปรับสถานะไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }
    showMessage('ปรับสถานะเรียบร้อยแล้ว', 'success');
    await loadHolidays();
  };

  const handleDelete = async (holiday: Holiday) => {
    if (!isAdmin) return;
    if (!window.confirm(`ยืนยันลบ “${holiday.holiday_name}” หรือไม่?`)) return;

    const { error } = await supabase
      .from('staffing_holidays')
      .delete()
      .eq('id', holiday.id);

    if (error) {
      showMessage(`ลบไม่สำเร็จ: ${error.message}`, 'error');
      return;
    }
    showMessage('ลบวันหยุดเรียบร้อยแล้ว', 'success');
    if (editingId === holiday.id) resetForm();
    await loadHolidays();
  };

  if (checkingAccess) {
    return <div className={`${sarabun.className} p-8`}>กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!profile) {
    return (
      <div className={`${sarabun.className} p-8 text-rose-700`}>
        ไม่สามารถตรวจสอบบัญชีผู้ใช้ได้
      </div>
    );
  }

  return (
    <main className={`${sarabun.className} min-h-screen bg-slate-50 p-4 md:p-7`}>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900">
                จัดการวันหยุดส่วนกลาง
              </h1>
              <Link
                href="/dashboard/staffing/schedule"
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                ← กลับตารางเวร
              </Link>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              วันหยุดที่เพิ่มในหน้านี้ใช้ร่วมกันทุกหน่วยงานในโรงพยาบาล
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
            {profile.full_name || profile.email} · {profile.role}
          </div>
        </header>

        {!isAdmin && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            บัญชีนี้ดูรายการได้อย่างเดียว เฉพาะ Admin เท่านั้นที่เพิ่ม แก้ไข หรือลบวันหยุดได้
          </div>
        )}

        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              messageType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {editingId === null ? 'เพิ่มวันหยุด' : 'แก้ไขวันหยุด'}
          </h2>
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
            <label className="md:col-span-3">
              <span className="text-xs font-bold text-slate-600">วันที่</span>
              <input
                type="date"
                value={holidayDate}
                disabled={!isAdmin || saving}
                onChange={(event) => setHolidayDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="md:col-span-5">
              <span className="text-xs font-bold text-slate-600">ชื่อวันหยุด</span>
              <input
                type="text"
                value={holidayName}
                disabled={!isAdmin || saving}
                onChange={(event) => setHolidayName(event.target.value)}
                placeholder="เช่น วันปิยมหาราช"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <label className="flex items-center gap-2 pb-2 md:col-span-2">
              <input
                type="checkbox"
                checked={active}
                disabled={!isAdmin || saving}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-700"
              />
              <span className="text-sm font-semibold text-slate-700">เปิดใช้งาน</span>
            </label>

            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={!isAdmin || saving}
                className="flex-1 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving ? 'กำลังบันทึก...' : editingId === null ? 'เพิ่ม' : 'บันทึก'}
              </button>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-900">รายการวันหยุด</h2>
              <p className="text-xs text-slate-500">ทั้งหมด {holidays.length} รายการ</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              ปี ค.ศ.
              <input
                type="number"
                min="2020"
                max="2100"
                value={filterYear}
                onChange={(event) => setFilterYear(event.target.value)}
                className="w-24 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs font-bold text-slate-600">
                <tr>
                  <th className="px-5 py-3">วันที่</th>
                  <th className="px-5 py-3">ชื่อวันหยุด</th>
                  <th className="px-5 py-3 text-center">สถานะ</th>
                  <th className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : holidays.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-400">ยังไม่มีวันหยุดในปีนี้</td></tr>
                ) : (
                  holidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                        {formatThaiDate(holiday.holiday_date)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{holiday.holiday_name}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => handleToggleActive(holiday)}
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            holiday.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-500'
                          } disabled:cursor-default`}
                        >
                          {holiday.active ? 'เปิดใช้' : 'ปิดใช้'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => handleEdit(holiday)}
                          className="mr-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 disabled:opacity-40"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => handleDelete(holiday)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-40"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
