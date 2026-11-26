"use client";
import {useEffect,useState} from 'react';
import {createClient} from '@/utils/supabase/client';
type Member={id:string;full_name:string|null;email:string|null;status:string|null;role:string|null;department_id:number|null;extra_department_ids?:number[]|null;permissions?:string[]|null};
type Dept={id:number;Department:string};
/** เลือกหน่วยงานที่ดูแลเพิ่ม: ป้ายหน่วยงาน (กด × เพื่อเอาออก) + ช่องเลือกเพิ่ม */
function DeptPicker({value,onChange,departments,primary,disabled}:{value:number[];onChange:(v:number[])=>void;departments:Dept[];primary:number|null;disabled?:boolean}){
 const name=(id:number)=>departments.find(d=>Number(d.id)===id)?.Department||`หน่วยงาน ${id}`;
 return <div className="flex flex-wrap items-center gap-1">
  {value.map(id=><span key={id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">{name(id)}<button type="button" disabled={disabled} aria-label={'เอา '+name(id)+' ออก'} onClick={()=>onChange(value.filter(x=>x!==id))} className="text-teal-600 hover:text-red-600">×</button></span>)}
  <select disabled={disabled} value="" onChange={e=>{const id=Number(e.target.value);if(id&&!value.includes(id))onChange([...value,id]);}} className="rounded-lg border px-2 py-1 text-xs">
   <option value="">+ เพิ่มหน่วยงาน</option>
   {departments.filter(d=>Number(d.id)!==Number(primary)&&!value.includes(Number(d.id))).map(d=><option key={d.id} value={d.id}>{d.Department}</option>)}
  </select>
 </div>;
}
export default function ApproveMembersPage(){
 const [users,setUsers]=useState<Member[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<{id:string;remove:boolean}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [departments,setDepartments]=useState<Dept[]>([]),[extras,setExtras]=useState<Record<string,number[]>>({});
 const [perms,setPerms]=useState<Record<string,string[]>>({}),[query,setQuery]=useState(''),[found,setFound]=useState<Member[]>([]),[searching,setSearching]=useState(false),[saving,setSaving]=useState('');
 useEffect(()=>{createClient().from('departments').select('id,Department').order('Department').then(({data}:{data:unknown})=>setDepartments((data||[]) as Dept[]));},[]);
 const deptName=(id:number|null)=>id==null?'-':departments.find(d=>Number(d.id)===Number(id))?.Department||`หน่วยงาน ${id}`;
 async function refresh(signal?:AbortSignal){setLoading(true);setError('');try{const response=await fetch('/api/admin/members',{cache:'no-store',signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'อ่านรายชื่อไม่สำเร็จ');if(!signal?.aborted){setUsers(result.items||[]);setExtras(Object.fromEntries((result.items||[]).map((m:Member)=>[m.id,(m.extra_department_ids||[]).map(Number)])));}}catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'อ่านรายชื่อไม่สำเร็จ');}finally{if(!signal?.aborted)setLoading(false);}}
 useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[]);
 async function updateMember(member: Member, remove = false) {
  if (busy) return;
  if (remove && !window.confirm(`ลบคำขอสมัครของ ${member.full_name || member.email || 'สมาชิกนี้'} หรือไม่?`)) return;
  const action = remove ? 'ลบคำขอสมัคร' : 'อนุมัติสมาชิก';
  setBusy({id:member.id,remove});
  setError('');
  setMessage('');
  try {
   const response = await fetch(`/api/admin/members/${encodeURIComponent(member.id)}`, remove ? {method:'DELETE'} : {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({extra_department_ids:extras[member.id]||[]})});
   const result = await response.json();
   if (!response.ok) throw new Error(result.error || `${action}ไม่สำเร็จ`);
   setUsers(rows => rows.filter(row => row.id !== member.id));
   setMessage(`${action}เรียบร้อยแล้ว`);
   window.dispatchEvent(new Event('members-updated'));
  } catch (error) {
   setError(error instanceof Error ? error.message : `${action}ไม่สำเร็จ`);
  } finally {
   setBusy(null);
  }
 }
 async function search(){setSearching(true);setError('');setMessage('');try{const r=await fetch('/api/admin/member-departments?'+new URLSearchParams({q:query}),{cache:'no-store'});const b=await r.json();if(!r.ok)throw new Error(b.error||'ค้นหาไม่สำเร็จ');setFound(b.items||[]);setPerms(x=>({...x,...Object.fromEntries((b.items||[]).map((m:Member)=>[m.id,(m.permissions||[]).map(String)]))}));setExtras(x=>({...x,...Object.fromEntries((b.items||[]).map((m:Member)=>[m.id,(m.extra_department_ids||[]).map(Number)]))}));if(!(b.items||[]).length)setMessage('ไม่พบสมาชิกที่ตรงกับคำค้น');}catch(e){setError(e instanceof Error?e.message:'ค้นหาไม่สำเร็จ');}finally{setSearching(false);}}
 async function saveExtra(member:Member){setSaving(member.id);setError('');setMessage('');try{const r=await fetch('/api/admin/member-departments',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:member.id,extra_department_ids:extras[member.id]||[],permissions:perms[member.id]||[]})});const b=await r.json();if(!r.ok)throw new Error(b.error||'บันทึกไม่สำเร็จ');setMessage('บันทึกหน่วยงานของ '+(member.full_name||member.email||'สมาชิก')+' แล้ว • มีผลเมื่อผู้ใช้โหลดหน้าใหม่');}catch(e){setError(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setSaving('');}}
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div><h1 className="text-xl font-bold text-emerald-950">อนุมัติสมาชิกใหม่</h1><p className="mt-1 text-sm text-gray-500">รายชื่อที่สถานะว่างหรือรออนุมัติ</p></div><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">รออนุมัติ: {loading?'…':error?'ตรวจสอบไม่สำเร็จ':users.length} รายการ</span><button onClick={()=>void refresh()} disabled={loading||!!busy} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">โหลดใหม่</button></div></div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
  <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-emerald-900 text-white"><tr>{['ชื่อ-นามสกุล','อีเมล','หน่วยงานหลัก','หน่วยงานที่ดูแลเพิ่ม','สถานะ','จัดการ'].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={6} className="p-8 text-center">กำลังโหลดข้อมูล…</td></tr>:error&&users.length===0?<tr><td colSpan={6} className="p-8 text-center text-red-700">ไม่สามารถตรวจสอบรายชื่อได้ กรุณาโหลดใหม่</td></tr>:users.length===0?<tr><td colSpan={6} className="p-8 text-center text-gray-500">ไม่มีรายชื่อที่รอการอนุมัติในขณะนี้</td></tr>:users.map(user=><tr key={user.id}><td className="p-3">{user.full_name||'-'}</td><td className="p-3">{user.email||'-'}</td><td className="p-3">{deptName(user.department_id)}</td><td className="p-3"><DeptPicker value={extras[user.id]||[]} onChange={v=>setExtras(x=>({...x,[user.id]:v}))} departments={departments} primary={user.department_id} disabled={!!busy}/></td><td className="p-3"><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">รออนุมัติ</span></td><td className="p-3"><div className="flex items-center gap-2 whitespace-nowrap"><button onClick={()=>void updateMember(user)} disabled={!!busy} className="rounded-xl bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy?.id===user.id&&!busy.remove?'กำลังอนุมัติ…':'อนุมัติสิทธิ์'}</button><button type="button" onClick={()=>void updateMember(user,true)} disabled={!!busy} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">{busy?.id===user.id&&busy.remove?'กำลังลบ…':'ลบ'}</button></div></td></tr>)}</tbody></table></div>
  <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
   <div><h2 className="font-bold text-emerald-950">หน่วยงานที่ดูแลเพิ่ม และสิทธิ์พิเศษ (สมาชิกที่อนุมัติแล้ว)</h2><p className="mt-1 text-sm text-gray-500">ค้นหาด้วยชื่อหรืออีเมล • หน่วยงานที่ดูแลเพิ่ม = สิทธิ์เหมือนหน่วยงานของตัวเอง • "บันทึก Pressure sore ทุกหน่วยงาน" = บันทึกได้เฉพาะ Pressure sore ทุกหน่วยงาน (เมนูตัวชี้วัดรายเดือน) ไม่เข้าส่วนอื่น ไม่มีสิทธิ์อนุมัติ • กดบันทึก</p></div>
   <form onSubmit={e=>{e.preventDefault();void search();}} className="flex flex-wrap gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ชื่อหรืออีเมล" className="min-w-[220px] flex-1 rounded-xl border px-3 py-2 text-sm"/><button disabled={searching||query.trim().length<2} className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{searching?'กำลังค้นหา…':'ค้นหา'}</button></form>
   {found.length>0&&<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['ชื่อ-นามสกุล','อีเมล','บทบาท','หน่วยงานหลัก','หน่วยงานที่ดูแลเพิ่ม','สิทธิ์พิเศษ',''].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody className="divide-y">{found.map(m=><tr key={m.id}><td className="p-2">{m.full_name||'-'}</td><td className="p-2">{m.email||'-'}</td><td className="p-2">{m.role||'-'}</td><td className="p-2">{deptName(m.department_id)}</td><td className="p-2"><DeptPicker value={extras[m.id]||[]} onChange={v=>setExtras(x=>({...x,[m.id]:v}))} departments={departments} primary={m.department_id} disabled={saving===m.id}/></td><td className="p-2"><label className="flex items-center gap-1 whitespace-nowrap text-xs"><input type="checkbox" checked={(perms[m.id]||[]).includes('pressure_sore_all')} disabled={saving===m.id} onChange={e=>setPerms(x=>({...x,[m.id]:e.target.checked?[...(x[m.id]||[]).filter(p=>p!=='pressure_sore_all'),'pressure_sore_all']:(x[m.id]||[]).filter(p=>p!=='pressure_sore_all')}))}/>บันทึก Pressure sore ทุกหน่วยงาน</label></td><td className="p-2"><button type="button" onClick={()=>void saveExtra(m)} disabled={!!saving} className="rounded-xl bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving===m.id?'กำลังบันทึก…':'บันทึก'}</button></td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}
