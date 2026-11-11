import {NextRequest} from 'next/server';
import {currentUser,canApprove,db,fail,unexpected} from '@/lib/audits/chartServer';
import {requiresReview} from '@/lib/review/period';
export const dynamic='force-dynamic';
const tables = [
 'nursing_chart_audits', 'wp_qa_records', 'nso_special_wp_records',
 'iv_care_complications', 'iv_care_monthly_summaries',
 'fall_incident_records', 'fall_monthly_summary',
 'readmit_incident_records', 'readmit_monthly_summary',
 'ama_incident_records', 'ama_monthly_summary',
];
export async function POST(request:NextRequest){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return fail('แหล่งที่มาคำขอไม่ถูกต้อง',403);
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const raw=await request.text();if(raw.length>20000)return fail('ข้อมูลใหญ่เกินกำหนด',413);let body;try{body=JSON.parse(raw);}catch{return fail('ข้อมูลไม่ถูกต้อง');}
 if(!body||!tables.includes(body.table)||!Array.isArray(body.ids)||!body.ids.length||body.ids.length>200||body.ids.some((id:unknown)=>!['string','number'].includes(typeof id)||!/^[A-Za-z0-9-]{1,80}$/.test(String(id))))return fail('รายการอนุมัติไม่ถูกต้อง');
 const ids=[...new Set<string>(body.ids.map(String))];const {data:rows,error}=await db().from(body.table).select('*').in('id',ids);if(error)return fail('อ่านรายการก่อนอนุมัติไม่สำเร็จ',503);if(!rows||rows.length!==ids.length)return fail('บางรายการไม่พบ กรุณาโหลดใหม่',409);
 for(const row of rows){if(!canApprove(user,Number(row.department_id)))return fail('ไม่มีสิทธิ์อนุมัติหน่วยงานนี้',403);if(row.status!=='pending'||!requiresReview(row))return fail('รายการไม่อยู่ในสถานะหรือรอบปีที่รออนุมัติ กรุณาโหลดใหม่',409);}
 const departments=[...new Set(rows.map((r:any)=>r.department_id))];if(departments.length!==1)return fail('อนุมัติได้ครั้งละหน่วยงาน');
 const {data:updated,error:writeError}=await db().from(body.table).update({status:'approved'}).in('id',ids).eq('department_id',departments[0]).eq('status','pending').select('id,status');if(writeError)return fail('บันทึกอนุมัติไม่สำเร็จ',503);if(!updated||updated.length!==ids.length||updated.some(row=>row.status!=='approved')||ids.some(id=>!updated.some(row=>String(row.id)===id)))return fail('บางรายการเปลี่ยนไปแล้ว กรุณาโหลดสถานะล่าสุด',409);
 return Response.json({approved:updated.length},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return unexpected(e);}}
