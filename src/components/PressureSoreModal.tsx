'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import PressureSoreMonthlyForm from '@/components/PressureSoreMonthlyForm';
import {emptyPressureSore,pressureFields,PRESSURE_LEVELS,validatePressureSore,type PressureSoreValues} from '@/lib/pressureSore';
type Department={id:number;Department:string};
export default function PressureSoreModal({isOpen,onClose,departmentId,departmentName,onSuccess}:{isOpen:boolean;onClose:()=>void;departmentId:string|number;departmentName?:string;onSuccess?:()=>void}){
 const [values,setValues]=useState<PressureSoreValues>({...emptyPressureSore}),[departments,setDepartments]=useState<Department[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const [mode,setMode]=useState<'incident'|'monthly'>('incident');
 const root=useRef<HTMLDivElement>(null),saving=useRef(false);
 useEffect(()=>setReady(true),[]);
 useEffect(()=>{if(!isOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const controller=new AbortController();
 fetch(`/api/pressure-sores?options=departments&department_id=${encodeURIComponent(String(departmentId))}`,{cache:'no-store',signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'โหลดหน่วยงานไม่สำเร็จ');setDepartments(body.items||[]);}).catch(error=>{if(error.name!=='AbortError')setMessage(error.message);});
 return()=>{document.body.style.overflow=previous;controller.abort();};},[isOpen,departmentId]);
 const change=(key:keyof PressureSoreValues,value:string)=>setValues(previous=>({...previous,[key]:value,...(key==='discharge_status'&&value!=='ย้าย'?{transfer_department_id:''}:{})}));
 function showError(key:string,text:string){setMessage(text);const field=Array.from(root.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-pressure-field]')||[]).find(e=>e.dataset.pressureField===key);if(field){field.setCustomValidity(text);field.scrollIntoView({block:'center'});field.focus();field.reportValidity();}}
 async function save(){if(saving.current)return;setMessage('');root.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-pressure-field]').forEach(e=>e.setCustomValidity(''));
 const issue=validatePressureSore(values);if(issue){showError(issue.field,issue.message);return;}
 saving.current=true;setBusy(true);
 try{const response=await fetch('/api/pressure-sores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,department_id:Number(departmentId)})});const body=await response.json().catch(()=>null);if(!response.ok){if(body?.field){showError(body.field,body.error);return;}throw new Error(body?.error||`HTTP ${response.status}`);}
 window.alert('บันทึก Pressure sore สำเร็จ — รออนุมัติ');window.dispatchEvent(new Event('pressure-sore-updated'));setValues({...emptyPressureSore});onClose();onSuccess?.();
 }catch(e){setMessage(e instanceof Error?e.message:'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบรายการก่อนบันทึกซ้ำ');}finally{saving.current=false;setBusy(false);}}
 if(!ready||!isOpen)return null;
 const fieldRows:(keyof PressureSoreValues)[][]=[['hn','an','sex','age'],['diagnosis','admitted_date','admission_bs','admission_pressure_sore'],['wound_found_date','found_bs','wound_site','wound_level'],['discharge_status','transfer_department_id','wound_outcome']];
 const options:Partial<Record<keyof PressureSoreValues,readonly string[]>>={sex:['ชาย','หญิง','อื่นๆ/ไม่ระบุ'],admission_pressure_sore:['มี','ไม่มี'],wound_level:PRESSURE_LEVELS,discharge_status:['จำหน่าย','ย้าย'],wound_outcome:['หาย','ไม่หาย']};
 return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label="บันทึก Pressure sore" onInputCapture={event=>{const e=event.target;if(e instanceof HTMLInputElement||e instanceof HTMLSelectElement)e.setCustomValidity('');}} className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-3">
 <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between bg-teal-800 px-4 py-2 text-white"><div><h2 className="text-xl font-bold">บันทึกข้อมูล Pressure sore</h2><p className="mt-1 text-sm text-teal-100">หน่วยงาน: {departmentName || '—'}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="ปิด" className="flex h-10 w-10 items-center justify-center rounded-lg text-3xl hover:bg-white/10 disabled:opacity-50">×</button></header>
 <nav aria-label="ส่วนของแบบบันทึก Pressure sore" className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-5 pt-2"><button type="button" aria-pressed={mode==='incident'} disabled={busy} onClick={()=>setMode('incident')} className={`flex-1 rounded-t-xl border px-4 py-2 text-sm font-bold ${mode==='incident'?'border-slate-200 bg-white text-teal-800 shadow-sm':'border-transparent text-slate-500 hover:text-teal-800'}`}>ส่วนที่ 1: บันทึกรายผู้ป่วย/อุบัติการณ์ (บันทึกทุกครั้งที่พบแผลกดทับใหม่/แผลเดิมแย่ลง)</button><button type="button" aria-pressed={mode==='monthly'} disabled={busy} onClick={()=>setMode('monthly')} className={`flex-1 rounded-t-xl border px-4 py-2 text-sm font-bold ${mode==='monthly'?'border-slate-200 bg-white text-teal-800 shadow-sm':'border-transparent text-slate-500 hover:text-teal-800'}`}>ส่วนที่ 2: บันทึกสรุปรายเดือน (บันทึกเดือนละ 1 ครั้ง)</button></nav>
 {mode==='monthly'?<main className="min-h-0 flex-1 overflow-y-auto p-4"><PressureSoreMonthlyForm departmentId={departmentId} onClose={onClose} onSuccess={onSuccess}/></main>:<><main className="min-h-0 flex-1 overflow-y-auto p-4"><div className="space-y-3">{fieldRows.map((row,rowIndex)=><div key={rowIndex} className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${rowIndex===0?'rounded-2xl border border-teal-100 bg-teal-50/50 p-3':''}`}>{row.map(key=>{
 const label=pressureFields.find(([field])=>field===key)![1];
 if(key==='transfer_department_id'&&values.discharge_status!=='ย้าย')return null;
 const required=key!=='discharge_status';
 const cls='mt-1 block h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-emerald-600';
 return <label key={key} className="text-sm font-semibold text-slate-700 leading-6">{label}{required&&<span className="ml-1 text-red-500">*</span>}
 {key==='transfer_department_id'?<select data-pressure-field={key} required value={values[key]} onChange={e=>change(key,e.target.value)} disabled={busy} className={cls}><option value="">เลือกหน่วยงานรับย้าย</option>{departments.map(d=><option key={d.id} value={d.id}>{d.Department}</option>)}</select>:
 options[key]?<select data-pressure-field={key} required={required} value={values[key]} onChange={e=>change(key,e.target.value)} disabled={busy} className={cls}><option value="">{key==='discharge_status'?'เลือกเมื่อจำหน่าย/ย้าย':'เลือก'+label}</option>{options[key]?.map(option=><option key={option} value={option}>{option}</option>)}</select>:
 <input data-pressure-field={key} required={required} type={key.includes('date')?'date':['age','admission_bs','found_bs'].includes(key)?'number':'text'} min={['age','admission_bs','found_bs'].includes(key)?0:undefined} step={['age','admission_bs','found_bs'].includes(key)?1:undefined} value={values[key]} onChange={e=>change(key,e.target.value)} disabled={busy} maxLength={500} className={cls}/>}
 </label>;
 })}</div>)}</div></main>
 <footer className="shrink-0 border-t px-4 py-2"><p role="status" aria-live="polite" className="mb-2 text-sm text-red-700">{message}</p><div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2">ปิด</button><button type="button" disabled={busy} onClick={()=>void save()} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy?'กำลังบันทึก…':'บันทึกข้อมูล — รออนุมัติ'}</button></div></footer></>}</div>
 </div>,document.body);
}
