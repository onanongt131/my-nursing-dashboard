'use client';

import { useEffect, useState } from 'react';
import FiscalMonthSelect, { monthLabel } from '@/components/FiscalMonthSelect';

type Kind = 'fall' | 'pressure' | 'readmit';
type Case = Record<string, any> & { id: number | string; status: string; date: string; department: string };
type Issue = { key: string; label: string; value: (c: Case) => string | null };

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const SEVERE = ['E', 'F', 'G', 'H', 'I'];

const CONFIG: Record<Kind, { title: string; summary: (c: Case) => string | null; extra: (c: Case) => (string | null)[]; issues: Issue[]; note?: (c: Case) => string | null; noteLabel?: string }> = {
  fall: {
    title: 'สรุปประเด็นรายกรณี · พลัดตกหกล้ม',
    summary: (c) => text(c.description),
    extra: (c) => [c.severity ? `ระดับ ${c.severity}` : null, text(c.shift)],
    issues: [
      { key: 'p', label: 'ผู้ป่วย', value: (c) => text(c.cause_patient) },
      { key: 's', label: 'บุคลากร', value: (c) => text(c.cause_personnel) },
      { key: 'e', label: 'สิ่งแวดล้อม', value: (c) => text(c.cause_environment) },
      { key: 'y', label: 'ระบบ', value: (c) => text(c.cause_system) },
    ],
    note: (c) => text(c.review_and_solution),
    noteLabel: 'การทบทวน / แนวทางแก้ไข',
  },
  pressure: {
    title: 'สรุปประเด็นรายกรณี · แผลกดทับระดับ 2–4',
    summary: (c) => [text(c.diagnosis), text(c.wound_site) && `ตำแหน่งแผล ${c.wound_site}`].filter(Boolean).join(' · ') || null,
    extra: (c) => [c.age != null ? `อายุ ${c.age} ปี` : null, c.admission_bs != null || c.found_bs != null ? `Braden แรกรับ ${c.admission_bs ?? '—'} → พบแผล ${c.found_bs ?? '—'}` : null],
    issues: [
      { key: '2', label: 'ระดับ 2', value: (c) => (String(c.wound_level) === '2' ? 'ระดับ 2' : null) },
      { key: '3', label: 'ระดับ 3', value: (c) => (String(c.wound_level) === '3' ? 'ระดับ 3' : null) },
      { key: '4', label: 'ระดับ 4', value: (c) => (String(c.wound_level) === '4' ? 'ระดับ 4' : null) },
      { key: 'h', label: 'หาย', value: (c) => (c.wound_outcome === 'หาย' ? 'หาย' : null) },
      { key: 't', label: 'ย้าย / จำหน่าย', value: (c) => text(c.discharge_status) },
    ],
  },
  readmit: {
    title: 'สรุปประเด็นรายกรณี · Re-admit',
    summary: (c) => [text(c.admit_diagnosis) && `Admit: ${c.admit_diagnosis}`, text(c.discharge_diagnosis) && `จำหน่ายครั้งก่อน: ${c.discharge_diagnosis}`].filter(Boolean).join(' · ') || null,
    extra: (c) => [c.age != null ? `อายุ ${c.age} ปี` : null, c.previous_discharge_date ? `จำหน่าย ${c.previous_discharge_date}` : null, text(c.discharge_ward)],
    issues: [
      { key: 'p', label: 'ผู้ป่วย', value: (c) => text(c.cause_patient) },
      { key: 'd', label: 'การวางแผนจำหน่าย', value: (c) => text(c.cause_discharge_planning) },
      { key: 'c', label: 'ภาวะโรค', value: (c) => text(c.cause_disease_condition) },
    ],
  },
};

