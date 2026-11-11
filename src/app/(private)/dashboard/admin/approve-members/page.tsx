"use client";
import {useEffect,useState} from 'react';
type Member={id:string;full_name:string|null;email:string|null;status:string|null;role:string|null;department_id:number|null};
export default function ApproveMembersPage(){
 const [users,setUsers]=useState<Member[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<{id:string;remove:boolean}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function refresh(signal?:AbortSignal){setLoading(true);setError('');try{const response=await fetch('/api/admin/members',{cache:'no-store',signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'อ่านรายชื่อไม่สำเร็จ');if(!signal?.aborted)setUsers(result.items||[]);}catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'อ่านรายชื่อไม่สำเร็จ');}finally{if(!signal?.aborted)setLoading(false);}}
 useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[]);
 async function updateMember(member: Member, remove = false) {
  if (busy) return;
  if (remove && !window.confirm(`ลบคำขอสมัครของ ${member.full_name || member.email || 'สมาชิกนี้'} หรือไม่?`)) return;
  const action = remove ? 'ลบคำขอสมัคร' : 'อนุมัติสมาชิก';
  setBusy({id:member.id,remove});
  setError('');
  setMessage('');
  try {
   const response = await fetch(`/api/admin/members/${encodeURIComponent(member.id)}`, {method:remove ? 'DELETE' : 'PATCH'});
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
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div><h1 className="text-xl font-bold text-emerald-950">อนุมัติสมาชิกใหม่</h1><p className="mt-1 text-sm text-gray-500">รายชื่อที่สถานะว่างหรือรออนุมัติ</p></div><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">รออนุมัติ: {loading?'…':error?'ตรวจสอบไม่สำเร็จ':users.length} รายการ</span><button onClick={()=>void refresh()} disabled={loading||!!busy} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">โหลดใหม่</button></div></div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
  <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-emerald-900 text-white"><tr>{['ชื่อ-นามสกุล','อีเมล','สถานะ','จัดการ'].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody className="divide-y">{loading?<tr><td colSpan={4} className="p-8 text-center">กำลังโหลดข้อมูล…</td></tr>:error&&users.length===0?<tr><td colSpan={4} className="p-8 text-center text-red-700">ไม่สามารถตรวจสอบรายชื่อได้ กรุณาโหลดใหม่</td></tr>:users.length===0?<tr><td colSpan={4} className="p-8 text-center text-gray-500">ไม่มีรายชื่อที่รอการอนุมัติในขณะนี้</td></tr>:users.map(user=><tr key={user.id}><td className="p-3">{user.full_name||'-'}</td><td className="p-3">{user.email||'-'}</td><td className="p-3"><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">รออนุมัติ</span></td><td className="p-3"><div className="flex items-center gap-2 whitespace-nowrap"><button onClick={()=>void updateMember(user)} disabled={!!busy} className="rounded-xl bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy?.id===user.id&&!busy.remove?'กำลังอนุมัติ…':'อนุมัติสิทธิ์'}</button><button type="button" onClick={()=>void updateMember(user,true)} disabled={!!busy} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">{busy?.id===user.id&&busy.remove?'กำลังลบ…':'ลบ'}</button></div></td></tr>)}</tbody></table></div>
 </div>;
}
