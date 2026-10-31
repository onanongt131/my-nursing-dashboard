
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardDocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { erAuditGroups } from '@/lib/erAuditCriteria';

type Answer = {score?: number; na?: boolean; note?: string; inputDraft?: string};
type AuditItem = {id:string; department_id:number; form_type:string; status:string; answers:Record<string,Answer>; audit_date:string; reference_number?:string|null; auditor_name?:string|null; notes?:string|null};
type Props = { isOpen:boolean; onClose:()=>void; departmentId:number|string; departmentName:string; onSuccess?:()=>void; initialData?:AuditItem|null };
const localMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const getDisease = (notes?: string | null) => (notes || '').match(/^\[ER_DISEASE\] (.*)(?:\n|$)/)?.[1] || '';
const getGeneralNotes = (notes?: string | null) => (notes || '').replace(/^\[ER_DISEASE\] .*?(?:\n|$)/, '');
const allItems = erAuditGroups.flatMap(g=>g.items);
const sectionHeaders = [
 {id:'1', title:'1. การบันทึกแรกรับ'},
 {id:'2', title:'2. การบันทึกต่อเนื่อง (กรณี Observe)'},
 {id:'3', title:'3. การจำหน่าย/การส่งต่อการดูแล'},
] as const;
const sectionOfGroup = (title:string) => title.startsWith('1.') ? '1' : title.startsWith('2.') ? '2' : '3';

