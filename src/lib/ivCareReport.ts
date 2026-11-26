export const ivTypes=['Phlebitis','Extravasation','Infiltration'] as const;
export type IvMetric='success'|'phlebitis'|'extravasation'|'infiltration';
export type IvReportRow={department_id:string|number;fiscal_year:number;month:number;source?:string;[key:string]:any};
export function aggregateIvCare(summaries:Record<string,any>[],incidents:Record<string,any>[],includePending=false){
 const buckets=new Map<string,IvReportRow>();let invalid=0;
 const period=(month:string)=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;const [y,m]=month.split('-').map(Number);return y+543+(m>=10?1:0)===2570?m:null;};
 const bucket=(dept:string|number,month:string,m:number)=>{const key=String(dept)+':'+month;let row=buckets.get(key);if(!row){row={department_id:dept,fiscal_year:2570,month:m,audit_month:month,source:'live',iv_position:null,all_iv_insertion:null,first_iv_insertion:null,total_infusion_days:null,has_summary:false,incident_count:0};for(const type of ivTypes)for(let grade=1;grade<=4;grade++)row[`${type.toLowerCase()}_${grade}`]=0;buckets.set(key,row);}return row;};
 const duplicates=new Set<string>();
 const approvedMonths=new Set(summaries.filter(s=>s.status==='approved').map(s=>String(s.department_id)+':'+s.audit_month));
 for(const s of summaries){if(s.status!=='approved'&&!(includePending&&s.status==='pending'&&!approvedMonths.has(String(s.department_id)+':'+s.audit_month)))continue;const m=period(String(s.audit_month||''));if(!m)continue;const row=bucket(s.department_id,s.audit_month,m),key=String(s.department_id)+':'+s.audit_month;
  if(row.has_summary){duplicates.add(key);invalid++;continue;}
  const fields=['total_sites','total_punctures','first_attempt_punctures','total_infusion_days'];if(fields.some(k=>s[k]==null||String(s[k]).trim()===''||!Number.isSafeInteger(Number(s[k]))||Number(s[k])<0)||Number(s.first_attempt_punctures)>Number(s.total_punctures)){invalid++;continue;}
  Object.assign(row,{has_summary:true,iv_position:Number(s.total_sites),all_iv_insertion:Number(s.total_punctures),first_iv_insertion:Number(s.first_attempt_punctures),total_infusion_days:Number(s.total_infusion_days)});
 }
 for(const incident of incidents){if(incident.status!=='approved'&&!(includePending&&incident.status==='pending'))continue;const month=String(incident.record_date||'').slice(0,7),m=period(month);if(!m)continue;if(!(ivTypes as readonly string[]).includes(incident.complication)||![1,2,3,4].includes(Number(incident.grade))){invalid++;continue;}const row=bucket(incident.department_id,month,m);row[`${incident.complication.toLowerCase()}_${Number(incident.grade)}`]++;row.incident_count++;}
 for(const key of duplicates){const row=buckets.get(key)!;Object.assign(row,{has_summary:false,iv_position:null,all_iv_insertion:null,first_iv_insertion:null,total_infusion_days:null});}
 return {items:[...buckets.values()],invalid,missingSummaries:[...buckets.values()].filter(r=>!r.has_summary).length};
}
export function ivFraction(row:IvReportRow,metric:IvMetric):{n:number;d:number}|null {
 const rawD=metric==='success'?row.all_iv_insertion:row.iv_position;if(row.source==='live'&&(rawD==null||!row.has_summary))return null;
 const d=Number(rawD)||0;let n=0;if(metric==='success')n=Number(row.first_iv_insertion)||0;else for(const grade of metric==='phlebitis'?[3,4]:[1,2,3,4])n+=Number(row[`${metric}_${grade}`])||0;
 if(d<=0)return row.source==='live'?null:{n:0,d:1};return {n,d};
}
export function ivPercent(rows:IvReportRow[],metric:IvMetric,mode:'unit'|'overall'='unit'):number|null {
 if(!rows.some(r=>r.source==='live')&&mode==='overall'){
  if(metric==='success'){const valid=rows.filter(r=>Number(r.all_iv_insertion)>0);return valid.length?valid.reduce((s,r)=>s+Number(r.first_iv_insertion||0)/Number(r.all_iv_insertion)*100,0)/valid.length:null;}
  const d=rows.reduce((s,r)=>s+(Number(r.iv_position)||0),0);let n=0;for(const r of rows)for(const grade of metric==='phlebitis'?[3,4]:[1,2,3,4])n+=Number(r[`${metric}_${grade}`])||0;return d>0?n/d*100:null;
 }
 const pairs=rows.map(r=>ivFraction(r,metric)).filter((v):v is {n:number;d:number}=>v!==null);if(!pairs.length)return null;
 const live=rows.some(r=>r.source==='live');if(!live&&(mode==='unit'||metric==='success'))return pairs.reduce((s,v)=>s+v.n/v.d*100,0)/pairs.length;
 return pairs.reduce((s,v)=>s+v.n,0)/pairs.reduce((s,v)=>s+v.d,0)*100;
}
