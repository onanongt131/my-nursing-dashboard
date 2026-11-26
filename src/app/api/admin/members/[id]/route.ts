import {NextRequest,NextResponse} from 'next/server';
import {isPendingMember} from '@/lib/members/status';
import {currentUser,db,fail,unexpected,validId} from '@/lib/audits/chartServer';
import {cleanExtraDepartments} from '@/lib/members/departments';
import { invalidateDepartmentKpi } from '@/lib/kpiCache'; // ← เพิ่ม
export const dynamic='force-dynamic';
async function handle(request:NextRequest,context:{params:Promise<{id:string}>},remove:boolean){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return fail('แหล่งที่มาคำขอไม่ถูกต้อง',403);
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);if(user.role!=='admin')return fail('เฉพาะผู้ดูแลระบบ',403);
 const {id}=await context.params;if(!validId(id)||id===user.id)return fail('ไม่สามารถดำเนินการกับบัญชีนี้');
 const {data:profile,error}=await db().from('profiles').select('id,status,role,department_id').eq('id',id).maybeSingle();if(error)throw error;if(!profile)return fail('ไม่พบสมาชิก',404);
 if(!isPendingMember(profile.status))return fail('รายการนี้ไม่ได้อยู่ระหว่างรออนุมัติ กรุณาโหลดใหม่',409);
 if(!remove){if(!['staff','head_department','head_group','head_nurse','admin'].includes(profile.role))return fail('กรุณากำหนดบทบาทของสมาชิกก่อนอนุมัติ');if(profile.role==='staff'&&(!Number.isSafeInteger(Number(profile.department_id))||Number(profile.department_id)<=0))return fail('กรุณาผูกหน่วยงานให้ staff ก่อนอนุมัติ');}
 // อนุมัติพร้อมกำหนดหน่วยงานที่ดูแลเพิ่ม (ถ้าส่งมา)
 const body=remove?null:await request.json().catch(()=>null);
 const update:Record<string,unknown>={status:'approved'};
 if(body&&Array.isArray(body.extra_department_ids)){const extra=cleanExtraDepartments(body.extra_department_ids,profile.department_id);if(!extra)return fail('หน่วยงานที่ดูแลเพิ่มไม่ถูกต้อง');update.extra_department_ids=extra;}
 let q=remove?db().from('profiles').delete():db().from('profiles').update(update);
 q=q.eq('id',id);q=profile.status===null?q.is('status',null):q.eq('status',profile.status);
 const {data:changed,error:changeError}=await q.select('id');if(changeError){if(/extra_department_ids/.test(String(changeError.message||'')))return fail('ยังไม่ได้เพิ่มคอลัมน์ extra_department_ids ใน Supabase กรุณารัน SQL ก่อน',409);throw changeError;}if(!changed?.length)return fail('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่',409);
 invalidateDepartmentKpi();
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
export function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){return handle(request,context,false);}
export function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){return handle(request,context,true);}
