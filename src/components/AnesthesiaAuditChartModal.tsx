'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardDocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { anesthesiaAuditGroups, anesthesiaAuditItems, anesthesiaMaxScore } from '@/lib/anesthesiaAuditCriteria';

type Answer = '' | 'NA' | '1' | '2' | '3' | '4';
type AuditDraft = {
  audit_month: string;
  patient_an: string;
  disease: string;
  auditor_name: string;
  general_notes: string;
  scores: Record<string, Answer>;
  item_notes: Record<string, string>;
};

interface AnesthesiaAuditChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName?: string;
  /** ตัวอย่าง UI เท่านั้น: ยังไม่มีการเชื่อมฐานข้อมูลหรือระบบอนุมัติ */
  onPreview?: (draft: AuditDraft) => void;
  departmentId: number | string;
  onSuccess?: () => void;
}

const newDraft = (): AuditDraft => ({
  audit_month: new Date().toLocaleDateString('en-CA').slice(0, 7),
  patient_an: '', disease: '', auditor_name: '', general_notes: '',
  scores: {}, item_notes: {},
});

export default function AnesthesiaAuditChartModal({ isOpen, onClose, departmentName = 'วิสัญญี', onPreview, departmentId, onSuccess }: AnesthesiaAuditChartModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<AuditDraft>(newDraft);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  const stats = useMemo(() => {
    const answered = anesthesiaAuditItems.filter(item => draft.scores[item.id] && draft.scores[item.id] !== '').length;
    const applicable = anesthesiaAuditItems.filter(item => draft.scores[item.id] !== 'NA');
    const completedApplicable = applicable.filter(item => draft.scores[item.id] !== undefined && draft.scores[item.id] !== '');
    const score = completedApplicable.reduce((sum,item) => sum + Number(draft.scores[item.id]),0);
    return {answered, score, maxAnswered:completedApplicable.length * 4, maxApplicable: applicable.length * 4};
  },[draft.scores]);

  async function saveDraft() {
    if (saving) return;setMessage('');
    const dept = Number(departmentId);
    if (!Number.isSafeInteger(dept) || dept <= 0) {setMessage('ไม่พบหน่วยงาน');return;}
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.audit_month) || !draft.patient_an.trim() || !draft.auditor_name.trim()) {setMessage('กรุณากรอกเดือน AN และชื่อผู้ตรวจประเมิน');return;}
    for (const item of anesthesiaAuditItems) {
      const score = draft.scores[item.id];
      if (score && score !== 'NA' && score !== '4' && !draft.item_notes[item.id]?.trim()) {setMessage(`กรุณาระบุข้อบกพร่องข้อ ${item.number}`);return;}
    }
    const body = {department_id:dept,form_type:'anesthesia',form_version:'anesthesia-4pt-1.0-draft',audit_date:`${draft.audit_month}-01`,reference_number:draft.patient_an,auditor_name:draft.auditor_name,
      notes:`[ANESTHESIA_DISEASE] ${draft.disease.replace(/[\r\n]/g,' ').trim()}\n${draft.general_notes}`.trim(),
      answers:Object.fromEntries(Object.entries(draft.scores).filter(([,value])=>value!=='').map(([id,value])=>[id,value==='NA'?{na:true}:{score:Number(value),note:draft.item_notes[id]||''}]))};
    setSaving(true);
    try {
      const response=await fetch(draftId?`/api/audits/${encodeURIComponent(draftId)}`:'/api/audits',{method:draftId?'PATCH':'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body),cache:'no-store'});
      const result=await response.json().catch(()=>null);
      if(!response.ok){setMessage(result?.error||`เกิดข้อผิดพลาด ${response.status}`);return;}
      setDraftId(result.item.id);setMessage('บันทึกร่างใน Supabase สำเร็จ');onSuccess?.();
    }catch{setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');}finally{setSaving(false);}
  }

  if (!mounted || !isOpen) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="แบบประเมิน Audit Chart วิสัญญี" className="fixed inset-0 z-[99999] flex items-center justify-center bg-emerald-950/65 p-2 backdrop-blur-[2px] sm:p-4">
      <div className="flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <ClipboardDocumentCheckIcon className="h-7 w-7 shrink-0 text-emerald-700" />
            <div><h2 className="text-base font-bold text-emerald-950 sm:text-lg">บันทึกผล Audit Chart ({departmentName})</h2><p className="text-xs text-slate-500">วิสัญญี · คะแนนเต็มข้อละ 4 · บันทึกร่าง</p></div>
          </div>
          <button type="button" aria-label="ปิดหน้าต่าง" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
            <label className="block text-xs font-semibold text-slate-700">ประจำเดือน (Month)
              <input type="month" value={draft.audit_month} onChange={e=>setDraft(d=>({...d,audit_month:e.target.value}))} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">AN ผู้ป่วย
              <input type="text" value={draft.patient_an} onChange={e=>setDraft(d=>({...d,patient_an:e.target.value}))} placeholder="กรอก AN" className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">โรค
              <input type="text" value={draft.disease} onChange={e=>setDraft(d=>({...d,disease:e.target.value}))} placeholder="กรอกโรค/หัตถการ" className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
            </label>
          </section>

          <section aria-label="สรุปคะแนน" className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-xs text-slate-500">จำนวนข้อ</p><p className="text-lg font-bold text-slate-800">{anesthesiaAuditItems.length}</p></div>
            <div className="rounded-xl bg-emerald-50 px-2 py-2"><p className="text-xs text-emerald-700">กรอกแล้ว</p><p className="text-lg font-bold text-emerald-800">{stats.answered}/{anesthesiaAuditItems.length}</p></div>
            <div className="rounded-xl bg-violet-50 px-2 py-2"><p className="text-xs text-violet-700">คะแนนที่กรอก</p><p className="text-lg font-bold text-violet-800">{stats.score}/{stats.maxAnswered}</p></div>
          </section>
          <p className="text-xs text-slate-500">คะแนนเต็มตามเอกสาร {anesthesiaMaxScore} คะแนน (13 ข้อ × 4) · ช่องว่างและ NA ไม่นำมาคิดคะแนนขณะกรอก · คะแนนนี้ยังไม่ใช่ผลการประเมินทางการ</p>

          {anesthesiaAuditGroups.map(group => <section key={group.title} className="overflow-hidden rounded-xl border border-emerald-100">
            <h3 className="bg-emerald-700 px-4 py-2 text-sm font-bold text-white">{group.title}</h3>
            <div className="divide-y divide-slate-100">
              {group.items.map(item => {
                const score = draft.scores[item.id] ?? '';
                return <div key={item.id} className="p-3 sm:px-4">
                  <div className="flex items-start justify-between gap-3">
                    <label htmlFor={`score-${item.id}`} className="text-sm text-slate-800"><strong className="text-emerald-800">{item.number}.</strong> {item.label}</label>
                    <select id={`score-${item.id}`} aria-label={`คะแนนข้อ ${item.number}`} value={score} onChange={e=>setDraft(d=>({...d,scores:{...d.scores,[item.id]:e.target.value as Answer}}))} className="h-9 w-[82px] shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-900">
                      <option value="">—</option>{(['1','2','3','4','NA'] as Answer[]).map(x=><option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  {score !== '' && score !== '4' && score !== 'NA' && <input aria-label={`หมายเหตุข้อ ${item.number}`} value={draft.item_notes[item.id] ?? ''} onChange={e=>setDraft(d=>({...d,item_notes:{...d.item_notes,[item.id]:e.target.value}}))} className="mt-2 h-9 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs" placeholder="ระบุข้อบกพร่อง / ข้อเสนอแนะ..." />}
                </div>;
              })}
            </div>
          </section>)}
          <label className="block text-sm font-semibold text-slate-700">หมายเหตุ / ข้อเสนอแนะภาพรวม
            <textarea rows={2} value={draft.general_notes} onChange={e=>setDraft(d=>({...d,general_notes:e.target.value}))} className="mt-1 block w-full resize-y rounded-lg border border-slate-300 p-2 text-sm" placeholder="ข้อเสนอแนะเพิ่มเติม" />
          </label>
        </div>

        <footer className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-end sm:px-6">
          <label className="text-sm font-semibold text-emerald-900 sm:w-1/2">พยาบาลผู้ตรวจประเมิน (Auditor)
            <input value={draft.auditor_name} onChange={e=>setDraft(d=>({...d,auditor_name:e.target.value}))} placeholder="ชื่อพยาบาลผู้ตรวจ" className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" />
          </label>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-700">ปิด</button><button type="button" onClick={saveDraft} disabled={saving} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'กำลังบันทึก...':'บันทึกร่าง'}</button></div>
        </footer>
        {message && <p role="status" className="shrink-0 bg-amber-50 px-5 py-2 text-xs text-amber-900">{message}</p>}
      </div>
    </div>,document.body
  );
}
