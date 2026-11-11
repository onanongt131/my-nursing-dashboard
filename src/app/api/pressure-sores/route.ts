import {isPressureSoreIpd} from '@/lib/pressureSoreServer';
import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canCreate,canRead,canApprove,fail,unexpected,isRecord,validDept} from '@/lib/audits/chartServer';
import {emptyPressureSore,validatePressureSore} from '@/lib/pressureSore';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const q=request.nextUrl.searchParams,dept=Number(q.get('department_id'));
 if(!validDept(dept))return fail('รหัสหน่วยงานไม่ถูกต้อง');if(!await canRead(user,dept))return fail('ไม่มีสิทธิ์',403);if(!await isPressureSoreIpd(dept))return fail('Pressure sore ใช้เฉพาะหน่วยงาน IPD ที่เปิดใช้งาน',403);
 if(q.get('options')==='departments'){const {data,error}=await db().from('departments').select('id,Department').order('Department');if(error)return unexpected(error);return NextResponse.json({items:data??[]},{headers:{'Cache-Control':'no-store'}});}
 const status=q.get('status')||'pending';if(!['pending','approved'].includes(status))return fail('สถานะไม่ถูกต้อง');
 const limit=Math.min(100,Math.max(1,Number(q.get('limit'))||100));
 const {data,error}=await db().from('pressure_sore_incident_records').select('*').eq('department_id',dept).eq('status',status).order('created_at',{ascending:false}).limit(limit);
 if(error)return unexpected(error);
 const {data:summaries,error:summaryError}=await db().from('pressure_sore_monthly_summaries').select('*').eq('department_id',dept).eq('status',status).order('month',{ascending:false}).limit(100);if(summaryError)return unexpected(summaryError);
 const ids=Array.from(new Set([...(data||[]),...(summaries||[])].map(row=>row.created_by)));
 const {data:profiles,error:profileError}=ids.length?await db().from('profiles').select('id,full_name').in('id',ids):{data:[],error:null};if(profileError)return unexpected(profileError);
 const names=new Map((profiles||[]).map(profile=>[profile.id,profile.full_name]));
 return NextResponse.json({items:(data||[]).map(row=>({...row,recorded_by_name:names.get(row.created_by)||'-'})),summaries:(summaries||[]).map(row=>({...row,recorded_by_name:names.get(row.created_by)||'-'})),can_approve:canApprove(user,dept),user_id:user.id},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
export async function POST(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const body:unknown=await request.json().catch(()=>null);if(!isRecord(body))return fail('ข้อมูลไม่ถูกต้อง');
 const dept=body.department_id;if(!validDept(dept))return fail('รหัสหน่วยงานไม่ถูกต้อง');if(!canCreate(user,dept))return fail('ไม่มีสิทธิ์บันทึกหน่วยงานนี้',403);if(!await isPressureSoreIpd(dept))return fail('Pressure sore ใช้เฉพาะหน่วยงาน IPD ที่เปิดใช้งาน',403);
 const values={...emptyPressureSore};for(const key of Object.keys(values) as (keyof typeof values)[])values[key]=typeof body[key]==='string'?(body[key] as string).trim():'';
 const issue=validatePressureSore(values);if(issue)return NextResponse.json({error:issue.message,field:issue.field},{status:400});
 const {data:department,error:de}=await db().from('departments').select('id').eq('id',dept).maybeSingle();if(de||!department)return fail('ไม่พบหน่วยงาน');
 const target=values.discharge_status==='ย้าย'?Number(values.transfer_department_id):null;
 if(target){const {data,error}=await db().from('departments').select('id').eq('id',target).maybeSingle();if(error||!data)return NextResponse.json({field:'transfer_department_id',error:'ไม่พบหน่วยงานรับย้าย'},{status:400});}
 const {data,error}=await db().from('pressure_sore_incident_records').insert({...values,department_id:dept,age:Number(values.age),admission_bs:Number(values.admission_bs),found_bs:Number(values.found_bs),transfer_department_id:target,discharge_status:values.discharge_status||null,status:'pending',created_by:user.id}).select('id,status').single();
 if(error)return unexpected(error);return NextResponse.json({item:data},{status:201,headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
