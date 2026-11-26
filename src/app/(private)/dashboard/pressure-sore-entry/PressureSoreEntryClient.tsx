'use client';
import {useState} from 'react';
import PressureSoreModal from '@/components/PressureSoreModal';
import PressureSorePendingRows from '@/components/PressureSorePendingRows';
export default function PressureSoreEntryClient({departments}:{departments:{id:number;name:string}[]}){
 const [dept,setDept]=useState(''),[open,setOpen]=useState(false),[counts,setCounts]=useState({pending:0,total:0}),[reload,setReload]=useState(0);
 const current=departments.find(d=>String(d.id)===dept);
 return <div className="space-y-4">
  <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
   <h1 className="text-xl font-bold text-emerald-950">บันทึก Pressure sore</h1>
   <p className="mt-1 text-sm text-slate-500">บันทึกได้ทุกหน่วยงานที่เปิดใช้ Pressure sore • หัวหน้าหน่วยงานเป็นผู้อนุมัติ</p>
   <div className="mt-4 flex flex-wrap items-end gap-3">
    <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">หน่วยงาน</span>
     <select value={dept} onChange={e=>{setDept(e.target.value);setCounts({pending:0,total:0});}} className="min-w-[240px] rounded-xl border px-3 py-2">
      <option value="">-- เลือกหน่วยงาน --</option>
      {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
     </select></label>
    <button type="button" disabled={!dept} onClick={()=>setOpen(true)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">+ บันทึก Pressure sore</button>
    {dept&&<span className="text-sm text-slate-500">รายการรออนุมัติ {counts.pending} รายการ</span>}
   </div>
  </section>
  {dept&&<section className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
   <table className="w-full text-left text-sm"><thead className="bg-amber-50 text-amber-900"><tr>
    {['ประเภทระบบ','ประจำเดือน','จำนวน','ผู้บันทึก','สถานะ','จัดการ'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead>
   <tbody className="divide-y divide-slate-100">
    {counts.total===0&&<tr><td colSpan={6} className="p-3 text-slate-500">ยังไม่มีรายการ Pressure sore รออนุมัติของหน่วยงานนี้</td></tr>}
    <PressureSorePendingRows key={dept+':'+reload} departmentId={dept} onCountsChange={setCounts}/>
   </tbody></table></section>}
  {dept&&<PressureSoreModal isOpen={open} onClose={()=>{setOpen(false);setReload(n=>n+1);}} departmentId={dept} departmentName={current?.name} onSuccess={()=>setReload(n=>n+1)}/>}
 </div>;
}
