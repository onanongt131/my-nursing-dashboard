import {monthlyNpRoster} from '@/lib/monthlyNpRoster';
import {NextResponse,type NextRequest} from 'next/server';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import {aggregateIvCare} from '@/lib/ivCareReport';
export const runtime='nodejs';export const dynamic='force-dynamic';
// ?fiscal_year=YYYY (ไม่บังคับ): อ่านเฉพาะปีนั้น ลดปริมาณข้อมูล · ไม่ระบุ = ทุกปี (หน้า IV Care ใช้ดูย้อนหลัง)
export async function GET(request:NextRequest){try{
 const yearParam=request.nextUrl.searchParams.get('fiscal_year');const onlyYear=yearParam?Number(yearParam):null;
 if(onlyYear!==null&&(!Number.isInteger(onlyYear)||onlyYear<2560||onlyYear>2642))return fail('ปีงบประมาณไม่ถูกต้อง');
 // อ่านผู้ใช้ รายชื่อหน่วยงาน และ roster พร้อมกัน (ลดการรอเป็นทอด)
 const [user,roster,{data:departments,error}]=await Promise.all([currentUser(),monthlyNpRoster(),db().from('departments').select('id,Department,group')]);
 if(!user)return fail('กรุณาเข้าสู่ระบบ',401);if(error)return unexpected(error);
 const rights=await Promise.all((departments||[]).filter(d=>roster.has(String(d.id))).map(async (d:Record<string,any>)=>({d,allowed:await canRead(user,Number(d.id))})));const allowed=rights.filter((r:{d:Record<string,any>;allowed:boolean})=>r.allowed).map((r:{d:Record<string,any>;allowed:boolean})=>r.d),ids=new Set(allowed.map((d:Record<string,any>)=>String(d.id)));
 async function page(table:string,columns:string,kind:string){const rows:Record<string,any>[]=[];for(let offset=0;;offset+=1000){let q=db().from(table).select(columns);if(kind==='legacy')q=(onlyYear!==null?q.eq('fiscal_year',onlyYear):q.neq('fiscal_year',2570)).order('department_id').order('fiscal_year').order('month');else{q=q.in('status',['approved','pending']).gte(kind==='summary'?'audit_month':'record_date','2026-10'+(kind==='summary'?'':'-01')).lt(kind==='summary'?'audit_month':'record_date',kind==='summary'?'2027-10':'2027-10-01').order('id');}const {data,error}=await q.range(offset,offset+999);if(error)throw error;rows.push(...(data||[]).filter((r:Record<string,any>)=>ids.has(String(r.department_id))));if((data||[]).length<1000)break;}return rows;}
 const none=async()=>[] as Record<string,any>[],live=onlyYear===null||onlyYear===2570;
 const [legacy,summaries,incidents]=await Promise.all([onlyYear===2570?none():page('iv_care_data','*','legacy'),!live?none():page('iv_care_monthly_summaries','id,department_id,audit_month,total_sites,total_punctures,first_attempt_punctures,total_infusion_days,status','summary'),!live?none():page('iv_care_complications','id,department_id,record_date,complication,grade,status,contributing_factors,factor_drug,factor_fluid,factor_patient,factor_personnel','incident')]);
 const report=aggregateIvCare(summaries,incidents,true);
 const pendingMonths = new Set<string>();
 for (const row of summaries) if (row.status === 'pending') {
   pendingMonths.add(String(row.department_id) + ':' + row.audit_month);
 }
 for (const row of incidents) if (row.status === 'pending') {
   pendingMonths.add(String(row.department_id) + ':' + String(row.record_date).slice(0, 7));
 }
 return NextResponse.json({items:[...legacy,...report.items],departments:allowed,incidents,invalid:report.invalid,missing_summaries:report.missingSummaries,pending_months:[...pendingMonths]},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
