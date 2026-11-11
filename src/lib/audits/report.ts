import {reviewMonth,reviewFiscalYear} from '@/lib/review/period';
export const auditReportGroups={
 a:[...Array.from({length:6},(_,i)=>`s1_1_${i+1}`),...Array.from({length:4},(_,i)=>`s2_${i+1}_a`),'s3_a'],
 p:[...Array.from({length:5},(_,i)=>`s1_2_${i+1}`),...Array.from({length:4},(_,i)=>`s2_${i+1}_p`),'s3_p'],
 i:['s1_3_1',...Array.from({length:4},(_,i)=>`s2_${i+1}_i`),'s3_i'],
 e:['s1_4_1',...Array.from({length:4},(_,i)=>`s2_${i+1}_e`),'s3_e'],
 d_c:Array.from({length:6},(_,i)=>`s4_${i+1}`)
};
export const auditNoteFields=['s1_notes','s2_notes','s3_notes','s4_notes','s5_notes','notes'] as const;
export function aggregateNursingAudits(records:Record<string,unknown>[],includePending=false,includeNotes=false){
 const buckets=new Map<string,Record<string,any>>();let skipped=0;
 for(const record of records){
  if(record.status!=='approved'&&!(includePending&&record.status==='pending'))continue;
  const period=reviewMonth(record),year=reviewFiscalYear(record);if(!period||!year||year<2570)continue;
  const naKeys=new Set(Array.isArray(record.audit_na_keys)?record.audit_na_keys:[]);
  const sums:Record<string,number>={};let valid=true;
  for(const [group,keys] of Object.entries(auditReportGroups)){let score=0,max=0;for(const key of keys){const raw=record[key];if(raw==null&&naKeys.has(key))continue;if(typeof raw==='string'&&raw.trim().toUpperCase()==='NA')continue;if(raw===null||raw===undefined||String(raw).trim()===''||![1,2,3,4].includes(Number(raw))){valid=false;break;}score+=Number(raw);max+=4;}sums[group]=score;sums[group+'_max']=max;}
  if(!valid){skipped++;continue;}
  const key=String(record.department_id)+':'+period;let row=buckets.get(key);if(!row){row={department_id:record.department_id,fiscal_year:year,month:String(Number(period.slice(5,7))),audit_month:period,chart_count:0,source:'nursing_chart_audits'};for(const key of Object.keys(sums))row[key]=0;buckets.set(key,row);}
  row.pending ||= record.status==='pending';row.chart_count++;for(const [key,value] of Object.entries(sums))row[key]+=value;
  if(includeNotes)for(const field of auditNoteFields){
   const value=record[field];
   if(typeof value==='string'&&value.trim())((row.audit_notes ??= {})[field] ??= []).push(value.trim());
  }
  row.total_apie=row.a_max+row.p_max+row.i_max+row.e_max;
 }return {items:[...buckets.values()],skipped};
}
export function reportPercent(rows:Record<string,any>[],group:string):number|null {
 const legacy:Record<string,number>={a:220,p:200,i:120,e:120};let numerator=0,denominator=0;
 for(const row of rows){const max=row[group+'_max']??legacy[group];if(typeof max!=='number'||max<=0)continue;const raw=row[group]??row[group.toUpperCase()];if(raw==null||!Number.isFinite(Number(raw)))continue;numerator+=Number(raw);denominator+=max;}
 return denominator?numerator/denominator*100:null;
}
