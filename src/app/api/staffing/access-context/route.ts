import {auth} from '@/auth';
import {db} from '@/lib/audits/chartServer';
import {getVisibleDepartments,type UserProfile} from '@/lib/permissions/staffingAccess';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 try{
  const session=await auth(),email=session?.user?.email?.trim();
  if(!email)return reply({error:'กรุณาเข้าสู่ระบบใหม่'},401);
  const client=db();
  // Identity comes only from the verified session, never a browser-supplied email.
  const {data:row,error}=await client.from('profiles').select('id,full_name,department_id,role,email,status').eq('email',email).maybeSingle();
  if(error){console.error('staffing profile read failed',{code:error.code});return reply({error:'อ่านโปรไฟล์ไม่สำเร็จ กรุณาตรวจสิทธิ์และโครงสร้างตาราง profiles'},503);}
  if(!row)return reply({error:'ไม่พบโปรไฟล์ของบัญชีที่เข้าสู่ระบบ กรุณาให้ผู้ดูแลตรวจ email ใน profiles'},404);
  if(row.status!=='approved')return reply({error:'บัญชีนี้ยังไม่ได้รับอนุมัติ'},403);
  const profile:UserProfile={id:row.id,full_name:row.full_name??null,department_id:row.department_id??null,role:row.role??null,email:row.email??null};
  const {data:rows,error:de}=await client.from('departments').select('id,Department,group').order('Department',{ascending:true});
  if(de){console.error('staffing department read failed',{code:de.code});return reply({error:'อ่านหน่วยงานไม่สำเร็จ'},503);}
  const group=rows?.find(d=>Number(d.id)===Number(profile.department_id))?.group??null;
  // A missing group must not grant access to every ungrouped department.
  const departments=getVisibleDepartments(rows||[],profile,group);
  return reply({profile,group,departments});
 }catch{console.error('staffing access context failed');return reply({error:'โหลดสิทธิ์ตารางเวรไม่สำเร็จ กรุณาตรวจการตั้งค่าฝั่ง server'},503);}
}
