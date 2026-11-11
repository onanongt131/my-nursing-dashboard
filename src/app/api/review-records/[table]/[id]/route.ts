import {isDialysisDepartment} from '@/lib/dialysisServer';
import {readmitDenominator,requireComplete} from '@/lib/unitRecords/monthlyStats';
import {requiresReview} from '@/lib/review/period';
import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canCreate,canApprove,fail,unexpected,isRecord,validDate,validateLRSubmission,validateLRDraft,validateSpecialUnitAnswers} from '@/lib/audits/chartServer';
import {fields,derived,numeric,choices,labels} from '@/lib/review/fields';
import {validatePressureSore,emptyPressureSore,type PressureSoreValues} from '@/lib/pressureSore';
import {pressurePatientDays,isPressureSoreIpd} from '@/lib/pressureSoreServer';
import {summarizeFallPatientDays} from '@/lib/fallPatientDays';
import {summarizeAmaDischarges} from '@/lib/amaDischarges';
import {IV_FACTOR_GROUPS} from '@/lib/ivCareFactors';
import {wpSpecialCriteria,type WpFormType} from '@/lib/wpSpecialCriteria';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{table:string;id:string}>};
async function context(c:Context){const {table,id}=await c.params;if(!Object.hasOwn(fields,table)||!/^([0-9]+|[0-9a-f-]{36})$/i.test(id))return {error:fail('รายการไม่ถูกต้อง')};const user=await currentUser();if(!user)return {error:fail('กรุณาเข้าสู่ระบบ',401)};const {data:item,error}=await db().from(table).select('*').eq('id',id).maybeSingle();if(error)return {error:unexpected(error)};if(!item)return {error:fail('ไม่พบรายการ',404)};if(!requiresReview(item))return {error:fail('ข้อมูลก่อนปีงบประมาณ 2570 ไม่อยู่ในขั้นตอนแก้ไขและอนุมัติ',409)};const dept=Number(item.department_id);if(!canCreate(user,dept))return {error:fail('ไม่มีสิทธิ์แก้ไขหน่วยงานนี้',403)};if(!['pending','draft'].includes(item.status))return {error:fail('อนุมัติแล้วหรือไม่อยู่ในสถานะที่แก้ไขได้',409)};if(item.created_by&&item.created_by!==user.id&&!canApprove(user,dept))return {error:fail('แก้ไขได้เฉพาะผู้บันทึกหรือหัวหน้าผู้มีสิทธิ์',403)};return {table,id,user,item,dept};}
async function computed(table:string,item:Record<string,any>,dept:number,manualFall:boolean){
 const changes:Record<string,number>={};if(table==='pressure_sore_monthly_summaries'){const days=await pressurePatientDays(dept,item.month);if(!days.complete)throw new Error('ข้อมูลคงพยาบาลเวรบ่ายไม่ครบ กรุณาแก้สถิติต้นทาง');changes.surveillance_patient_days=days.total as number;}
 if((table==='fall_monthly_summary'&&!manualFall)||table==='ama_monthly_summary'){
  const month=`${Number(item.fiscal_year)-543}-${String(item.month).padStart(2,'0')}`;const [y,m]=month.split('-').map(Number),end=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);const rows:any[]=[];
  for(let offset=0;;offset+=1000){const {data,error}=await db().from('daily_staffing').select('id,date,shift,nursing_count,discharge,transfer_out,dead').eq('department_id',String(dept)).gte('date',month+'-01').lt('date',end).order('id').range(offset,offset+999);if(error)throw new Error('โหลดสถิติต้นทางไม่สำเร็จ');rows.push(...data);if(data.length<1000)break;}
  const result=table==='fall_monthly_summary'?summarizeFallPatientDays(rows,month):summarizeAmaDischarges(rows,month);if(!result.complete)throw new Error('ข้อมูลสถิติต้นทางไม่ครบหรือมีเวรซ้ำ กรุณาแก้สถิติก่อน');changes[table==='fall_monthly_summary'?'patient_days':'total_discharges']=result.total as number;
 }
 if(table==='readmit_monthly_summary'){
  const month=`${Number(item.fiscal_year)-543}-${String(item.month).padStart(2,'0')}`;
  const result=await readmitDenominator(dept,month);
  if(!result.manual){requireComplete(!!result.stats?.complete,'ยอดจำหน่ายแพทย์อนุญาตเดือนก่อนหน้าไม่ครบ กรุณาตรวจสถิติ');changes.prev_month_discharges=result.stats!.total!;}
 }
 return changes;
}
function derivedFor(table:string,item:Record<string,any>,manualFall:boolean){
 return [...(manualFall?[]:derived[table]||[]),...(table==='readmit_monthly_summary'&&Number(item.month)!==10?['prev_month_discharges']:[])];
}
export async function GET(_r:NextRequest,c:Context){try{const x=await context(c);if(x.error)return x.error;return NextResponse.json({item:x.item,fields:fields[x.table!].filter(k=>k in x.item!),derived:derivedFor(x.table!,x.item!,x.table==='fall_monthly_summary'&&await isDialysisDepartment(x.dept!))},{headers:{'Cache-Control':'no-store'}});}catch(e){return unexpected(e);}}
export async function PATCH(r:NextRequest,c:Context){try{
 const x=await context(c);if(x.error)return x.error;const {table,id,item,dept}=x as Required<typeof x>;const body=await r.json().catch(()=>null);if(!isRecord(body)||!isRecord(body.changes)||!isRecord(body.original))return fail('ข้อมูลแก้ไขไม่ถูกต้อง');
 const manualFall=table==='fall_monthly_summary'&&await isDialysisDepartment(dept);
 const writable=fields[table].filter(k=>k in item),changes:Record<string,any>={};
 for(const [key,value] of Object.entries(body.changes)){
  if(!writable.includes(key)||derivedFor(table,item,manualFall).includes(key))return fail('ไม่อนุญาตให้แก้ช่องนี้');
  if(JSON.stringify(body.original[key])!==JSON.stringify(item[key]))return fail('ข้อมูลเปลี่ยนแล้ว กรุณาปิดและเปิดแก้ไขใหม่',409);
  if(key==='answers'||key==='contributing_factors'){if(!isRecord(value)||JSON.stringify(value).length>60000)return fail('ข้อมูลปัจจัย/คำตอบไม่ถูกต้อง');changes[key]=value;continue;}
  if(numeric.has(key)||/^s\d_/.test(key)&&!key.endsWith('notes')){if(value===null&&item[key]===null){changes[key]=null;continue;}if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return fail(`กรุณากรอก ${labels[key]||key} เป็นจำนวนเต็มตั้งแต่ 0`);if((/^s\d_/.test(key)||key==='grade')&&![1,2,3,4].includes(value))return fail('คะแนนต้องเป็น 1–4');}
  else {if(value!==null&&(typeof value!=='string'||value.length>6000))return fail('ข้อความไม่ถูกต้อง');if(key.endsWith('date')&&value&&!validDate(value))return fail('วันที่ไม่ถูกต้อง');if(key==='audit_month'&&(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)))return fail('เดือนผิดรูปแบบ');}
  if(choices[key]&&value!==null&&!choices[key].includes(String(value)))return fail(`ตัวเลือก ${labels[key]||key} ไม่ถูกต้อง`);changes[key]=typeof value==='string'?value.trim():value;
 }
 const merged={...item,...changes};
 if(!requiresReview(merged))return fail('แก้ไขได้เฉพาะข้อมูลปีงบประมาณ 2570 เป็นต้นไป');
 const required:Record<string,string[]>={nursing_chart_audits:['audit_date','auditor_name'],wp_qa_records:['audit_month','auditor_name'],iv_care_complications:['record_date','hn','complication','grade','route','site'],iv_care_monthly_summaries:['audit_month','total_infusion_days','total_sites','total_punctures','first_attempt_punctures'],fall_incident_records:['incident_date','hn','shift','severity','risk_score','description'],readmit_incident_records:['hn','an'],ama_incident_records:['incident_date','hn','an','treatment_right','ama_reason'],nso_special_audits:['audit_date','auditor_name'],nso_special_wp_records:['audit_month','auditor_name']};
 for(const key of required[table]||[])if(merged[key]===null||merged[key]===undefined||String(merged[key]).trim()==='')return fail(`กรุณาระบุ ${labels[key]||key}`);

 if(table==='nso_special_audits'){
  if(!isRecord(merged.answers))return fail('คำตอบไม่ถูกต้อง');const issue=merged.form_type==='lr'?(item.status==='pending'?validateLRSubmission:validateLRDraft)(merged.answers):validateSpecialUnitAnswers(merged.form_type,merged.answers,item.status==='pending');if(issue)return fail(issue);
  let total=0,max=0;for(const value of Object.values(merged.answers)){if(isRecord(value)&&!value.na&&typeof value.score==='number'){total+=value.score;max+=merged.form_type==='hbot'?1:4;}}Object.assign(changes,{total_score:total,max_score:max,percentage:max?total/max*100:0});if(changes.audit_date)changes.audit_month=changes.audit_date.slice(0,7);
 }
 if(table==='nso_special_wp_records'){
  const rubric=wpSpecialCriteria[merged.form_type as WpFormType];if(!rubric||!isRecord(merged.answers))return fail('แบบ WP ไม่ถูกต้อง');const keys=rubric.flatMap(g=>g.items).map(i=>i.id);if(Object.keys(merged.answers).some(k=>k!=='_general_note'&&!keys.includes(k)))return fail('ข้อ WP ไม่ถูกต้อง');for(const key of keys){const a=merged.answers[key];if(!isRecord(a)||!Number.isSafeInteger(a.total_evaluated)||Number(a.total_evaluated)<1||!Number.isSafeInteger(a.total_practiced)||Number(a.total_practiced)<0||Number(a.total_practiced)>Number(a.total_evaluated)||Number(a.total_practiced)<Number(a.total_evaluated)&&!String(a.unpracticed_reasons||'').trim())return fail(`กรุณาตรวจจำนวนและเหตุผลข้อ ${key}`);}
 }
 if(table==='wp_qa_records'&&(merged.total_evaluated<1||merged.total_practiced>merged.total_evaluated||merged.total_practiced<merged.total_evaluated&&!String(merged.unpracticed_reasons||'').trim()))return fail('จำนวนปฏิบัติต้องไม่เกินจำนวนประเมิน และต้องระบุเหตุผลเมื่อปฏิบัติไม่ครบ');
 if(table==='iv_care_monthly_summaries'&&merged.first_attempt_punctures>merged.total_punctures)return fail('จำนวนสำเร็จครั้งแรกต้องไม่เกินจำนวนแทงทั้งหมด');
 if(changes.contributing_factors){const f=changes.contributing_factors;if(f.version!==1||!Array.isArray(f.groups))return fail('รูปแบบปัจจัยผิด');const seen=new Set();for(const g of f.groups){const config=IV_FACTOR_GROUPS.find(x=>x.code===g.code);if(!config||!Array.isArray(g.items)||seen.has(g.code))return fail('หมวดปัจจัยผิด');seen.add(g.code);const parents=new Set();for(const a of g.items){const p=config.children.find(x=>x.code===a.code);if(!p||parents.has(a.code)||typeof a.detail!=='string'||!a.detail.trim()||!Array.isArray(a.causes))return fail('กรุณาตรวจรายละเอียดปัจจัย');parents.add(a.code);if(a.causes.some((sub:any)=>!p.options.some(x=>x.code===sub.code)))return fail('สาเหตุย่อยผิด');}}}
 if(table.startsWith('pressure_sore_')){if(!await isPressureSoreIpd(dept))return fail('หน่วยงานไม่ได้เปิด Pressure sore');if(table==='pressure_sore_incident_records'){const values={...emptyPressureSore};for(const key of Object.keys(values))values[key as keyof PressureSoreValues]=String(merged[key]??'');const issue=validatePressureSore(values);if(issue)return fail(issue.message);if(merged.discharge_status!=='ย้าย')changes.transfer_department_id=null;else {const {data:target}=await db().from('departments').select('id').eq('id',merged.transfer_department_id).maybeSingle();if(!target)return fail('ไม่พบหน่วยงานรับย้าย');}}}
 try{Object.assign(changes,await computed(table,merged,dept,manualFall));}catch(e){return fail(e instanceof Error?e.message:'ตรวจยอดไม่ได้',409);}
 if(table==='pressure_sore_monthly_summaries'&&merged.at_risk_patient_days>changes.surveillance_patient_days)return fail('วันนอนกลุ่มเสี่ยงเกินวันนอนรวม');
 if('updated_at'in item)changes.updated_at=new Date().toISOString();
 let query=db().from(table).update(changes).eq('id',id).eq('status',item.status);
 for(const key of writable){if(item[key]===null)query=query.is(key,null);else if(item[key]!==undefined)query=query.eq(key,typeof item[key]==='object'?JSON.stringify(item[key]):item[key]);}
 const {data,error}=await query.select('*').maybeSingle();if(error)return unexpected(error);if(!data)return fail('รายการถูกแก้ไขหรืออนุมัติแล้ว กรุณาโหลดใหม่',409);
 return NextResponse.json({item:data},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
