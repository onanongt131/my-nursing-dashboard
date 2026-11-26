

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { ClipboardDocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { specialUnitAuditForms, groupSection } from '@/lib/specialUnitAuditForms';
const config=specialUnitAuditForms.hbot;
const lrAuditGroups=config.groups;



type Answer = {score?: number; na?: boolean; note?: string; inputDraft?: string};

type AuditItem = {id:string; department_id:number; form_type:string; status:string; answers:Record<string,Answer>; audit_date:string; reference_number?:string|null; auditor_name?:string|null; notes?:string|null};

type Props = { isOpen:boolean; onClose:()=>void; departmentId:number|string; departmentName?:string; onSuccess?:()=>void; initialData?:AuditItem|null };

const localMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

const getDisease = (notes?: string | null) => (notes || '').match(/^\[HBOT_DISEASE\] (.*)(?:\n|$)/)?.[1] || '';
const getGeneralNotes = (notes?: string | null) => (notes || '').replace(/^\[HBOT_DISEASE\] .*?(?:\n|$)/, '');
const allItems = lrAuditGroups.flatMap(g=>g.items);

const sectionHeaders = config.headings;
const sectionOfGroup = groupSection;

export default function HBOTAuditChartModal({isOpen,onClose,departmentId,departmentName,onSuccess,initialData}:Props) {

 const [auditMonth,setAuditMonth]=useState(()=>initialData?.audit_date?.slice(0,7)||localMonth());

 const [disease,setDisease]=useState(()=>getDisease(initialData?.notes));

 const [auditorName,setAuditorName]=useState(()=>initialData?.auditor_name||'');

 const [referenceNumber,setReferenceNumber]=useState(()=>initialData?.reference_number||'');

 const [notes,setNotes]=useState(()=>getGeneralNotes(initialData?.notes));

 const [answers,setAnswers]=useState<Record<string,Answer>>(()=>initialData?.answers||{});

 const [saving,setSaving]=useState(false);
 const savingRef = useRef(false);
 const formRef = useRef<HTMLDivElement>(null);
 const showFieldError=(key:string,text:string)=>{
   setMessage(text);
   const id=key.replace(/^(score|note):/,'');
   const group=lrAuditGroups.find(g=>g.items.some(item=>item.id===id));
   if(group)setCollapsed(previous=>({...previous,[group.title]:false}));
   requestAnimationFrame(()=>{
     const field=Array.from(formRef.current?.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-audit-field]')||[]).find(element=>element.dataset.auditField===key);
     if(!field)return;
     field.setCustomValidity(text);
     field.setAttribute('aria-invalid','true');
     field.classList.add('ring-2','ring-red-400');
     field.scrollIntoView({block:'center',behavior:'auto'});
     field.focus({preventScroll:true});field.reportValidity();
   });
 };
 const clearFieldError=(event:React.FormEvent<HTMLDivElement>)=>{
   const field=event.target;
   if(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement){
     field.setCustomValidity('');field.removeAttribute('aria-invalid');field.classList.remove('ring-2','ring-red-400');
   }
 };

 const [message,setMessage]=useState('');

 const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});

 const [draftId,setDraftId]=useState(initialData?.id||'');

 const readOnly = initialData?.status !== undefined && initialData.status !== 'draft';

 const [portalReady, setPortalReady] = useState(false);

 useEffect(() => { setPortalReady(true); }, []);

 useEffect(() => {

   if (!isOpen || !portalReady) return;

   const originalOverflow = document.body.style.overflow;

   document.body.style.overflow = 'hidden';

   return () => { document.body.style.overflow = originalOverflow; };

 }, [isOpen, portalReady]);

 const summary=useMemo(()=>{const scored=allItems.map(i=>answers[i.id]).filter(a=>a&&typeof a.score==='number'&&!a.na);const na=allItems.filter(i=>answers[i.id]?.na).length;return {answered:scored.length+na,na,points:scored.reduce((t,a)=>t+(a.score||0),0),possible:scored.length*config.maxScore};},[answers]);

 if(!isOpen || !portalReady)return null;

 const setScore=(id:string,value:string)=>setAnswers(a=>({...a,[id]:value===''?{}:value==='NA'?{na:true}:{score:Number(value),note:a[id]?.note||''}}));

 const setNote=(id:string,note:string)=>setAnswers(a=>({...a,[id]:{...a[id],note}}));

 async function saveDraft(){

   if(savingRef.current || readOnly)return;setMessage('');
   formRef.current?.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-audit-field]').forEach(field=>{field.setCustomValidity('');field.removeAttribute('aria-invalid');field.classList.remove('ring-2','ring-red-400');});

   if(!auditorName.trim()){showFieldError('auditor','กรุณาระบุชื่อพยาบาลผู้ตรวจประเมิน');return;}
   const dept=Number(departmentId);

   if(!Number.isSafeInteger(dept)||dept<=0){setMessage('ไม่พบรหัสหน่วยงาน');return;}

   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(auditMonth)){showFieldError('month','กรุณาเลือกเดือนให้ถูกต้อง');return;}

   for(const item of allItems){const a=answers[item.id];if(!a||(!a.na&&a.score===undefined)){showFieldError(`score:${item.id}`,`กรุณากรอกคะแนนข้อ ${item.label}`);return;}if(a?.inputDraft){showFieldError(`score:${item.id}`,`กรุณากรอกคะแนนให้ครบ ข้อ ${item.label}`);return;}if(a?.score !== undefined && !a.na && a.score<config.maxScore && !a.note?.trim()){showFieldError(`note:${item.id}`,`กรุณาระบุข้อบกพร่อง ข้อ ${item.label}`);return;}}

   savingRef.current = true; setSaving(true);

   try{

     const payload={department_id:dept,form_type:'hbot',form_version:'1.0',audit_date:`${auditMonth}-01`,reference_number:referenceNumber,auditor_name:auditorName,notes:`[HBOT_DISEASE] ${disease.replace(/[\r\n]/g,' ').trim()}\n${notes}`.trim(),answers:Object.fromEntries(Object.entries(answers).map(([key, answer]) => [key, {score:answer.score, na:answer.na, note:answer.note}]))};

     const response=await fetch(draftId?`/api/audits/${encodeURIComponent(draftId)}`:'/api/audits',{method:draftId?'PATCH':'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),cache:'no-store'});

     const result=await response.json().catch(()=>null);

     if(!response.ok){setMessage(`บันทึกไม่สำเร็จ (HTTP ${response.status}): ${typeof result?.error === 'string' ? result.error : 'กรุณาตรวจสอบ API และสิทธิ์เข้าใช้งาน'}`);return;}

     const savedId = result?.item?.id;
     if (savedId) setDraftId(String(savedId));
     else {
       setMessage('เซิร์ฟเวอร์ตอบรับแล้ว แต่ไม่ส่งรหัสรายการกลับมา กรุณาตรวจสอบรายการก่อนบันทึกซ้ำ');
       return;
     }
     window.alert('บันทึกข้อมูลสำเร็จ — รออนุมัติจากหัวหน้าหอผู้ป่วย');
     setMessage('บันทึกข้อมูลสำเร็จ — รออนุมัติ');
     window.dispatchEvent(new Event('audit-records-updated'));
     try { onSuccess?.(); } catch { setMessage('บันทึกข้อมูลสำเร็จ — รออนุมัติ แต่รีเฟรชรายการไม่สำเร็จ กรุณาเปิดรายการใหม่'); }

   }catch{setMessage('เชื่อมต่อ API ไม่สำเร็จ กรุณาตรวจสอบรายการก่อนบันทึกซ้ำ เพราะเซิร์ฟเวอร์อาจรับข้อมูลแล้ว');}finally{savingRef.current = false;setSaving(false);}

 }

 return createPortal(

 <div ref={formRef} onInputCapture={clearFieldError} role="dialog" aria-modal="true" aria-label={`Audit ${config.name}`} className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5">

  <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">

      <div className="flex min-w-0 items-center gap-3">

        <ClipboardDocumentCheckIcon className="h-7 w-7 shrink-0 text-emerald-700" aria-hidden="true" />

        <h2 className="truncate text-base font-extrabold text-emerald-950 sm:text-xl">บันทึกผล Audit Chart ({departmentName || config.name})</h2>

      </div>

      <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="ปิดหน้าต่าง"><XMarkIcon className="h-6 w-6" /></button>

    </header>

    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">

     <div className="rounded-2xl border border-slate-400 bg-slate-50 px-4 py-3 sm:px-5">

       <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

         <label className="min-w-0 text-sm font-semibold text-slate-800">ประจำเดือน (Month)

           <input data-audit-field="month" type="month" required value={auditMonth} disabled={readOnly} onChange={e=>setAuditMonth(e.target.value)} className="mt-1 block h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 disabled:bg-slate-100" />

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

         {lrAuditGroups.filter(g => sectionOfGroup(g.title) === section.id).map(g => (

           <div className="overflow-hidden rounded-xl border border-slate-200" key={g.title}>

             <button type="button" aria-expanded={!collapsed[g.title]} className="flex w-full items-center justify-between bg-emerald-50 p-3 text-left font-semibold text-emerald-900" onClick={()=>setCollapsed(v=>({...v,[g.title]:!v[g.title]}))}>

               <span>{g.title.split(' — ')[0]}</span><span aria-hidden="true">{collapsed[g.title]?'⌄':'⌃'}</span>

             </button>

             {!collapsed[g.title]&&<div className="divide-y">{g.items.map((i,index)=>{const a=answers[i.id]||{};const rating=a.inputDraft || (a.na?'NA':typeof a.score==='number'?String(a.score):'');return <div key={i.id} className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_110px]"><label className="text-sm text-slate-700"><span className="mr-2 font-semibold text-emerald-800">{''}</span>{i.label}</label><input

                type="text"

                inputMode="text"

                value={rating}

                disabled={readOnly}

                data-audit-field={`score:${i.id}`} required aria-label={`คะแนน ${i.id}`}

                placeholder={config.allowNA?'1–4 หรือ NA':config.scores.join('/')}

                maxLength={2}

                onChange={(e) => {

                  const next = e.target.value.trim().toUpperCase();

                  if (next === '' || (config.allowNA && (next === 'N' || next === 'NA')) || config.scores.map(String).includes(next)) {

                    // N permits typing NA without rejecting the first keystroke.

                    if (next === 'N') {

                      setAnswers(previous => ({ ...previous, [i.id]: { ...previous[i.id], inputDraft: 'N' } as Answer }));

                    } else {

                      setScore(i.id, next);

                    }

                  }

                }}

                className="h-10 w-[112px] justify-self-end rounded-lg border border-slate-400 bg-white px-2 text-center text-sm font-semibold text-slate-800 placeholder:text-slate-400 disabled:bg-slate-100"

              />{a.score!==undefined&&a.score<config.maxScore&&!a.na&&<textarea data-audit-field={`note:${i.id}`} required value={a.note||''} disabled={readOnly} onChange={e=>setNote(i.id,e.target.value)} placeholder="ระบุข้อบกพร่อง (จำเป็นเมื่อคะแนนต่ำกว่าคะแนนเต็ม)" rows={2} className="h-14 resize-y rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm md:col-span-2"/>}</div>})}</div>}

           </div>

         ))}

       </section>

     ))}

     <label className="block text-sm">หมายเหตุทั่วไป<textarea value={notes} disabled={readOnly} onChange={e=>setNotes(e.target.value)} className="mt-1 block h-16 w-full resize-y rounded-lg border p-2 text-sm" rows={2}/></label>

     

    </div>

    <footer className="shrink-0 border-t bg-white px-4 py-3 sm:px-5">
      <div role="status" aria-live="polite" aria-atomic="true" className="mb-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">{saving ? 'กำลังบันทึกข้อมูล…' : message}</div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

        <label className="block w-full min-w-0 text-sm font-semibold text-emerald-950 sm:max-w-md">

          พยาบาลผู้ตรวจประเมิน (Auditor)

          <input

            type="text"

            data-audit-field="auditor" required value={auditorName}

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
