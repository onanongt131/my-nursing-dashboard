import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import {isInspectionWard,normalizeWard} from '@/lib/inspectionWards';
import {monthlyNpRoster} from '@/lib/monthlyNpRoster';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Kind='fall'|'pressure'|'readmit'|'ama';
const CONFIG:Record<Kind,{table:string;date:string;columns:string}>={
 fall:{table:'fall_incident_records',date:'incident_date',columns:'incident_date,hn,an,shift,severity,description,cause_patient,cause_personnel,cause_environment,cause_system,review_and_solution'},
 pressure:{table:'pressure_sore_incident_records',date:'wound_found_date',columns:'wound_found_date,hn,an,diagnosis,age,admission_bs,found_bs,wound_site,wound_level,discharge_status,wound_outcome'},
 ama:{table:'ama_incident_records',date:'incident_date',columns:'incident_date,hn,an,treatment_right,ama_reason'},
 readmit:{table:'readmit_incident_records',date:'admit_date',columns:'admit_date,hn,an,age,admit_diagnosis,previous_discharge_date,discharge_ward,discharge_diagnosis,cause_patient,cause_discharge_planning,cause_disease_condition'},
};

// รายกรณี (อนุมัติแล้ว + รออนุมัติ) สำหรับตารางสรุปประเด็นในบทสรุปผู้บริหาร
// จำกัดเฉพาะหน่วยงานที่ผู้ใช้มีสิทธิ์อ่าน และหน่วยงานชุดเดียวกับรายงานรายเดือน
export async function GET(request:NextRequest){
 try{
  const user=await currentUser();
  if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
  const kind=request.nextUrl.searchParams.get('kind') as Kind;
  const fiscalYear=Number(request.nextUrl.searchParams.get('year'));
  if(!Object.hasOwn(CONFIG,kind??'')||!Number.isInteger(fiscalYear)||fiscalYear<2560||fiscalYear>2642)return fail('รายงานหรือปีงบประมาณไม่ถูกต้อง');
  const year=fiscalYear-543,start=`${year-1}-10-01`,end=`${year}-10-01`;
  const client=db();
  const {data:departments,error}=await client.from('departments').select('id,Department').order('id');
  if(error)throw error;
  const roster=kind==='readmit'||kind==='ama'?await monthlyNpRoster():null;
  const candidates=(departments??[]).filter(d=>{
   if(roster)return roster.has(String(d.id));
   const name=d.Department??'';
   if(!isInspectionWard(name))return false;
   return kind!=='pressure'||normalizeWard(name)!=='ห้องคลอด';
  });
  const allowed=(await Promise.all(candidates.map(async d=>await canRead(user,Number(d.id))?d:null))).filter((d):d is {id:number;Department:string}=>d!==null);
  const names=new Map(allowed.map(d=>[String(d.id),d.Department]));
  if(!allowed.length)return NextResponse.json({items:[]},{headers:{'Cache-Control':'private, no-store'}});
  const cfg=CONFIG[kind];
  const rows:Record<string,any>[]=[];
  for(let offset=0;;offset+=1000){
   const {data,error:readError}=await client.from(cfg.table).select('id,department_id,status,'+cfg.columns)
    .in('department_id',allowed.map(d=>d.id)).in('status',['approved','pending'])
    .gte(cfg.date,start).lt(cfg.date,end).order(cfg.date).order('id').range(offset,offset+999).returns<Record<string,any>[]>();
   if(readError)throw readError;
   rows.push(...(data??[]));
   if((data?.length??0)<1000)break;
  }
  const items=rows.map(r=>({...r,date:r[cfg.date],department:names.get(String(r.department_id))??`หน่วยงาน ${r.department_id}`}));
  return NextResponse.json({items},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return unexpected(error);}
}
