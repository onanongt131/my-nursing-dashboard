import {currentUser,canCreate,canRead,canApprove,db,fail,validDept,isRecord} from '@/lib/audits/chartServer';
import {wpRows,chartPayload,AuditInputError} from '@/lib/ipdAuditValidation';
export const dynamic='force-dynamic';
const reply=(body:unknown)=>Response.json(body,{headers:{'Cache-Control':'private, no-store'}});
function failure(error:unknown){return error instanceof AuditInputError?fail(error.message):fail('ดำเนินการ Audit/WP ไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ',503);}
export async function GET(request:Request){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ',401);
 const id=Number(new URL(request.url).searchParams.get('department_id'));if(!validDept(id))return fail('หน่วยงานไม่ถูกต้อง');if(!await canRead(user,id))return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้',403);
 const records:Record<string,unknown>[]=[];for(let offset=0;;offset+=1000){const {data,error}=await db().from('nursing_chart_audits').select('*').eq('department_id',id).eq('status','pending').order('audit_date',{ascending:false}).order('id').range(offset,offset+999);if(error)return fail('อ่าน Audit ที่รออนุมัติไม่สำเร็จ',503);records.push(...(data||[]));if(!data||data.length<1000)break;}
 return reply({records});
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return fail('แหล่งที่มาคำขอไม่ถูกต้อง',403);
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ',401);
 const text=await request.text();if(text.length>100000)return fail('ข้อมูลใหญ่เกินกำหนด',413);let b;try{b=JSON.parse(text);}catch{return fail('ข้อมูลไม่ถูกต้อง');}
 if(!isRecord(b)||!validDept(b.department_id))return fail('หน่วยงานไม่ถูกต้อง');const id=b.department_id,client=db();
 if(b.action==='chart-approve'){
  if(!canApprove(user,id))return fail('ไม่มีสิทธิ์อนุมัติหน่วยงานนี้',403);
  if(!['string','number'].includes(typeof b.id)||!/^[A-Za-z0-9-]{1,80}$/.test(String(b.id)))return fail('รหัสรายการไม่ถูกต้อง');
  const {data:rows,error}=await client.from('nursing_chart_audits').update({status:'approved'}).eq('id',b.id).eq('department_id',id).eq('status','pending').select('id');
  if(error)return fail('บันทึกอนุมัติไม่สำเร็จ',503);if(rows?.length!==1)return fail('ไม่พบรายการรออนุมัติในหน่วยงานนี้ หรือรายการเปลี่ยนแล้ว',409);return reply({approved:true});
 }
 if(!canCreate(user,id))return fail('บันทึกได้เฉพาะหน่วยงานที่ได้รับสิทธิ์',403);
 let table:string,payload:Record<string,unknown>|Record<string,unknown>[];
 if(b.action==='wp-save'){
  const {data:department,error}=await client.from('departments').select('Department').eq('id',id).maybeSingle();
  if(error||!department?.Department)return fail('ตรวจสอบชื่อหน่วยงานสำหรับแบบประเมิน WP ไม่สำเร็จ',503);
  table='wp_qa_records';payload=wpRows(b,id,department.Department);
 }
 else if(b.action==='chart-save'){table='nursing_chart_audits';payload=chartPayload(b.answers,id);}
 else return fail('คำสั่งไม่ถูกต้อง');
 let {error}=await client.from(table).insert(payload);
 if(b.action==='chart-save'&&error?.code==='22P02'&&!Array.isArray(payload)){
  const naKeys=Object.keys(payload).filter(key=>/^s[1-5]_/.test(key)&&!key.endsWith('_notes')&&payload[key]==='NA');
  if(naKeys.length){
   const numericPayload:Record<string,unknown>={...payload,audit_na_keys:naKeys};
   for(const key of naKeys)numericPayload[key]=null;
   ({error}=await client.from(table).insert(numericPayload));
  }
 }
 if(error){
  console.error('IPD audit save failed',{table,code:error.code});
  const code=/^[A-Z0-9]{5,8}$/.test(error.code)?' (รหัส '+error.code+')':'';
  return fail('บันทึกไม่สำเร็จ กรุณาตรวจโครงสร้างตาราง Audit/WP'+code,503);
 }
 return reply({saved:true,status:'pending'});
}catch(error){return failure(error);}}
