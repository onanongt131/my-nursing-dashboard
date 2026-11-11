export type DischargeRow={date:unknown;shift:unknown;discharge:unknown;transfer_out:unknown;dead:unknown};
export function summarizeAmaDischarges(rows:DischargeRow[],month:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('กรุณาเลือกเดือน');
 const [y,m]=month.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate();
 const missing:string[]=[],duplicate:string[]=[],invalid:string[]=[];let total=0;
 const groups=new Map<string,DischargeRow[]>();
 for(const row of rows){const shift=String(row.shift||'').trim().replace(/^เวร/,'');if(!['ดึก','เช้า','บ่าย'].includes(shift))continue;const key=String(row.date).slice(0,10)+' '+shift;groups.set(key,[...(groups.get(key)||[]),row]);}
 for(let d=1;d<=days;d++)for(const shift of ['ดึก','เช้า','บ่าย']){const key=`${month}-${String(d).padStart(2,'0')} ${shift}`,entries=groups.get(key)||[];
 if(!entries.length){missing.push(key);continue;}if(entries.length!==1){duplicate.push(key);continue;}
 const values=[entries[0].discharge,entries[0].transfer_out,entries[0].dead];if(values.some(raw=>raw==null||String(raw).trim()===''||!Number.isSafeInteger(Number(raw))||Number(raw)<0)){invalid.push(key);continue;}total+=values.reduce<number>((sum,raw)=>sum+Number(raw),0);}
 const complete=!missing.length&&!duplicate.length&&!invalid.length;
 return {complete,total:complete?total:null,missing,duplicate,invalid,expected:days*3,valid:days*3-missing.length-duplicate.length-invalid.length};
}
