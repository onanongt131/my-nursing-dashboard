'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import BatchDetailModal from '@/components/BatchDetailModal';
import { specialUnitAuditForms, isSpecialUnitForm } from '@/lib/specialUnitAuditForms';
const unitName=(type:string)=>isSpecialUnitForm(type)?specialUnitAuditForms[type].name:'ห้องคลอด';
type Item = {id:string;department_id:number;form_type:string;audit_month:string;reference_number?:string;auditor_name?:string;created_by:string;status:string;notes?:string;answers:Record<string,{score?:number;na?:boolean;note?:string}>};
export default function SpecialAuditApprovalPanel({departmentId,onCountsChange}:{departmentId:string|number;onCountsChange?:(counts:{pending:number;total:number})=>void}) {
 const [items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null);
 const [canApprove,setCanApprove]=useState(false),[userId,setUserId]=useState('');
 const [loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const generation=useRef(0);
 const load=useCallback(async()=>{
  const token=++generation.current;setLoading(true);
  try {
   const responses=await Promise.all(['pending','draft'].map(async status=>{
    const response=await fetch(`/api/audits?department_id=${encodeURIComponent(String(departmentId))}&status=${status}&limit=100`,{cache:'no-store'});
    const body=await response.json();if(!response.ok)throw new Error(body.error||`HTTP ${response.status}`);return body;
   }));
   if(token!==generation.current)return;
   setItems(responses.flatMap(b=>b.items||[]).filter((i:Item)=>['lr','dialysis','er','anesthesia','hbot'].includes(i.form_type)));
   setCanApprove(responses[0].can_approve===true);setUserId(responses[0].user_id||'');
  }catch(e){if(token===generation.current)setMessage(e instanceof Error?e.message:'โหลดรายการไม่สำเร็จ');}
  finally{if(token===generation.current)setLoading(false);}
 },[departmentId]);
 useEffect(()=>{setItems([]);setSelected(null);setMessage('');void load();return()=>{generation.current++;};},[load]);
 // Reload once after a modal closes, without background polling.
 useEffect(()=>{const refresh=()=>void load();window.addEventListener('audit-records-updated',refresh);return()=>window.removeEventListener('audit-records-updated',refresh);},[load]);
 const pending=items.filter(i=>i.status==='pending').length;
 useEffect(()=>{onCountsChange?.({pending,total:items.length});},[pending,items.length,onCountsChange]);
 return <>
  {message&&<tr><td colSpan={6} className="p-3 text-sm text-emerald-800" role="status">{message}</td></tr>}
  {items.map(i=><tr key={i.id} className="border-b hover:bg-slate-50">
   <td className="p-3 font-bold">AUDIT {unitName(i.form_type)}</td><td className="p-3">{i.audit_month}</td><td className="p-3">1 รายการ</td><td className="p-3">{i.auditor_name||'-'}</td>
   <td className="p-3 text-center"><span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">{i.status==='pending'?'รออนุมัติ':'ฉบับร่าง'}</span></td>
   <td className="p-3 text-center"><button type="button" onClick={()=>setSelected(i)} className="rounded-lg bg-sky-600 px-3 py-2 text-white">ตรวจสอบ</button></td>
  </tr>)}
  <tr><td colSpan={6} className="p-2 text-right"><button type="button" onClick={()=>void load()} disabled={loading} className="rounded-lg border px-3 py-2 text-xs">{loading?'กำลังโหลด Audit เฉพาะหน่วยงาน…':'โหลด Audit เฉพาะหน่วยงานใหม่'}</button></td></tr>
  {selected&&<tr><td colSpan={6}>
    <BatchDetailModal
      isOpen={true}
      onClose={()=>setSelected(null)}
      batchGroup={{type:`audit_${selected.form_type}`,audit_month:selected.audit_month,items:[{...selected,source_table:'nso_special_audits'}],auditor_name:selected.auditor_name}}
      departmentName={unitName(selected.form_type)}
      canApprove={canApprove&&selected.created_by!==userId}
      onApprove={()=>{setSelected(null);void load();}}
    />
  </td></tr>}
 </>;
}
