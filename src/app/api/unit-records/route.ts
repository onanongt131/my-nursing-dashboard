import {isDialysisDepartment} from '@/lib/dialysisServer';
import {fallStats,fallPatientDays,amaStats,readmitDenominator,requireComplete} from '@/lib/unitRecords/monthlyStats';
import {currentUser,canCreate,canRead,db,fail,validDept,isRecord} from '@/lib/audits/chartServer';
import {InputError,monthScope,prepareRecord} from '@/lib/unitRecords/validation';
import {requiresReview} from '@/lib/review/period';
export const dynamic='force-dynamic';
const reply=(body:unknown)=>Response.json(body,{headers:{'Cache-Control':'private, no-store'}});
async function countReadmits(departmentId:number,scope:ReturnType<typeof monthScope>){const {count,error}=await db().from('readmit_incident_records').select('id',{count:'exact',head:true}).eq('department_id',departmentId).gte('admit_date',scope.start).lt('admit_date',scope.end);if(error)throw new Error('COUNT_FAILED');return count||0;}
function failure(error:unknown){return error instanceof InputError?fail(error.message):fail('อ่านหรือบันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้งหรือติดต่อผู้ดูแลระบบ',503);}
export async function GET(request:Request){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบใหม่',401);
 const q=new URL(request.url).searchParams,id=Number(q.get('department_id'));
 if(!validDept(id))return fail('หน่วยงานไม่ถูกต้อง');if(!await canRead(user,id))return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้',403);
 const scope=monthScope(q.get('month')),kind=q.get('kind')||'readmit';
 if(kind==='fall')return reply(await fallStats(id,scope.month));
 if(kind==='ama')return reply(await amaStats(id,scope.month));
 if(kind!=='readmit')return fail('ชนิดรายการไม่ถูกต้อง');
 return reply({month:scope.month,count:await countReadmits(id,scope),denominator:await readmitDenominator(id,scope.month)});
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return fail('แหล่งที่มาคำขอไม่ถูกต้อง',403);
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบใหม่',401);
 const raw=await request.text();if(raw.length>70000)return fail('ข้อมูลใหญ่เกินกำหนด',413);let b;try{b=JSON.parse(raw);}catch{return fail('ข้อมูลไม่ถูกต้อง');}
 if(!isRecord(b)||!validDept(b.department_id))return fail('หน่วยงานไม่ถูกต้อง');
 if(!canCreate(user,b.department_id))return fail('บัญชีนี้บันทึกได้เฉพาะหน่วยงานที่ได้รับสิทธิ์',403);
 const record=prepareRecord(String(b.action||''),b,b.department_id),payload:Record<string,unknown>={...record.payload,status:requiresReview(record.payload)?'pending':'approved'};
 if(record.scope){
  payload.readmit_count=await countReadmits(b.department_id,record.scope);
  const denominator=await readmitDenominator(b.department_id,record.scope.month);
  if(!denominator.manual){requireComplete(!!denominator.stats?.complete,'ยอดจำหน่ายแพทย์อนุญาตเดือนก่อนหน้ายังไม่ครบ กรุณาตรวจสถิติหอผู้ป่วย');payload.prev_month_discharges=denominator.stats!.total;}
 }
 if(b.action==='fall-summary'){
  if(await isDialysisDepartment(b.department_id)){
   const days=b.patient_days;
   if(typeof days!=='number'||!Number.isSafeInteger(days)||days<0||days>100000000)return fail('กรุณากรอกวันนอนเป็นจำนวนเต็มตั้งแต่ 0');
   payload.patient_days=days;
  }else{
   const days=await fallPatientDays(b.department_id,monthScope(b.month).month);
   requireComplete(days.complete,'ยอดคงพยาบาลเวรบ่ายยังไม่ครบหรือมีข้อมูลซ้ำ กรุณาตรวจสถิติหอผู้ป่วย');
   payload.patient_days=days.total;
  }
 }
 if(b.action==='ama-summary'){
  const result=await amaStats(b.department_id,monthScope(b.month).month);
  requireComplete(result.stats.complete,'ยอดจำหน่ายยังไม่ครบทุกเวรหรือมีข้อมูลซ้ำ กรุณาตรวจสถิติหอผู้ป่วย');payload.total_discharges=result.stats.total;payload.ama_count=result.ama;
 }
 // Explicit payload allowlist above prevents changing status, approver, ID or another department.
 const {error}=record.conflict?await db().from(record.table).upsert(payload,{onConflict:record.conflict}):await db().from(record.table).insert(payload);
 if(error){console.error('Unit record write failed',{table:record.table,code:error.code});return fail('บันทึกข้อมูลไม่สำเร็จ กรุณาให้ผู้ดูแลตรวจโครงสร้างตารางและการเชื่อมต่อเซิร์ฟเวอร์',503);}
 return reply({saved:true,status:payload.status});
}catch(error){return failure(error);}}
