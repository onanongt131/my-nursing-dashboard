import {autoPer,wholePatientType} from './legacy';
import type {Source,Staff} from './types';
const identity=(v:string)=>v.normalize('NFC').replace(/^(นางสาว|นาง|นาย|น\s*\.\s*ส\s*\.)\s*/,'').replace(/\s+/g,' ').trim().toLowerCase();
/** Preserve every originating allocation; never pool quantities or divisors. */
export function mergeClaimSources(primary:Source,secondary:Source):Source {
 if(primary.month!==secondary.month)throw new Error('เดือนต้นทางไม่ตรงกัน');
 const people=new Map<string,Staff>(),aliases=new Map<string,string>();
 for(const source of [primary,secondary])for(const person of [...source.staff,...source.headStaff]){
  const key=identity(person.displayName||person.name),existing=people.get(key);
  if(existing&&existing.group!==person.group)throw new Error('ตำแหน่งบุคลากรสองหน่วยงานไม่ตรงกัน กรุณาตรวจรายชื่อ');
  if(!existing)people.set(key,person);
  aliases.set(person.name,people.get(key)!.name);
 }
 const name=(v:string)=>aliases.get(v)||v;
 const displayNames=new Map([...people.values()].map(person=>[person.name,person.displayName||person.name]));
 const records:any[]=[],daily=new Map<string,any>(),assignments:Source['assignments']={},owners=new Map<string,number>();
 const conflicts=new Map<string,{date:string;shift:string;person:string}>();
 for(const [index,source] of [primary,secondary].entries()){
  const departmentId=index===0?4:8,catalog=new Map(source.activities.map(a=>[a.id,a]));
  const add=(row:any)=>{
   const recipients=[...new Set<string>((row.sourceRecipients||row.recipients||[]).map(name))];
   if(Number(row.quantity)>0&&Number.isFinite(row.perPerson)&&row.perPerson>0)for(const recipient of recipients){
    const key=row.date+'|'+row.shift+'|'+recipient,owner=owners.get(key);
    if(owner&&owner!==departmentId){
     conflicts.set(key,{date:row.date,shift:row.shift,person:displayNames.get(recipient)||recipient});
    }else owners.set(key,departmentId);
   }
   records.push({...row,id:departmentId+':'+row.id,sourceDepartmentId:departmentId,sourceWard:source.ward,activity:row.activity+' ['+source.ward+']',recipients,sourceRecipients:recipients});
  };
  for(const row of source.records){
   if(Object.prototype.hasOwnProperty.call(source.autoCounts[row.date+'|'+row.shift]||{},row.activityId))continue;
   const activity=catalog.get(row.activityId);
   const perPerson=activity&&wholePatientType(activity)
    ?autoPer(activity,{quantity:row.quantity,divisor:row.divisor,each:activity.each})
    :Number(row.perPerson||0);
   add({...row,perPerson});
  }
  for(const [key,counts] of Object.entries(source.autoCounts))for(const [id,x] of Object.entries(counts)){
   const a=catalog.get(id);if(!a||Number(x.quantity)<=0)continue;
   const [date,shift]=key.split('|');
   add({id:'AUTO:'+key+':'+id,date,shift,activityId:id,activity:a.name,category:a.category,scoreType:a.type,minutes:a.minutes,point:a.point,quantity:Number(x.quantity),divisor:x.divisor,workers:x.divisor,perPerson:autoPer(a,x),recipients:x.participants||x.recipients||[]});
  }
  for(const row of source.daily){const key=row.date+'|'+row.shift,old=daily.get(key);daily.set(key,{...row,saved:!!row.saved||!!old?.saved});}
  for(const [key,a] of Object.entries(source.assignments)){
   const old=assignments[key];assignments[key]={...a,details:[...(old?.details||[]),...(a.details||[]).map((d:any)=>({...d,name:name(d.name),sourceDepartmentId:departmentId}))]};
  }
 }
 if(conflicts.size){
  const items=[...conflicts.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.shift.localeCompare(b.shift,'th')||a.person.localeCompare(b.person,'th'));
  throw new Error([
   `พบคะแนนซ้ำ ${items.length} รายการ จากข้อมูลเดือน ${primary.month} ของหน่วยงาน ${primary.ward} และ ${secondary.ward}`,
   ...items.map((item,i)=>`${i+1}. ${item.date} ${item.shift} — ${item.person}`),
   'กรุณาตรวจมอบหมายงานต้นทางก่อนรวมเบิก',
  ].join('\n'));
 }
 const all=[...people.values()],heads=new Set(primary.headStaff.map(p=>name(p.name)));
 const activities=[...new Map([...primary.activities,...secondary.activities].map(a=>[a.id,a])).values()];
 return {...primary,staff:all.filter(p=>!heads.has(p.name)),headStaff:primary.headStaff.map(p=>({...p,name:name(p.name)})),activities,records,autoCounts:{},assignments,daily:[...daily.values()],
  roster:primary.roster.map(r=>({...r,name:name(r.name)})),rosterNameOrder:[...new Set([...primary.rosterNameOrder.map(name),...all.map(p=>p.name)])],
  statistics:[...primary.statistics,...secondary.statistics],procedures:[...primary.procedures,...secondary.procedures],nativeDaily:{}};
}
