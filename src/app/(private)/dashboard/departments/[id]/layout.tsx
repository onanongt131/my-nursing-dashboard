import Link from 'next/link';
import {currentUser,db} from '@/lib/audits/chartServer';
import {redirect} from 'next/navigation';
export default async function UnitAccessLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)redirect('/login');
 const {id}=await params;
 if(user.role==='staff'){
  if(!user.departmentIds.length)return <div className="p-6 text-red-700">บัญชียังไม่ได้ผูกหน่วยงาน กรุณาติดต่อผู้ดูแลระบบ</div>;
  if(!user.departmentIds.includes(Number(id)))redirect(`/dashboard/departments/${user.departmentId??user.departmentIds[0]}`);
 }
 // หัวหน้า/บุคลากรที่ดูแลหลายหน่วยงาน: แถบสลับหน่วยงาน
 if(user.departmentIds.length>1){
  const {data}=await db().from('departments').select('id,Department').in('id',user.departmentIds);
  const names=new Map((data||[]).map((d:{id:number;Department:string})=>[Number(d.id),d.Department]));
  return <>
   <nav aria-label="สลับหน่วยงานของฉัน" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm">
    <span className="font-semibold text-teal-900">หน่วยงานของฉัน:</span>
    {user.departmentIds.map(d=><Link key={d} href={`/dashboard/departments/${d}`} aria-current={String(d)===id?'page':undefined}
     className={'rounded-full border px-3 py-1 '+(String(d)===id?'border-teal-700 bg-teal-700 text-white':'border-teal-200 text-teal-800 hover:bg-teal-50')}>
     {names.get(d)||`หน่วยงาน ${d}`}{d===user.departmentId?' (หลัก)':''}</Link>)}
   </nav>
   {children}
  </>;
 }
 return children;
}
