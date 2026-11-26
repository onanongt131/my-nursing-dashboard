import pressureMonthly from '@/lib/pressureSoreMonthly2569.json';
import {NextRequest, NextResponse} from 'next/server';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import pressureHistory from '@/lib/pressureSoreHistory.json';
import {normalizeWard,isInspectionWard} from '@/lib/inspectionWards';

export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
 try{
  const user=await currentUser();
  if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
  const kind=request.nextUrl.searchParams.get('kind');
  const fiscalYear=Number(request.nextUrl.searchParams.get('year'));
  if((kind!=='fall'&&kind!=='pressure')||!Number.isInteger(fiscalYear)||fiscalYear<2544||fiscalYear>2642)return fail('รายงานหรือปีงบประมาณไม่ถูกต้อง');
  const pressure=kind==='pressure', year=fiscalYear-543;
  const start=`${year-1}-10-01`, end=`${year}-10-01`;
  const periods=[10,11,12,1,2,3,4,5,6,7,8,9].map(m=>`${m>=10?year-1:year}-${String(m).padStart(2,'0')}`);
  const client=db();
  const {data:departments,error}=await client.from('departments').select('id,Department').order('Department');
  if(error)throw error;
  const wards=(departments??[]).filter(department=>{
   const name=department.Department??'';
   if(!isInspectionWard(name))return false;
   if(!pressure)return true;
   const ward=normalizeWard(name);
   return ward!=='ห้องคลอด'&&(fiscalYear>=2569||!['พิเศษอายุรกรรม5','พิเศษอายุรกรรม6'].includes(ward));
  });
  const allowed=(await Promise.all(wards.map(async ward=>await canRead(user,Number(ward.id))?ward:null))).filter(ward=>ward!==null);
  if(pressure&&[2567,2568,2569].includes(fiscalYear)){
   const history=new Map(Object.entries(pressureHistory).map(([name,value])=>[normalizeWard(name).toLowerCase(),value]));
   const monthly=new Map(Object.entries(pressureMonthly).map(([name,value])=>[normalizeWard(name).toLowerCase(),value as Record<string,{cases:number|null;days:number|null;riskDays:number|null;pending:boolean}>]));
   const items=allowed.map(ward=>{
    const entry=history.get(normalizeWard(ward.Department).toLowerCase());
    return {id:ward.id,name:ward.Department,months:periods.map(period=>(fiscalYear===2569?monthly.get(normalizeWard(ward.Department).toLowerCase())?.[String(Number(period.slice(5)))]:undefined)??{cases:null,days:null,riskDays:null,pending:false}),
     historical:{all:entry?.all?.find(row=>row.year===fiscalYear),risk:entry && 'risk' in entry ? entry.risk?.find(row=>row.year===fiscalYear) : undefined}};
   });
   return NextResponse.json({items},{headers:{'Cache-Control':'private, no-store'}});
  }
  const ids=allowed.map(ward=>ward.id);
  if(!ids.length)return NextResponse.json({items:[]});
  async function read(summary:boolean){
   const table=pressure?(summary?'pressure_sore_monthly_summaries':'pressure_sore_incident_records'):(summary?'fall_monthly_summary':'fall_incident_records');
   const columns=summary?(pressure?'surveillance_patient_days,at_risk_patient_days':'patient_days'):(pressure?'wound_level':'severity');
   const rows:Record<string,any>[]=[];
   for(let offset=0;;offset+=1000){
    let query=client.from(table).select('id,department_id,status,'+columns+','+(summary?(pressure?'month':'fiscal_year,month'):(pressure?'wound_found_date':'incident_date'))).in('department_id',ids).in('status',['approved','pending']);
    if(summary)query=pressure?query.gte('month',start.slice(0,7)).lt('month',end.slice(0,7)):query.in('fiscal_year',[fiscalYear-1,fiscalYear]);
    else{
     const date=pressure?'wound_found_date':'incident_date';
     query=query.gte(date,start).lt(date,end);
    }
    const {data,error}=await query.order('id').range(offset,offset+999).returns<Record<string,any>[]>();
    if(error)throw error;
    rows.push(...(data??[]));
    if((data?.length??0)<1000)return rows;
   }
  }
  const [summaries,incidents]=await Promise.all([read(true),read(false)]);
  const items=allowed.map(ward=>{
   const months=periods.map(period=>{
    const records=incidents.filter(row=>String(row.department_id)===String(ward.id)&&String(row[pressure?'wound_found_date':'incident_date']).slice(0,7)===period);
    const wardSummaries=summaries.filter(row=>String(row.department_id)===String(ward.id)&&
     (pressure?row.month:`${Number(row.fiscal_year)-543}-${String(row.month).padStart(2,'0')}`)===period);
    const approved=wardSummaries.filter(row=>row.status==='approved');
    const summary=approved.length===1?approved[0]:undefined;
    const cases=records.filter(row=>row.status==='approved'&&(!pressure||['2','3','4'].includes(String(row.wound_level)))).length;
    return {cases:summary||cases?cases:null,days:summary?.[pressure?'surveillance_patient_days':'patient_days']??null,
     riskDays:summary?.at_risk_patient_days??null,pending:[...records,...wardSummaries].some(row=>row.status==='pending')};
   });
   return {id:ward.id,name:ward.Department,months};
  });
  return NextResponse.json({items},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return unexpected(error);}
}