export default function ERAuditChartModal({isOpen,onClose,departmentId,departmentName,onSuccess,initialData}:Props) {
 const [auditMonth,setAuditMonth]=useState(()=>initialData?.audit_date?.slice(0,7)||localMonth());
 const [disease,setDisease]=useState(()=>getDisease(initialData?.notes));
 const [auditorName,setAuditorName]=useState(()=>initialData?.auditor_name||'');
 const [referenceNumber,setReferenceNumber]=useState(()=>initialData?.reference_number||'');
 const [notes,setNotes]=useState(()=>getGeneralNotes(initialData?.notes));
 const [answers,setAnswers]=useState<Record<string,Answer>>(()=>initialData?.answers||{});
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});
 const [draftId,setDraftId]=useState(initialData?.id||'');
 const [readOnly]=useState(initialData?.status !== undefined && initialData.status !== 'draft');
 const [portalReady, setPortalReady] = useState(false);
 useEffect(() => { setPortalReady(true); }, []);
 useEffect(() => {
   if (!isOpen || !portalReady) return;
   const originalOverflow = document.body.style.overflow;
   document.body.style.overflow = 'hidden';
   return () => { document.body.style.overflow = originalOverflow; };
 }, [isOpen, portalReady]);
 const summary=useMemo(()=>{const scored=allItems.map(i=>answers[i.id]).filter(a=>a&&typeof a.score==='number'&&!a.na);const na=allItems.filter(i=>answers[i.id]?.na).length;return {answered:scored.length+na,na,points:scored.reduce((t,a)=>t+(a.score||0),0),possible:scored.length*4};},[answers]);
 if(!isOpen || !portalReady)return null;
 const setScore=(id:string,value:string)=>setAnswers(a=>({...a,[id]:value===''?{}:value==='NA'?{na:true}:{score:Number(value),note:a[id]?.note||''}}));
 const setNote=(id:string,note:string)=>setAnswers(a=>({...a,[id]:{...a[id],note}}));
 async function saveDraft(){
   if(saving)return;setMessage('');
   const dept=Number(departmentId);
   if(!Number.isSafeInteger(dept)||dept<=0){setMessage('ไม่พบรหัสหน่วยงาน');return;}
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(auditMonth)){setMessage('กรุณาเลือกเดือนให้ถูกต้อง');return;}
   for(const item of allItems){const a=answers[item.id];if(a?.score && a.score<4 && !a.note?.trim()){setMessage(`กรุณากรอกหมายเหตุข้อ ${item.id}`);return;}}
   setSaving(true);
   try{
     const payload={department_id:dept,form_type:'er',form_version:'er-1.0-draft',audit_date:`${auditMonth}-01`,reference_number:referenceNumber,auditor_name:auditorName,notes:`[ER_DISEASE] ${disease.replace(/[\r\n]/g,' ').trim()}\n${notes}`.trim(),answers:Object.fromEntries(Object.entries(answers).map(([key, answer]) => [key, {score:answer.score, na:answer.na, note:answer.note}]))};
     const response=await fetch(draftId?`/api/audits/${encodeURIComponent(draftId)}`:'/api/audits',{method:draftId?'PATCH':'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),cache:'no-store'});
     const result=await response.json().catch(()=>null);
     if(!response.ok){setMessage(result?.error||`ไม่สามารถบันทึกได้ (${response.status})`);return;}
     setDraftId(result.item.id);setMessage('บันทึกร่างลง Supabase สำเร็จ (ยังไม่ส่งตรวจสอบ)');onSuccess?.();
   }catch{setMessage('เชื่อมต่อ API ไม่สำเร็จ กรุณาตรวจสอบ Server');}finally{setSaving(false);}
 }
 return createPortal(
 <div role="dialog" aria-modal="true" aria-label="Audit ห้องฉุกเฉิน" className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5">
  <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <ClipboardDocumentCheckIcon className="h-7 w-7 shrink-0 text-emerald-700" aria-hidden="true" />
        <h2 className="truncate text-base font-extrabold text-emerald-950 sm:text-xl">บันทึกผล Audit Chart ({departmentName || 'ห้องฉุกเฉิน'})</h2>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="ปิดหน้าต่าง"><XMarkIcon className="h-6 w-6" /></button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
     <div className="rounded-2xl border border-slate-400 bg-slate-50 px-4 py-3 sm:px-5">
       <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
         <label className="min-w-0 text-sm font-semibold text-slate-800">ประจำเดือน (Month)
           <input type="month" required value={auditMonth} disabled={readOnly} onChange={e=>setAuditMonth(e.target.value)} className="mt-1 block h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 disabled:bg-slate-100" />
         </label>
         <label className="min-w-0 text-sm font-semibold text-slate-800">AN ผู้ป่วย
           <input type="text" value={referenceNumber} disabled={readOnly} onChange={e=>setReferenceNumber(e.target.value)} placeholder="ใส่เลข AN เช่น 6900xxxxx" maxLength={100} className="mt-1 block h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 placeholder:text-slate-400 disabled:bg-slate-100" />
         </label>
         <label className="min-w-0 text-sm font-semibold text-slate-800">โรค
           <input type="text" value={disease} disabled={readOnly} onChange={e=>setDisease(e.target.value)} placeholder="ใส่โรค" maxLength={200} className="mt-1 block h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 placeholder:text-slate-400 disabled:bg-slate-100" />
         </label>
       </div>
     </div>
     <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
       <div className="rounded-xl bg-slate-50 px-2 py-2"><span className="block text-slate-600">ข้อที่มีในเอกสาร</span><strong className="block text-lg leading-6 text-slate-900">{allItems.length}</strong></div>
       <div className="rounded-xl bg-emerald-50 px-2 py-2"><span className="block text-slate-600">กรอกแล้ว</span><strong className="block text-lg leading-6 text-slate-900">{summary.answered}</strong></div>
       <div className="rounded-xl bg-purple-50 px-2 py-2"><span className="block text-slate-600">คะแนนข้อที่กรอก</span><strong className="block text-lg leading-6 text-slate-900">{summary.points}/{summary.possible}</strong><span className="block text-[10px] text-slate-500">ไม่ใช่คะแนนทางการ</span></div>
     </div>
     {sectionHeaders.map(section => (
       <section key={section.id} className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-3 sm:p-4">
         <h3 className="rounded-xl bg-emerald-800 px-4 py-3 text-base font-bold text-white">{section.title}</h3>
         {erAuditGroups.filter(g => sectionOfGroup(g.title) === section.id).map(g => (
           <div className="overflow-hidden rounded-xl border border-slate-200" key={g.title}>
             <button type="button" aria-expanded={!collapsed[g.title]} className="flex w-full items-center justify-between bg-emerald-50 p-3 text-left font-semibold text-emerald-900" onClick={()=>setCollapsed(v=>({...v,[g.title]:!v[g.title]}))}>
               <span>{g.title.split(' — ')[0]}</span><span aria-hidden="true">{collapsed[g.title]?'⌄':'⌃'}</span>
             </button>
             {!collapsed[g.title]&&<div className="divide-y">{g.items.map((i,index)=>{const a=answers[i.id]||{};const rating=a.inputDraft || (a.na?'NA':a.score?String(a.score):'');return <div key={i.id} className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_110px]"><label className="text-sm text-slate-700"><span className="mr-2 font-semibold text-emerald-800">{i.code}</span>{i.label}</label><input
                type="text"
                inputMode="text"
                value={rating}
                disabled={readOnly}
                aria-label={`คะแนน ${i.id}`}
                placeholder="1-4 หรือ NA"
                maxLength={2}
                onChange={(e) => {
                  const next = e.target.value.trim().toUpperCase();
                  if (next === '' || next === 'N' || next === 'NA' || ['1', '2', '3', '4'].includes(next)) {
                    // N permits typing NA without rejecting the first keystroke.
                    if (next === 'N') {
                      setAnswers(previous => ({ ...previous, [i.id]: { ...previous[i.id], inputDraft: 'N' } as Answer }));
                    } else {
                      setScore(i.id, next);
                    }
                  }
                }}
                className="h-10 w-[112px] justify-self-end rounded-lg border border-slate-400 bg-white px-2 text-center text-sm font-semibold text-slate-800 placeholder:text-slate-400 disabled:bg-slate-100"
              />{a.score!==undefined&&a.score<4&&!a.na&&<textarea value={a.note||''} disabled={readOnly} onChange={e=>setNote(i.id,e.target.value)} placeholder="ระบุข้อบกพร่อง (จำเป็นเมื่อคะแนนน้อยกว่า 4)" rows={2} className="h-14 resize-y rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm md:col-span-2"/>}</div>})}</div>}
           </div>
         ))}
       </section>
     ))}
     <label className="block text-sm">หมายเหตุทั่วไป<textarea value={notes} disabled={readOnly} onChange={e=>setNotes(e.target.value)} className="mt-1 block h-16 w-full resize-y rounded-lg border p-2 text-sm" rows={2}/></label>
     {message&&<div role="status" className="rounded-lg bg-slate-100 p-3 text-sm">{message}</div>}
    </div>
    <footer className="shrink-0 border-t bg-white px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full min-w-0 text-sm font-semibold text-emerald-950 sm:max-w-md">
          พยาบาลผู้ตรวจประเมิน (Auditor)
          <input
            type="text"
            value={auditorName}
            disabled={readOnly}
            onChange={e => setAuditorName(e.target.value)}
            placeholder="ใส่ชื่อพยาบาล"
            className="mt-1 block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
          />
        </label>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-300">ปิด</button>
          <button type="button" disabled={saving || readOnly} onClick={saveDraft} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
        </div>
      </div>
    </footer>
  </div></div>,
 document.body
 );
}
