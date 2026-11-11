import {validDate,isRecord} from '@/lib/audits/chartServer';
import {IV_FACTOR_GROUPS} from '@/lib/ivCareFactors';
export class InputError extends Error {}
const bad=(message:string):never=>{throw new InputError(message);};
const text=(v:unknown,max=2000,required=false)=>{if(v==null&&!required)return null;if(typeof v!=='string'||v.length>max||(required&&!v.trim()))return bad('กรุณาตรวจข้อความที่กรอก');return v.trim()||null;};
const number=(v:unknown,max=100000000)=>{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>max)return bad('จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 0');return v;};
const date=(v:unknown)=>validDate(v)?String(v):bad('วันที่ไม่ถูกต้อง');
export function monthScope(value:unknown){if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return bad('เดือนไม่ถูกต้อง');const [y,m]=value.split('-').map(Number);if(y<2000||y>2200)return bad('ปีไม่ถูกต้อง');return {month:value,yearBE:y+543,monthNumber:m,start:value+'-01',end:new Date(Date.UTC(y,m,1)).toISOString().slice(0,10)};}
function factors(value:unknown){if(!isRecord(value)||value.version!==1||!Array.isArray(value.groups)||value.groups.length>4)return bad('รูปแบบปัจจัย IV ไม่ถูกต้อง');const seen=new Set<string>();return {version:1,groups:value.groups.map((g:any)=>{const config=IV_FACTOR_GROUPS.find(x=>x.code===g?.code);if(!config||seen.has(g.code)||!Array.isArray(g.items)||g.items.length>config.children.length)return bad('หมวดปัจจัย IV ไม่ถูกต้อง');seen.add(g.code);const parents=new Set<string>();return {code:config.code,label:config.label,items:g.items.map((a:any)=>{const p=config.children.find(x=>x.code===a?.code);if(!p||parents.has(a.code)||!Array.isArray(a.causes)||a.causes.length>p.options.length)return bad('หัวข้อปัจจัย IV ไม่ถูกต้อง');parents.add(a.code);const codes=new Set<string>();return {code:p.code,label:p.label,detail:text(a.detail,2000,true),causes:a.causes.map((sub:any)=>{const option=p.options.find(x=>x.code===sub?.code);if(!option||codes.has(sub.code))return bad('สาเหตุย่อย IV ไม่ถูกต้อง');codes.add(sub.code);return {code:option.code,label:option.label};})};})};})};}
export function prepareRecord(action:string,b:Record<string,any>,departmentId:number){
 const base={department_id:departmentId};
 if(action==='fall-summary'||action==='ama-summary'){
  const scope=monthScope(b.month),fall=action==='fall-summary';
  return {table:fall?'fall_monthly_summary':'ama_monthly_summary',conflict:'department_id,fiscal_year,month',payload:{...base,fiscal_year:scope.yearBE,month:scope.monthNumber}};
 }
 if(action==='ama-incident')return {table:'ama_incident_records',payload:{...base,incident_date:date(b.incident_date),hn:text(b.hn,80,true),an:text(b.an,80,true),treatment_right:text(b.treatment_right,300,true),ama_reason:text(b.ama_reason,2000,true)}};
 if(action==='fall-incident'){
  if(!['เวรเช้า','เวรบ่าย','เวรดึก'].includes(b.shift)||!['A','B','C','D','E','F','G','H','I'].includes(b.severity))return bad('กรุณาเลือกเวรและระดับความรุนแรง');
  return {table:'fall_incident_records',payload:{...base,hn:text(b.hn,80,true),an:text(b.an,80),incident_date:date(b.incident_date),shift:b.shift,severity:b.severity,risk_score:number(b.risk_score),description:text(b.description,6000,true),cause_patient:text(b.cause_patient),cause_personnel:text(b.cause_personnel),cause_environment:text(b.cause_environment),cause_system:text(b.cause_system),review_and_solution:text(b.review_and_solution)}};
 }

 if(action==='readmit-summary'){const scope=monthScope(b.month);return {table:'readmit_monthly_summary',conflict:'department_id,fiscal_year,month',scope,payload:{...base,fiscal_year:scope.yearBE,month:scope.monthNumber,prev_month_discharges:scope.monthNumber===10?number(b.prev_month_discharges):0}};}
 if(action==='readmit-incident')return {table:'readmit_incident_records',payload:{...base,hn:text(b.hn,80,true),an:text(b.an,80,true),age:b.age==null?null:number(b.age,130),admit_date:date(b.admit_date),admit_diagnosis:text(b.admit_diagnosis),previous_discharge_date:b.previous_discharge_date?date(b.previous_discharge_date):null,discharge_ward:text(b.discharge_ward,300),discharge_diagnosis:text(b.discharge_diagnosis),cause_patient:text(b.cause_patient),cause_discharge_planning:text(b.cause_discharge_planning),cause_disease_condition:text(b.cause_disease_condition)}};
 if(action==='iv-complication'){
  if(!['Phlebitis','Extravasation','Infiltration'].includes(b.complication)||![1,2,3,4].includes(b.grade)||!['IV','HL'].includes(b.route))return bad('กรุณาตรวจชนิดภาวะแทรกซ้อน ระดับ และช่องทาง');
  return {table:'iv_care_complications',payload:{...base,record_date:date(b.record_date),hn:text(b.hn,80,true),an:text(b.an,80),complication:b.complication,grade:b.grade,route:b.route,site:text(b.site,300,true),contributing_factors:factors(b.contributing_factors)}};
 }
 if(action==='iv-summary'){
  const scope=monthScope(b.audit_month),first=number(b.first_attempt_punctures),total=number(b.total_punctures);
  if(first>total)return bad('จำนวนแทงสำเร็จครั้งแรกต้องไม่มากกว่าจำนวนการแทงทั้งหมด');
  return {table:'iv_care_monthly_summaries',conflict:'department_id,audit_month',payload:{...base,audit_month:scope.month,total_infusion_days:number(b.total_infusion_days),total_sites:number(b.total_sites),total_punctures:total,first_attempt_punctures:first,over_count:b.over_count==null?null:number(b.over_count),under_count:b.under_count==null?null:number(b.under_count)}};
 }
 return bad('ชนิดรายการไม่ถูกต้อง');
}
