import {monthlyNpRoster} from '@/lib/monthlyNpRoster';
import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import {fiscalRange} from '@/lib/readmitAmaReport';
export const runtime='nodejs';export const dynamic='force-dynamic';

// Re-admit and AMA cases (approved + pending) and monthly summaries for one fiscal year,
// limited to the departments the signed-in user may read.
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const year=Number(request.nextUrl.searchParams.get('fiscal_year')||2570);if(!Number.isInteger(year)||year<2560||year>2600)return fail('ปีงบประมาณไม่ถูกต้อง');
 const roster=await monthlyNpRoster();
 const {data:departments,error}=await db().from('departments').select('id,Department,group').order('id');if(error)return unexpected(error);
 const allowed=(await Promise.all((departments||[]).filter(d=>roster.has(String(d.id))).map(async (d:Record<string,any>)=>(await canRead(user,Number(d.id)))?d:null))).filter(Boolean) as Record<string,any>[];
 const ids=allowed.map(d=>Number(d.id));if(!ids.length)return NextResponse.json({fiscal_year:year,departments:[],readmit:[],ama:[],readmitSummaries:[],amaSummaries:[]},{headers:{'Cache-Control':'no-store'}});
 const {from,to}=fiscalRange(year),calendarYears=[year-1,year];
 async function all(table:string,columns:string,apply:(q:any)=>any,byStatus=true){const rows:Record<string,any>[]=[];for(let offset=0;;offset+=1000){let q=db().from(table).select(columns).in('department_id',ids);if(byStatus)q=q.in('status',['approved','pending']);const {data,error}=await apply(q).order('id').range(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)break;}return rows;}
 const [readmit,ama,readmitSummaries,amaSummaries]=await Promise.all([
  all('readmit_incident_records','id,department_id,status,hn,an,admit_date,admit_diagnosis,previous_discharge_date,discharge_ward',q=>q.gte('admit_date',from).lt('admit_date',to)),
  all('ama_incident_records','id,department_id,status,hn,an,incident_date,ama_reason,treatment_right',q=>q.gte('incident_date',from).lt('incident_date',to)),
  // Summaries: '*' so older rows without a status column value still load (treated as approved).
  all('readmit_monthly_summary','*',q=>q.in('fiscal_year',calendarYears),false),
  all('ama_monthly_summary','*',q=>q.in('fiscal_year',calendarYears),false),
 ]);
 return NextResponse.json({fiscal_year:year,departments:allowed.map(d=>({id:d.id,name:d.Department})),
  readmit:readmit.map(r=>({id:r.id,department_id:r.department_id,status:r.status,date:r.admit_date,hn:r.hn,an:r.an,detail:r.admit_diagnosis||'',extra:[r.previous_discharge_date&&'จำหน่ายครั้งก่อน '+r.previous_discharge_date,r.discharge_ward].filter(Boolean).join(' • ')})),
  ama:ama.map(r=>({id:r.id,department_id:r.department_id,status:r.status,date:r.incident_date,hn:r.hn,an:r.an,detail:r.ama_reason||'',extra:r.treatment_right||''})),
  readmitSummaries:readmitSummaries.map(s=>({department_id:s.department_id,fiscal_year:s.fiscal_year,month:s.month,status:s.status||'approved',denominator:s.prev_month_discharges})),
  amaSummaries:amaSummaries.map(s=>({department_id:s.department_id,fiscal_year:s.fiscal_year,month:s.month,status:s.status||'approved',denominator:s.total_discharges})),
 },{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