export default function CaseIssueTable({ kind, year, severeOnly = false, includePending = true }: { kind: Kind; year: number; severeOnly?: boolean; includePending?: boolean }) {
  const cfg = CONFIG[kind];
  const [state, setState] = useState<{ key: string; items: Case[]; error?: string } | null>(null);
  const [month, setMonth] = useState(0); // 0 = ทั้งปี
  const key = `${kind}:${year}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/safety-cases?kind=${kind}&year=${year}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'โหลดรายกรณีไม่สำเร็จ'); setState({ key, items: d.items || [] }); })
      .catch((e) => { if (!controller.signal.aborted) setState({ key, items: [], error: e.message }); });
    return () => controller.abort();
  }, [kind, year, key]);
  useEffect(() => setMonth(0), [year]);

  const current = state?.key === key ? state : null;
  const cases = (current?.items ?? []).filter((c) => (!month || Number(String(c.date).slice(5, 7)) === month) && (includePending || c.status === 'approved') && (kind !== 'pressure' || ['2', '3', '4'].includes(String(c.wound_level))) && (!severeOnly || SEVERE.includes(String(c.severity || '').toUpperCase())));
  const counts = cfg.issues.map((i) => cases.filter((c) => i.value(c)).length);
  // รายละเอียดสาเหตุแสดงใต้ ✓ (ยกเว้น Pressure sore ที่ค่าเป็นแค่ระดับ/ผลลัพธ์)
  const detailUnderCheck = kind !== 'pressure';

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800">{cfg.title}{severeOnly && ' (ระดับ E ขึ้นไป)'} <span className="font-normal text-slate-400">({cases.length} ราย)</span></h3>
          <FiscalMonthSelect value={month} onChange={setMonth} year={year} />
        </div>
        <p className="text-xs text-slate-500">สรุปจากผลที่บันทึก{includePending ? ' รวมรายการรออนุมัติ' : 'ที่อนุมัติแล้ว'} ตามสิทธิ์{detailUnderCheck ? ' · รายละเอียดสาเหตุแสดงใต้เครื่องหมาย ✓' : ''}</p>
      </div>
      {!current ? <p className="p-6 text-sm text-slate-500">กำลังโหลดรายกรณี…</p>
        : current.error ? <p role="alert" className="p-4 text-sm text-red-700">{current.error}</p>
        : !cases.length ? <p className="p-6 text-sm text-slate-500">ไม่มีรายกรณี{month ? `ในเดือน${monthLabel(month, year)}` : `ในปีงบประมาณ ${year}`}</p>
        : <div className="max-h-[70vh] overflow-auto">
          <table className={`w-full border-collapse text-sm ${detailUnderCheck ? 'min-w-[1200px]' : 'min-w-[860px]'}`}>
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-600">
              <tr>
                <th rowSpan={2} className="w-40 min-w-[150px] border border-slate-200 px-3 py-2 text-center">เคส</th>
                <th rowSpan={2} className="min-w-[340px] border border-slate-200 px-3 py-2 text-center">สรุปอาการและเหตุการณ์สำคัญ</th>
                <th colSpan={cfg.issues.length} className="border border-slate-200 px-3 py-2 text-center">ประเด็นที่พบ</th>
                {cfg.note && <th rowSpan={2} className="min-w-[220px] border border-slate-200 px-3 py-2 text-center">{cfg.noteLabel}</th>}
              </tr>
              <tr>{cfg.issues.map((i, k) => <th key={i.key} className={`${detailUnderCheck ? 'min-w-[140px]' : 'w-24'} border border-slate-200 px-2 py-2 text-center font-semibold`}>{i.label}<span className="block text-[10px] font-normal text-slate-400">{counts[k]} ราย</span></th>)}</tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const id = String(c.id), summary = cfg.summary(c), note = cfg.note?.(c), extra = cfg.extra(c).filter(Boolean);
                return (
                  <tr key={id} className="align-top">
                    <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{c.department}</div>
                      <div>{c.date}</div>
                      <div className="whitespace-nowrap text-slate-500">HN {c.hn || '—'}</div>
                      {c.an && <div className="whitespace-nowrap text-slate-500">AN {c.an}</div>}
                      {extra.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{extra.map((x) => <span key={x} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{x}</span>)}</div>}
                      {c.status === 'pending' && <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">รออนุมัติ</span>}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-700">
                      <p className="whitespace-pre-line">{summary || <span className="text-slate-400">ไม่ได้บันทึกรายละเอียด</span>}</p>
                    </td>
                    {cfg.issues.map((i) => { const v = i.value(c); return <td key={i.key} className="border border-slate-200 px-2 py-2 text-center">{v ? <>
                      <span title={detailUnderCheck ? undefined : v} className="text-base font-bold text-teal-600">✓</span>
                      {detailUnderCheck && <p className="mt-1 whitespace-pre-line text-left text-xs text-slate-600">{v}</p>}
                    </> : <span className="text-slate-300">—</span>}</td>; })}
                    {cfg.note && <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600"><p className="whitespace-pre-line">{note || <span className="text-slate-300">—</span>}</p></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
    </section>
  );
}
