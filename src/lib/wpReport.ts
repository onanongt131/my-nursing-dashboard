import {wpQaItems} from '@/lib/wpIpdCriteria';

export type WpReportRow={department_id:string|number;fiscal_year:number;month:number;name:string;wp:number|null;pending?:boolean;evaluated?:number;practiced?:number;reasons?:string[]};
export function aggregateWpReport(records:Record<string,any>[],includePending=false){
 const groups=new Map<string,{department_id:string|number;month:number;name:string;practiced:number;evaluated:number;pending:boolean;reasons:Set<string>}>();let invalid=0;
 function add(row:Record<string,any>,code:string,name:string,answer:Record<string,any>){
  if(row.status!=='approved'&&!(includePending&&row.status==='pending'))return;
  const period=String(row.audit_month||'');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||period<'2026-10'||period>='2027-10')return;
  const p=answer.total_practiced,n=answer.total_evaluated;
  if(!code||!name||p==null||n==null||String(p).trim()===''||String(n).trim()===''||!Number.isSafeInteger(Number(p))||!Number.isSafeInteger(Number(n))||Number(n)<=0||Number(p)<0||Number(p)>Number(n)){invalid++;return;}
  const key=JSON.stringify([String(row.department_id),period,code]);
  const group=groups.get(key)||{department_id:row.department_id,month:Number(period.slice(5,7)),name,practiced:0,evaluated:0,pending:false,reasons:new Set<string>()};
  if(Number(p)<Number(n)&&typeof answer.unpracticed_reasons==='string'&&answer.unpracticed_reasons.trim())group.reasons.add(answer.unpracticed_reasons.trim());
  group.pending ||= row.status==='pending';group.practiced+=Number(p);group.evaluated+=Number(n);groups.set(key,group);
 }
 for(const row of records){const code=String(row.wp_id||'');const name=wpQaItems.find(item=>item.id===code)?.name||String(row.wp_name||code);add(row,code,name,row);}
 const items:WpReportRow[]=[...groups.values()].map(group=>({department_id:group.department_id,fiscal_year:2570,month:group.month,name:group.name,pending:group.pending,evaluated:group.evaluated,practiced:group.practiced,reasons:[...group.reasons],wp:group.practiced/group.evaluated*100}));
 return {items,invalid};
}
