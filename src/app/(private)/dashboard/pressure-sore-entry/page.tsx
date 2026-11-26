import {redirect} from 'next/navigation';
import {currentUser,db,PRESSURE_SORE_ALL} from '@/lib/audits/chartServer';
import PressureSoreEntryClient from './PressureSoreEntryClient';
export const dynamic='force-dynamic';
/** บันทึก Pressure sore ได้ทุกหน่วยงาน (สิทธิ์ pressure_sore_all) โดยไม่เปิดส่วนอื่นของหน่วยงาน */
export default async function PressureSoreEntryPage(){
 const user=await currentUser();if(!user)redirect('/login?callbackUrl=%2Fdashboard%2Fpressure-sore-entry');
 const allowed=user.permissions.includes(PRESSURE_SORE_ALL)||['admin','head_nurse'].includes(user.role);
 if(!allowed)return <section className="rounded-xl bg-white p-6 text-sm text-slate-600">บัญชีนี้ไม่มีสิทธิ์บันทึก Pressure sore ทุกหน่วยงาน กรุณาติดต่อผู้ดูแลระบบ</section>;
 const {data,error}=await db().from('departments').select('id,Department,pressure_sore_enabled').eq('pressure_sore_enabled',true).order('Department');
 if(error)return <section className="rounded-xl bg-white p-6 text-sm text-red-700">อ่านรายชื่อหน่วยงานไม่สำเร็จ</section>;
 return <PressureSoreEntryClient departments={(data||[]).map((d:{id:number;Department:string})=>({id:Number(d.id),name:d.Department}))}/>;
}
