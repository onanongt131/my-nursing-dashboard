import {NextRequest} from 'next/server';
import {currentUser,canRead,canApprove,db,fail,unexpected} from '@/lib/audits/chartServer';
export const dynamic='force-dynamic';
const tables=['nursing_chart_audits','wp_qa_records','nso_special_wp_records','iv_care_complications','iv_care_monthly_summaries','fall_incident_records','fall_monthly_summary','readmit_incident_records','readmit_monthly_summary','ama_incident_records','ama_monthly_summary'];
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ',401);
 const q=request.nextUrl.searchParams,departmentId=Number(q.get('department_id')),table=q.get('table')||'',offset=Number(q.get('offset')||0);
 if(!Number.isSafeInteger(departmentId)||departmentId<1||(q.get('mode')!=='context'&&!tables.includes(table))||!Number.isSafeInteger(offset)||offset<0||offset>1000000)return fail('คำขออ่านรายการไม่ถูกต้อง');
 if(!await canRead(user,departmentId))return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้',403);
 if(q.get('mode')==='context')return Response.json({role:user.role,departmentId:user.departmentId,canApprove:canApprove(user,departmentId)},{headers:{'Cache-Control':'no-store'}});
 let query=db().from(table).select('*').eq('department_id',departmentId).order('id').range(offset,offset+999);if(q.get('pending')==='true')query=query.eq('status','pending');
 const {data,error}=await query;if(error&&q.get('pending')==='true'&&table.endsWith('_summary')&&error.code==='42703'&&/status/i.test(error.message||''))return Response.json({items:[],hasMore:false,legacySummaryWithoutStatus:true},{headers:{'Cache-Control':'no-store'}});if(error||!Array.isArray(data))return fail('อ่านตาราง '+table+' ไม่สำเร็จ ยังยืนยันยอดรายการไม่ได้',503);
 return Response.json({items:data,hasMore:data.length===1000},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return unexpected(e);}}
