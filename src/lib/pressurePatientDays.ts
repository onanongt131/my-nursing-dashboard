export type StaffingRow={date:unknown;shift:unknown;nursing_count:unknown};
export function summarizePressurePatientDays(rows:StaffingRow[],month:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Invalid month');
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const missing:string[]=[],duplicates:string[]=[],invalid:string[]=[];let partial=0;
 const byDate=new Map<string,StaffingRow[]>();
 for(const row of rows){if(!['เวรบ่าย','บ่าย'].includes(String(row.shift||'').trim()))continue;const date=String(row.date||'').slice(0,10);if(!date.startsWith(month+'-'))continue;byDate.set(date,[...(byDate.get(date)||[]),row]);}
 for(let day=1;day<=days;day++){const date=`${month}-${String(day).padStart(2,'0')}`,entries=byDate.get(date)||[];
 if(!entries.length){missing.push(date);continue;}if(entries.length!==1){duplicates.push(date);continue;}
 const raw=entries[0].nursing_count,value=Number(raw);if(raw===null||raw===undefined||String(raw).trim()===''||!Number.isSafeInteger(value)||value<0){invalid.push(date);continue;}partial+=value;}
 const complete=missing.length===0&&duplicates.length===0&&invalid.length===0;
 return {complete,total:complete?partial:null,partial_total:partial,expected_days:days,valid_days:days-missing.length-duplicates.length-invalid.length,missing_dates:missing,duplicate_dates:duplicates,invalid_dates:invalid};
}
