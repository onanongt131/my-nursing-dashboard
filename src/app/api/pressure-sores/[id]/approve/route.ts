import {requiresReview} from '@/lib/review/period';
import {isPressureSoreIpd} from '@/lib/pressureSoreServer';
import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canApprove,fail,unexpected,validId} from '@/lib/audits/chartServer';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(_request:NextRequest,context:{params:Promise<{id:string}>}){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const {id}=await context.params;if(!validId(id))return fail('ID ไม่ถูกต้อง');
 const {data:item,error}=await db().from('pressure_sore_incident_records').select('id,department_id,status,created_by,wound_found_date').eq('id',id).maybeSingle();
 if(error)return unexpected(error);if(!item)return fail('ไม่พบรายการ',404);if(!requiresReview(item))return fail('ข้อมูลก่อนปีงบประมาณ 2570 ไม่ต้องอนุมัติ',409);
 if(!canApprove(user,item.department_id)||item.created_by===user.id)return fail('ไม่มีสิทธิ์อนุมัติ หรือเป็นรายการของตนเอง',403);
 if(!await isPressureSoreIpd(item.department_id))return fail('Pressure sore ใช้เฉพาะ IPD',403);
 if(item.status!=='pending')return fail('อนุมัติได้เฉพาะรายการรออนุมัติ',409);
 const {data,error:updateError}=await db().from('pressure_sore_incident_records').update({status:'approved',approved_by:user.id,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('status','pending').select('id,status').maybeSingle();
 if(updateError)return unexpected(updateError);if(!data)return fail('สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่',409);
 return NextResponse.json({item:data},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
