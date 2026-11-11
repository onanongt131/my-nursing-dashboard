import {NextRequest} from 'next/server';
import {loadContext,writeOrigin,apiError,P4PError} from '@/lib/p4p/server';
import {db} from '@/lib/audits/chartServer';
import {dailyKey,dailyRows,prepareDailyEdit,DailyValidationError} from '@/lib/p4p/daily';
export const dynamic='force-dynamic';export const runtime='nodejs';
function failure(e:unknown){return apiError(e instanceof DailyValidationError?new P4PError(e.message):e);}
export async function GET(request:NextRequest){try{
 const q=request.nextUrl.searchParams,c=await loadContext(q.get('department_id'),q.get('month'));
 if(!c.manager)throw new P4PError('เฉพาะหัวหน้าหรือผู้ดูแลระบบของหน่วยงาน',403);
 if(c.departmentId===4)throw new P4PError('ข้อมูลรวมสองหน่วยงาน กรุณาแก้รายวันที่ Apps Script ของหน่วยงานต้นทางแล้วส่งใหม่',409);
 const date=q.get('date'),shift=q.get('shift');
 if(date&&shift){const key=dailyKey(c.source,date,shift),rows=dailyRows(c.source,date,shift);
 const {data:history,error}=await db().from('p4p_daily_history').select('id,reason,updated_by,created_at,source_revision,profiles(full_name)').eq('department_id',c.departmentId).eq('month',c.month).eq('shift_key',key).order('id',{ascending:false}).limit(10);
 if(error)throw new P4PError('อ่านประวัติไม่สำเร็จ กรุณาตรวจ SQL ส่วนแก้ไขรายวัน',503);
 return Response.json({date,shift,sourceRevision:c.sourceRevision,rows,native:c.source.nativeDaily?.[key]||null,history,hasAssignment:!!c.source.assignments[key]?.details?.length},{headers:{'Cache-Control':'no-store'}});}
 const unique=new Map<string,any>();c.source.daily.filter(d=>d.saved).forEach(d=>{const key=d.date+'|'+d.shift;unique.set(key,{date:d.date,shift:d.shift,native:!!c.source.nativeDaily?.[key],editedAt:c.source.nativeDaily?.[key]?.updatedAt||null});});
 return Response.json({days:[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.shift.localeCompare(b.shift))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}
export async function POST(request:NextRequest){try{
 writeOrigin(request);if(Number(request.headers.get('content-length')||0)>200000)throw new P4PError('ข้อมูลใหญ่เกินกำหนด',413);const text=await request.text();if(text.length>200000)throw new P4PError('ข้อมูลใหญ่เกินกำหนด',413);let b;try{b=JSON.parse(text);}catch{throw new P4PError('ข้อมูลไม่ถูกต้อง');}if(!b||typeof b!=='object')throw new P4PError('ข้อมูลไม่ถูกต้อง');
 const c=await loadContext(b.departmentId,b.month,undefined,'transaction');if(!c.manager)throw new P4PError('เฉพาะหัวหน้าหรือผู้ดูแลระบบของหน่วยงาน',403);
 if(c.departmentId===4)throw new P4PError('กรุณาแก้รายวันที่ Apps Script ของหน่วยงานต้นทางแล้วส่งใหม่',409);
 const key=dailyKey(c.source,b.date,b.shift);
 if(b.sourceRevision!==c.sourceRevision)throw new P4PError('ข้อมูลเปลี่ยน กรุณาปิดแล้วเปิดรายการใหม่ก่อนบันทึก',409);
 const reason=typeof b.reason==='string'?b.reason.trim():'';if(!reason||reason.length>500)throw new P4PError('กรุณาระบุเหตุผลการแก้ไข ไม่เกิน 500 ตัวอักษร');
 const records=prepareDailyEdit(c.source,b.date,b.shift,b.entries);
 const {error}=await db().rpc('p4p_save_daily_edit',{p_department_id:c.departmentId,p_month:c.month,p_key:key,p_records:records,p_source_revision:c.sourceRevision,p_user_id:c.user.id,p_reason:reason});
 if(error){if(/SOURCE_CHANGED/.test(error.message))throw new P4PError('ข้อมูลเปลี่ยนจากอีกหน้าต่าง กรุณาปิดแล้วเปิดรายการใหม่',409);throw new P4PError('บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่',503);}
 return Response.json({message:'บันทึกการแก้ไขแล้ว คะแนนและรายงานปรับปรุงแล้ว'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}
