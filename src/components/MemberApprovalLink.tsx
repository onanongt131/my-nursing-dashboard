"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
export default function MemberApprovalLink(){
 const pathname=usePathname(),[count,setCount]=useState<number|null>(null),[error,setError]=useState(false);
 useEffect(()=>{
  let controller:AbortController|undefined,disposed=false;
  async function refresh(){controller?.abort();const active=new AbortController();controller=active;
   try{const response=await fetch('/api/admin/members?count=1',{cache:'no-store',signal:active.signal});const result=await response.json();if(!response.ok)throw new Error();if(!disposed&&!active.signal.aborted){setCount(result.count);setError(false);}}
   catch{if(!disposed&&!active.signal.aborted){setCount(null);setError(true);}}
  }
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  void refresh();window.addEventListener('focus',refresh);window.addEventListener('members-updated',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{disposed=true;controller?.abort();window.removeEventListener('focus',refresh);window.removeEventListener('members-updated',refresh);document.removeEventListener('visibilitychange',visible);};
 },[pathname]);
 return <Link href="/dashboard/admin/approve-members" title={error?'อ่านจำนวนรออนุมัติไม่สำเร็จ คลิกเพื่อตรวจสอบ':`รออนุมัติ ${count??'…'} รายการ`} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-900">อนุมัติสมาชิก{count!==null&&count>0&&<span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white" aria-label={`รออนุมัติ ${count} รายการ`}>{count}</span>}{error&&<span className="text-amber-700" aria-label="อ่านจำนวนรออนุมัติไม่สำเร็จ">!</span>}</Link>;
}
