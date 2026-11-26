import 'server-only';
import {isDialysisDepartment} from '@/lib/dialysisServer';
import {db} from '@/lib/audits/chartServer';
import {monthScope,InputError} from './validation';
import {summarizeFallPatientDays,type StaffingRow} from '@/lib/fallPatientDays';
import {summarizeAmaDischarges,type DischargeRow} from '@/lib/amaDischarges';
import {summarizeReadmitDischarges,previousMonth,type ReadmitDischargeRow} from '@/lib/readmitDischarges';

export async function staffingRows(departmentId:number,month:string,columns:string) {
  const scope=monthScope(month), rows:Record<string,any>[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await db().from('daily_staffing').select('id,date,shift,'+columns)
      .eq('department_id',departmentId).gte('date',scope.start).lt('date',scope.end).order('id').range(offset,offset+999);
    if(error)throw new Error('อ่านสถิติหอผู้ป่วยไม่สำเร็จ');
    rows.push(...(data||[]));if((data||[]).length<1000)return rows;
  }
}
export async function fallPatientDays(id:number,month:string){
  return summarizeFallPatientDays(await staffingRows(id,month,'nursing_count') as StaffingRow[],month);
}
export async function fallStats(id:number,month:string){
  const manual=await isDialysisDepartment(id);
  const scope=monthScope(month);
  const days=manual?null:await fallPatientDays(id,month);
  let patientDays:number|null=null;
  if(manual){
    const {data,error}=await db().from('fall_monthly_summary').select('patient_days').eq('department_id',id).eq('fiscal_year',scope.yearBE).eq('month',scope.monthNumber).maybeSingle();
    if(error)throw error;
    patientDays=data?.patient_days??null;
  }
  let total=0,severe=0;
  for(let offset=0;;offset+=1000){
    const {data,error}=await db().from('fall_incident_records').select('id,severity').eq('department_id',id)
      .gte('incident_date',scope.start).lt('incident_date',scope.end).order('id').range(offset,offset+999);
    if(error)throw new Error('อ่านจำนวนอุบัติการณ์ไม่สำเร็จ');
    total+=(data||[]).length;severe+=(data||[]).filter(row=>['F','G','H','I'].includes(String(row.severity||'').toUpperCase())).length;
    if((data||[]).length<1000)break;
  }
  return {days,manual,patientDays,total,severe};
}
export async function amaStats(id:number,month:string){
  const stats=summarizeAmaDischarges(await staffingRows(id,month,'discharge,transfer_out,dead') as DischargeRow[],month);
  const scope=monthScope(month),{count,error}=await db().from('ama_incident_records').select('id',{count:'exact',head:true})
    .eq('department_id',id).gte('incident_date',scope.start).lt('incident_date',scope.end);
  if(error)throw new Error('อ่านจำนวนจำหน่ายไม่สมัครอยู่ไม่สำเร็จ');
  return {stats,ama:count||0};
}
export async function readmitDenominator(id:number,month:string){
  const scope=monthScope(month);
  if(scope.monthNumber===10)return {manual:true,month:previousMonth(month),stats:null};
  const previous=previousMonth(month);
  const stats=summarizeReadmitDischarges(await staffingRows(id,previous,'discharge') as ReadmitDischargeRow[],previous);
  return {manual:false,month:previous,stats};
}
export function requireComplete(complete:boolean,message:string):void{if(!complete)throw new InputError(message);}
