import type {Source} from './types';
import {activityNames,activityDivisor,rnService,wholePatientType,autoPer,claimDate} from './legacy';
export class DailyValidationError extends Error {}
export const SHIFTS=['เวรเช้า','เวรบ่าย','เวรดึก'];
export function dailyKey(s:Source,date:unknown,shift:unknown){
 if(typeof date!=='string'||typeof shift!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!SHIFTS.includes(shift)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||claimDate(date,shift).slice(0,7)!==s.month)throw new DailyValidationError('วันที่/เวรอยู่นอกรอบ P4P ที่เลือก');
 return date+'|'+shift;
}
export function applyDailyEdits(input:Source):Source{
 const s={...input,records:[...input.records],daily:input.daily.map(d=>({...d}))};
 Object.entries(input.nativeDaily||{}).forEach(([key,d])=>{const [date,shift]=key.split('|');s.records=s.records.filter(r=>r.date+'|'+r.shift!==key).concat(d.records);const day=s.daily.find(r=>r.date===date&&r.shift===shift);if(day)day.saved=true;});const academic = s.activities.find(a => a.id === 'C14');
 if (!academic) return s;
 const minutes = 60, point = 0.143;
 s.activities = s.activities.map(a => a.id === 'C14' ? {...a, minutes, point, each:true} : a);
 s.records = s.records.map(row => {
  if (row.activityId !== 'C14') return row;
  const perPerson = Number((Number(row.quantity) * minutes * point).toFixed(2));
  const recipients = row.sourceRecipients || row.recipients || [];
  return {...row, minutes, point, perPerson, total:perPerson * new Set(recipients).size};
 });
 s.autoCounts = Object.fromEntries(Object.entries(s.autoCounts).map(([key, counts]) => [
  key, counts.C14 ? {...counts, C14:{...counts.C14, each:true, fixedPer:undefined}} : counts,
 ]));
 return s;
}
export function requireSavedDaily(s:Source,date:string,shift:string){
 dailyKey(s,date,shift);
 if(!s.daily.some(d=>d.date===date&&d.shift===shift&&d.saved))throw new DailyValidationError('แก้ไขได้เฉพาะเวรที่บันทึกและส่งจาก Apps Script แล้ว');
}
export function dailyRows(s:Source,date:string,shift:string){
 requireSavedDaily(s,date,shift);
 const key=date+'|'+shift,details=s.assignments[key]?.details||[],staff=new Map([...s.staff,...s.headStaff].map(p=>[p.name,p]));
 const allowed=[...new Set<string>(details.filter((d:any)=>d.name&&!/^HW\b/.test(d.role||'')&&staff.has(d.name)).map((d:any)=>d.name))];
 return s.activities.map(a=>{const automatic=Object.prototype.hasOwnProperty.call(s.autoCounts[key]||{},a.id),auto=s.autoCounts[key]?.[a.id],record=s.records.find(r=>r.date===date&&r.shift===shift&&r.activityId===a.id);
 let names:string[]=a.category==='วิชาการ'&&a.id!=='C14'?details.filter((d:any)=>/^ประชุมวิชาการ/.test(d.role||'')).map((d:any)=>d.name):activityNames(details,a);
 names=[...new Set(names)].filter(n=>allowed.includes(n));
 return {...a,automatic,quantity:automatic?Number(auto.quantity||0):Number(record?.quantity||0),recipients:automatic?(auto.participants||auto.recipients||[]):record?.sourceRecipients||record?.recipients||[],eligible:names.map(name=>({name,displayName:staff.get(name)?.displayName||name})),divisor:activityDivisor(details,a),fixedRecipients:rnService(a)};
 });
}
export function prepareDailyEdit(s:Source,date:string,shift:string,entries:unknown){
 requireSavedDaily(s,date,shift);const key=date+'|'+shift,details=s.assignments[key]?.details||[];
 if(!details.length)throw new DailyValidationError('ยังไม่มีข้อมูลมอบหมายงานเวรนี้ กรุณาส่งข้อมูลจากระบบเดิมก่อน');
 if(!Array.isArray(entries)||entries.length>s.activities.length)throw new DailyValidationError('รายการกิจกรรมไม่ถูกต้อง');
 const rows=new Map(dailyRows(s,date,shift).map(a=>[a.id,a])),seen=new Set<string>();
 return entries.map((e:any)=>{if(!e||typeof e!=='object')throw new DailyValidationError('รายการกิจกรรมไม่ถูกต้อง');const a=rows.get(e.activityId);if(!a||a.automatic||seen.has(a.id))throw new DailyValidationError('กิจกรรมซ้ำหรือเป็นรายการอัตโนมัติ กรุณาโหลดใหม่');seen.add(a.id);
 const quantity=e.quantity;if(typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<=0||quantity>100000)throw new DailyValidationError('จำนวนกิจกรรมต้องมากกว่า 0 และไม่เกิน 100,000');
 const recipients:string[]=rnService(a)?a.eligible.map((n:any)=>n.name):Array.isArray(e.recipients)?[...new Set<string>(e.recipients)]:[];
 if(!recipients.length||recipients.some(n=>typeof n!=='string'||!a.eligible.some((p:any)=>p.name===n)))throw new DailyValidationError('กรุณาเลือกผู้รับคะแนนจากมอบหมายงาน: '+a.name);
 const divisor=a.type==='M'?a.divisor:recipients.length,each=rnService(a)?a.id==='S26':a.each||['S26','A01','A03'].includes(a.id)||a.category==='วิชาการ';
 const base=quantity*Number(a.minutes||0)*Number(a.point||0);
 const perPerson=a.id==='A02'?60.06:wholePatientType(a)?autoPer(a,{quantity,divisor,each}):each?base:divisor>0?base/divisor:0;
 if(!Number.isFinite(perPerson)||divisor<=0)throw new DailyValidationError('ไม่พบตัวหารคะแนน: '+a.name);
 return {id:'WEB:'+key+':'+a.id,date,shift,activityId:a.id,category:a.category,activity:a.name,scoreType:a.type,minutes:a.minutes,point:a.point,quantity,workers:divisor,divisor,recipients,sourceRecipients:recipients,perPerson,total:perPerson*recipients.length};
 });
}
