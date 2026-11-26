import 'server-only';
import {db} from '@/lib/audits/chartServer';
import {summarizePressurePatientDays,type StaffingRow} from '@/lib/pressurePatientDays';
export async function isPressureSoreIpd(departmentId:number){
 const {data,error}=await db().from('departments').select('id,Department,pressure_sore_enabled').eq('id',departmentId).maybeSingle();
 if(error)throw error;return data?.pressure_sore_enabled===true;
}
export async function pressurePatientDays(departmentId:number,month:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Invalid month');
 const start=month+'-01',endDate=new Date(start+'T00:00:00Z');endDate.setUTCMonth(endDate.getUTCMonth()+1);const end=endDate.toISOString().slice(0,10);
 const rows:StaffingRow[]=[];
 for(let offset=0;;offset+=1000){const {data,error}=await db().from('daily_staffing').select('id,date,shift,nursing_count').eq('department_id',String(departmentId)).gte('date',start).lt('date',end).order('id').range(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<1000)break;}
 return summarizePressurePatientDays(rows,month);
}
