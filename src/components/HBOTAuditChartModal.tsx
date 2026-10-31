'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hbotAuditGroups, HBOT_TOTAL_ITEMS } from '@/lib/hbotAuditCriteria';

type Score = '' | '0' | '1';
type Props = {
  isOpen: boolean;
  onClose: () => void;
  departmentName?: string;
  departmentId: number | string;
  onSuccess?: () => void;
};

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
};

export default function HBOTAuditChartModal({isOpen,onClose,departmentName='เวชศาสตร์ใต้น้ำ',departmentId,onSuccess}:Props) {
  const [mounted,setMounted] = useState(false);
  const [month,setMonth] = useState(currentMonth);
  const [patientAN,setPatientAN] = useState('');
  const [disease,setDisease] = useState('');
  const [auditor,setAuditor] = useState('');
  const [generalNote,setGeneralNote] = useState('');
  const [scores,setScores] = useState<Record<string,Score>>({});
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [openGroups,setOpenGroups] = useState<Record<string,boolean>>({});
  const [saving,setSaving] = useState(false);
  const [saveMessage,setSaveMessage] = useState('');
  const [draftId,setDraftId] = useState('');

  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{
    if(!isOpen)return;
    const previous = document.body.style.overflow;
    document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;};
  },[isOpen]);
  const answered = useMemo(()=>Object.values(scores).filter(x=>x==='0'||x==='1').length,[scores]);
  const earned = useMemo(()=>Object.values(scores).filter(x=>x==='1').length,[scores]);
  const completed = answered===HBOT_TOTAL_ITEMS;
  const allNotes = hbotAuditGroups.flatMap(g=>g.items).filter(item=>scores[item.id]==='0' && !notes[item.id]?.trim());
  const preview = () => {
    if(!month || !patientAN.trim() || !disease.trim() || !auditor.trim()){
      window.alert('กรอกประจำเดือน AN ผู้ป่วย โรค และพยาบาลผู้ตรวจประเมินให้ครบ');return;
    }
    if(!completed){window.alert(`ยังกรอกไม่ครบ ${HBOT_TOTAL_ITEMS-answered} ข้อ`);return;}
    if(allNotes.length){window.alert(`กรุณาระบุหมายเหตุของข้อที่ไม่ผ่านอีก ${allNotes.length} ข้อ`);return;}
    window.alert(`ตรวจสอบแบบฟอร์มครบ ${answered} ข้อ ได้ ${earned}/${HBOT_TOTAL_ITEMS} คะแนน (${(earned/HBOT_TOTAL_ITEMS*100).toFixed(1)}%)\n\nยังไม่มีการส่งหรือบันทึกข้อมูลลง Supabase`);
  };
  async function saveDraft() {
    if(saving)return;setSaveMessage('');
    const dept=Number(departmentId);
    if(!Number.isSafeInteger(dept)||dept<=0){setSaveMessage('ไม่พบรหัสหน่วยงาน');return;}
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!patientAN.trim()||!auditor.trim()){setSaveMessage('กรุณากรอกเดือน AN และผู้ตรวจประเมิน');return;}
    for(const item of hbotAuditGroups.flatMap(g=>g.items)){if(scores[item.id]==='0'&&!notes[item.id]?.trim()){setSaveMessage(`กรุณาระบุข้อบกพร่อง ${item.id}`);return;}}
    const body={department_id:dept,form_type:'hbot',form_version:'hbot-1.0-draft',audit_date:`${month}-01`,reference_number:patientAN,auditor_name:auditor,
      notes:`[HBOT_DISEASE] ${disease.replace(/[\r\n]/g,' ').trim()}\n${generalNote}`.trim(),
      answers:Object.fromEntries(Object.entries(scores).filter(([,v])=>v!=='').map(([id,value])=>[id,{score:Number(value),note:notes[id]||''}]))};
    setSaving(true);
    try{const response=await fetch(draftId?`/api/audits/${encodeURIComponent(draftId)}`:'/api/audits',{method:draftId?'PATCH':'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body),cache:'no-store'});
      const result=await response.json().catch(()=>null);if(!response.ok){setSaveMessage(result?.error||`บันทึกไม่สำเร็จ ${response.status}`);return;}
      setDraftId(result.item.id);setSaveMessage('บันทึกร่างใน Supabase สำเร็จ');onSuccess?.();
    }catch{setSaveMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');}finally{setSaving(false);}
  }
  if(!isOpen||!mounted)return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Audit Chart ${departmentName}`} className="fixed inset-0 z-[99999] flex items-center justify-center bg-emerald-950/65 p-2 sm:p-4">
      <div className="flex max-h-[96dvh] w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div><h2 className="text-base font-extrabold text-emerald-950 sm:text-lg">บันทึกผล Audit Chart ({departmentName})</h2><p className="text-xs text-slate-500">เวชศาสตร์ใต้น้ำ · บันทึกร่าง (ยังไม่ใช่คะแนนทางการ)</p></div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg px-3 py-1.5 text-xl text-gray-600 hover:bg-gray-100">×</button>
        </header>
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-400 bg-slate-50 p-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-800">ประจำเดือน (Month)<input aria-label="ประจำเดือน" type="month" value={month} onChange={e=>setMonth(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal"/></label>
            <label className="text-sm font-semibold text-slate-800">AN ผู้ป่วย<input type="text" value={patientAN} onChange={e=>setPatientAN(e.target.value)} placeholder="ใส่เลข AN" className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal"/></label>
            <label className="text-sm font-semibold text-slate-800">โรค<input type="text" value={disease} onChange={e=>setDisease(e.target.value)} placeholder="ใส่โรค" className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal"/></label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
            <div className="rounded-xl bg-slate-50 px-2 py-2 text-sm">ข้อในเอกสาร<div className="text-xl font-bold">{HBOT_TOTAL_ITEMS}</div></div>
            <div className="rounded-xl bg-emerald-50 px-2 py-2 text-sm">กรอกแล้ว<div className="text-xl font-bold">{answered}</div></div>
            <div className="rounded-xl bg-violet-50 px-2 py-2 text-sm">คะแนนที่กรอก<div className="text-xl font-bold">{earned}/{answered}</div><div className="text-[11px] text-slate-500">เต็มทั้งหมด {HBOT_TOTAL_ITEMS}</div></div>
          </div>
          {hbotAuditGroups.map(group=>(
            <section key={group.id} className="overflow-hidden rounded-xl border border-emerald-200">
              <button type="button" onClick={()=>setOpenGroups(p=>({...p,[group.id]:p[group.id]===false?true:false}))} className="flex w-full items-center justify-between bg-emerald-700 px-4 py-3 text-left font-bold text-white"><span>{group.title}</span><span>{openGroups[group.id]===false?'＋':'−'}</span></button>
              {openGroups[group.id]!==false&&<div className="divide-y divide-slate-200">{group.items.map(item=>(
                <div key={item.id} className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><div className="text-sm font-medium text-slate-800">{item.label}</div>
                    <select aria-label={`คะแนน ${item.label}`} value={scores[item.id]??''} onChange={e=>setScores(p=>({...p,[item.id]:e.target.value as Score}))} className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm font-semibold sm:w-[120px]"><option value="">เลือกคะแนน</option><option value="1">1 — ครบ</option><option value="0">0 — ไม่ครบ</option></select>
                  </div>
                  {scores[item.id]==='0'&&<input aria-label={`หมายเหตุ ${item.label}`} value={notes[item.id]??''} onChange={e=>setNotes(p=>({...p,[item.id]:e.target.value}))} placeholder="ระบุข้อบกพร่อง/เหตุผลที่ไม่ผ่าน" className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm"/>}
                </div>
              ))}</div>}
            </section>
          ))}
          {saveMessage && <p role="status" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{saveMessage}</p>}
          <label className="block text-sm font-semibold text-slate-800">หมายเหตุ / ข้อเสนอแนะเพิ่มเติม<textarea rows={2} value={generalNote} onChange={e=>setGeneralNote(e.target.value)} placeholder="ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)" className="mt-1 block w-full rounded-lg border border-slate-300 p-2 font-normal"/></label>
        </main>
        <footer className="flex shrink-0 flex-col gap-3 border-t bg-white px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <label className="block w-full text-sm font-semibold text-emerald-950 sm:max-w-md">พยาบาลผู้ตรวจประเมิน (Auditor)<input type="text" value={auditor} onChange={e=>setAuditor(e.target.value)} placeholder="ใส่ชื่อพยาบาล" className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"/></label>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-6 py-2.5 font-semibold">ปิด</button><button type="button" onClick={saveDraft} disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving?"กำลังบันทึก...":"บันทึกร่าง"}</button></div>
        </footer>
      </div>
    </div>,document.body);
}
