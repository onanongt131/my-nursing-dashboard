'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardDocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DIALYSIS_MAX_SCORE, dialysisAuditGroups, dialysisAuditItems } from '@/lib/dialysisAuditCriteria';

type ScoreValue = '' | '1' | '2' | '3' | '4' | 'NA';
type Props = { isOpen: boolean; onClose: () => void; departmentName?: string; departmentId: number | string; onSuccess?: () => void };

export default function DialysisAuditChartModal({ isOpen, onClose, departmentName = 'ไตเทียม', departmentId, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [an, setAn] = useState('');
  const [disease, setDisease] = useState('');
  const [auditor, setAuditor] = useState('');
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<Record<string, ScoreValue>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [draftId, setDraftId] = useState('');

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  const stats = useMemo(() => {
    const scored = dialysisAuditItems.filter(item => /^[1-4]$/.test(answers[item.id] || ''));
    const na = dialysisAuditItems.filter(item => answers[item.id] === 'NA').length;
    const answered = scored.length + na;
    const obtained = scored.reduce((sum, item) => sum + Number(answers[item.id]), 0);
    const applicableMax = scored.length * 4;
    return { answered, na, obtained, applicableMax, percent: applicableMax ? obtained / applicableMax * 100 : null };
  }, [answers]);

  async function saveDraft() {
    if (saving) return;
    setSaveMessage('');
    const department = Number(departmentId);
    if (!Number.isSafeInteger(department) || department <= 0) { setSaveMessage('รหัสหน่วยงานไม่ถูกต้อง'); return; }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !an.trim() || !auditor.trim()) { setSaveMessage('กรุณากรอกเดือน AN และผู้ตรวจประเมิน'); return; }
    for (const item of dialysisAuditItems) {
      const v = answers[item.id];
      if (v && v !== 'NA' && Number(v) < 4 && !itemNotes[item.id]?.trim()) { setSaveMessage(`ระบุข้อบกพร่อง ${item.id}`); return; }
    }
    const body = { department_id: department, form_type: 'dialysis', form_version: 'dialysis-1.0-draft', audit_date: `${month}-01`, reference_number: an.trim(), auditor_name: auditor.trim(),
      notes: `[DIALYSIS_DISEASE] ${disease.replace(/[\r\n]/g,' ').trim()}\n${notes}`.trim(),
      answers: Object.fromEntries(Object.entries(answers).filter(([,v]) => v !== '').map(([id,v]) => [id, v === 'NA' ? {na:true} : {score:Number(v),note:itemNotes[id] || ''}])) };
    setSaving(true);
    try {
      const res = await fetch(draftId ? `/api/audits/${encodeURIComponent(draftId)}` : '/api/audits', {method:draftId?'PATCH':'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(body)});
      const json = await res.json().catch(()=>null);
      if (!res.ok) { setSaveMessage(json?.error || `บันทึกไม่สำเร็จ (${res.status})`); return; }
      setDraftId(json.item.id);setSaveMessage('บันทึกร่างใน Supabase สำเร็จ (ยังไม่อนุมัติ)');onSuccess?.();
    } catch { setSaveMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์'); } finally { setSaving(false); }
  }

  if (!mounted || !isOpen) return null;

  const reset = () => {
    if (!window.confirm('ล้างข้อมูลในฟอร์มทดลองทั้งหมด?')) return;
    setAn(''); setDisease(''); setAuditor(''); setNotes(''); setAnswers({}); setItemNotes({}); setPreview(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-[2px] sm:p-4" role="dialog" aria-modal="true" aria-label="Audit Chart ไตเทียม">
      <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-emerald-900">
            <ClipboardDocumentCheckIcon className="h-6 w-6 shrink-0 text-emerald-700" />
            <div><h2 className="text-base font-bold sm:text-lg">บันทึกผล Audit Chart ({departmentName})</h2><p className="text-xs text-slate-500">แบบประเมินไตเทียม · บันทึกร่าง (ยังไม่ใช่คะแนนทางการ)</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
        </header>
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-slate-700">ประจำเดือน (Month)<input type="month" value={month} onChange={e => setMonth(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-700">AN ผู้ป่วย<input value={an} onChange={e => setAn(e.target.value)} placeholder="เลข AN" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-700">โรค<input value={disease} onChange={e => setDisease(e.target.value)} placeholder="ระบุโรค" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:gap-3">
            <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-slate-500">ข้อประเมิน</p><p className="text-lg font-bold text-slate-900">{dialysisAuditItems.length}</p></div>
            <div className="rounded-xl bg-emerald-50 px-2 py-2"><p className="text-emerald-700">กรอกแล้ว</p><p className="text-lg font-bold text-emerald-900">{stats.answered}</p></div>
            <div className="rounded-xl bg-violet-50 px-2 py-2"><p className="text-violet-700">คะแนนที่กรอก</p><p className="text-lg font-bold text-violet-900">{stats.obtained}/{stats.applicableMax}</p></div>
          </div>
          <p className="text-xs text-slate-500">คะแนนเต็มตามเอกสาร {DIALYSIS_MAX_SCORE} คะแนน • ข้อที่เลือก NA ไม่นับในตัวหาร • อัตราร้อยละเฉพาะข้อที่กรอก {stats.percent === null ? '—' : `${stats.percent.toFixed(1)}%`} • ยังไม่ใช่คะแนนรวมทางการ</p>
          {dialysisAuditGroups.map(group => (
            <section key={group.title} className="space-y-3">
              <h3 className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">{group.title}</h3>
              {group.subgroups.map(subgroup => (
                <div key={subgroup.title} className="space-y-2 border-l-2 border-emerald-200 pl-2 sm:pl-3">
                  <h4 className="text-sm font-bold text-emerald-900">{subgroup.title}</h4>
                  {subgroup.items.map(item => {
                    const score = answers[item.id] ?? '';
                    return <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-3"><label htmlFor={item.id} className="min-w-0 flex-1 text-xs leading-relaxed text-slate-800">{item.label}</label>
                        <select id={item.id} aria-label={`คะแนน ${item.label}`} value={score} onChange={e => setAnswers(prev => ({ ...prev, [item.id]: e.target.value as ScoreValue }))} className="w-20 shrink-0 rounded-md border border-slate-300 bg-white px-1 py-1.5 text-center text-xs font-semibold"><option value="">—</option>{(['1','2','3','4','NA'] as const).map(value => <option key={value} value={value}>{value}</option>)}</select>
                      </div>
                      {score !== '' && score !== 'NA' && Number(score) < 4 && <textarea rows={1} value={itemNotes[item.id] || ''} onChange={e => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))} placeholder="หมายเหตุข้อบกพร่อง (คะแนนต่ำกว่า 4)" className="mt-2 block w-full resize-y rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs" />}
                    </div>;
                  })}
                </div>
              ))}
            </section>
          ))}
          <label className="block text-xs font-semibold text-slate-700">หมายเหตุ / ข้อเสนอแนะเพิ่มเติม<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full resize-y rounded-lg border border-slate-300 p-2 text-sm" /></label>
          {saveMessage && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{saveMessage}</p>}
          {preview && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">ตรวจสอบแบบฟอร์ม: {stats.answered}/{dialysisAuditItems.length} ข้อ, NA {stats.na} ข้อ, คะแนนที่กรอก {stats.obtained}/{stats.applicableMax} — ไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์</div>}
        </main>
        <footer className="flex shrink-0 flex-col gap-3 border-t bg-white px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <label className="block w-full text-xs font-semibold text-emerald-900 sm:max-w-sm">พยาบาลผู้ตรวจประเมิน (Auditor)<input value={auditor} onChange={e => setAuditor(e.target.value)} placeholder="ใส่ชื่อพยาบาล" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600">ล้าง</button><button type="button" onClick={onClose} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">ปิด</button><button type="button" onClick={saveDraft} disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "กำลังบันทึก..." : "บันทึกร่าง"}</button></div>
        </footer>
      </div>
    </div>, document.body
  );
}
