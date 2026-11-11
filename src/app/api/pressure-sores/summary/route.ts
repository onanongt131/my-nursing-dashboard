import {isPressureSoreIpd,pressurePatientDays} from '@/lib/pressureSoreServer';
import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canCreate,canRead,canApprove,fail,unexpected,isRecord,validDept} from '@/lib/audits/chartServer';
import {PRESSURE_LEVELS} from '@/lib/pressureSore';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const q=request.nextUrl.searchParams,dept=Number(q.get('department_id')),month=q.get('month');
 if(!validDept(dept)||!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return fail('เดือนหรือหน่วยงานไม่ถูกต้อง');if(!await canRead(user,dept))return fail('ไม่มีสิทธิ์',403);if(!await isPressureSoreIpd(dept))return fail('Pressure sore ใช้เฉพาะหน่วยงาน IPD ที่เปิดใช้งาน',403);
 const start=month+'-01',next=new Date(start+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=next.toISOString().slice(0,10);
 const counts=Object.fromEntries(PRESSURE_LEVELS.map(level=>[level,0])),pending={...counts},approved={...counts};
 for(let offset=0;;offset+=1000){const {data,error}=await db().from('pressure_sore_incident_records').select('id,wound_level,status').eq('department_id',dept).gte('wound_found_date',start).lt('wound_found_date',end).in('status',['pending','approved']).order('id').range(offset,offset+999);if(error)return unexpected(error);
 for(const row of data||[]){if(Object.prototype.hasOwnProperty.call(counts,row.wound_level)){counts[row.wound_level]++;(row.status==='approved'?approved:pending)[row.wound_level]++;}}if(!data||data.length<1000)break;}
 const {data:item,error}=await db().from('pressure_sore_monthly_summaries').select('*').eq('department_id',dept).eq('month',month).maybeSingle();if(error)return unexpected(error);
 const patient_days=await pressurePatientDays(dept,month);
 return NextResponse.json({item,patient_days,counts,pending_counts:pending,approved_counts:approved,can_approve:canApprove(user,dept),user_id:user.id},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
export async function POST(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);const body:unknown=await request.json().catch(()=>null);if(!isRecord(body))return fail('ข้อมูลไม่ถูกต้อง');
 const dept=body.department_id,month=body.month;if(!validDept(dept)||typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return fail('เดือนหรือหน่วยงานไม่ถูกต้อง');if(!canCreate(user,dept))return fail('ไม่มีสิทธิ์',403);if(!await isPressureSoreIpd(dept))return fail('Pressure sore ใช้เฉพาะหน่วยงาน IPD ที่เปิดใช้งาน',403);
 const patientDays=await pressurePatientDays(dept,month);if(!patientDays.complete)return NextResponse.json({error:'ข้อมูลคงพยาบาลเวรบ่ายไม่ครบหรือมีข้อมูลซ้ำ กรุณาแก้สถิติหอผู้ป่วยก่อนบันทึกสรุป',patient_days:patientDays},{status:409});
 const values:Record<string,number>={surveillance_patient_days:patientDays.total as number};for(const field of ['at_risk_patients','at_risk_patient_days']){const value=body[field];if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return NextResponse.json({error:'กรุณากรอกจำนวนเต็มตั้งแต่ 0 ขึ้นไป',field},{status:400});values[field]=value;}
 if(values.at_risk_patient_days>values.surveillance_patient_days)return NextResponse.json({field:'at_risk_patient_days',error:'วันนอนกลุ่มเสี่ยงต้องไม่เกินวันนอนผู้ป่วยที่เฝ้าระวัง'},{status:400});
 const {data:existing,error:readError}=await db().from('pressure_sore_monthly_summaries').select('id,status,created_by').eq('department_id',dept).eq('month',month).maybeSingle();if(readError)return unexpected(readError);
 if(existing&&(existing.status!=='pending'||(existing.created_by!==user.id&&!['admin','head_nurse'].includes(user.role))))return fail('รายการอนุมัติแล้วหรือไม่มีสิทธิ์แก้ไข',409);
 const payload={...values,department_id:dept,month,status:'pending',updated_at:new Date().toISOString()};
 const query=existing?db().from('pressure_sore_monthly_summaries').update(payload).eq('id',existing.id).eq('status','pending'):db().from('pressure_sore_monthly_summaries').insert({...payload,created_by:user.id});
 const {data,error}=await query.select('id,status').maybeSingle();if(error)return unexpected(error);if(!data)return fail('สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่',409);
 return NextResponse.json({item:data},{status:existing?200:201,headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
