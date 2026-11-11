import 'server-only';
import {db,currentUser,canRead, type AuditUser} from '@/lib/audits/chartServer';
import {normalizeName,calculate,attachSignatures,documentOf} from './engine';
import {applyDailyEdits} from './daily';
import {readDailyTableContext,DailyTableReadError} from './tableRead';
import {mergeClaimSources} from './claimGroup';
import type {Source,P4PDocument,Staff} from './types';
export class P4PError extends Error{constructor(message:string,public status=400){super(message);}}
export const isManager=(u:AuditUser)=>['admin','head_nurse','head_group','head_department'].includes(u.role);
export async function userContext(departmentValue:unknown){const user=await currentUser();if(!user)throw new P4PError('กรุณาเข้าสู่ระบบ',401);const requestedId=departmentValue==null||departmentValue===''?user.departmentId:Number(departmentValue),departmentId=requestedId===8?4:requestedId;if(!Number.isSafeInteger(departmentId)||!departmentId||departmentId<=0)throw new P4PError('กรุณาระบุหน่วยงาน');if(!(departmentId===4&&user.departmentId===8)&&!await canRead(user,departmentId))throw new P4PError('ไม่มีสิทธิ์เข้าถึงหน่วยงานนี้',403);return{user,departmentId};}
export async function loadContext(departmentValue:unknown,monthValue:unknown,guaranteeValue?:unknown,readMode:'table'|'transaction'='table'){
 const {user,departmentId}=await userContext(departmentValue),month=String(monthValue||'');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new P4PError('เดือนไม่ถูกต้อง');
 const client=db(),[contextResult,{data:profile,error:pe}]=await Promise.all([
 readMode==='transaction'
  ? (departmentId===4?client.rpc('p4p_read_med5_claim',{p_month:month}):client.rpc('p4p_read_context_daily',{p_department_id:departmentId,p_month:month}))
  : readDailyTableContext(client,departmentId,month).then(data=>({data,error:null})),
 client.from('profiles').select('full_name').eq('id',user.id).single()]);
 const contextData:any=contextResult.data,se=contextResult.error;
 const sourceRow=contextData?.source,docs=contextData?.documents;
 if(se)throw new P4PError(p4pReadFailure('RPC',se),503);
 if(pe)throw new P4PError(p4pReadFailure('PROFILE',pe),503);

 if(!sourceRow)throw new P4PError('ไม่พบข้อมูล P4P ใน Supabase ของหน่วยงานและเดือนที่เลือก กรุณาตรวจ department_id, month และ project ที่เว็บไซต์เชื่อมต่อ',404);
 let source=applyDailyEdits(sourceRow.payload as Source);
 if(departmentId===4){try{source=mergeClaimSources(source,applyDailyEdits(contextData.companion.source.payload as Source));}catch(error){throw new P4PError(error instanceof Error?error.message:'รวมข้อมูลสองหน่วยงานไม่สำเร็จ',409);}}if(source.schemaVersion!==1)throw new P4PError('รุ่นข้อมูลต้นทางไม่รองรับ',409);
 const documents=(docs||[]) as P4PDocument[],unique=new Map([...source.staff,...source.headStaff].map(p=>[p.name,p]));
 const matches=[...unique.values()].filter(p=>normalizeName(p.displayName)===normalizeName(profile?.full_name));const ownName=matches.length===1?matches[0].name:null;
 const ownGroup=matches[0]?.group,normalGuarantee=ownGroup==='PN'?720:['NA','EMP'].includes(ownGroup||'')?600:1200;const guarantee=!isManager(user)?normalGuarantee:guaranteeValue==null?1200:Number(guaranteeValue);if(!Number.isFinite(guarantee)||guarantee<0||guarantee>100000)throw new P4PError('แต้มประกันไม่ถูกต้อง');
 const report=attachSignatures(calculate(source,documents,guarantee),documents);
 return{user,departmentId,month,source,sourceRevision:Number(departmentId===4?contextData.claimRevision:sourceRow.revision),directDailyCount:Number(contextData?.directDailyCount||0)+Number(contextData?.companion?.directDailyCount||0),updatedAt:sourceRow.updated_at,documents,report,ownName,manager:isManager(user)&&!(departmentId===4&&user.departmentId===8&&user.role==='head_department')};
}
export type Context=Awaited<ReturnType<typeof loadContext>>;
export function requirePerson(c:Context,name:string,managerOnly=false):Staff{if(managerOnly&&!c.manager)throw new P4PError('เฉพาะหัวหน้าหรือผู้ดูแลระบบ',403);if(!c.manager&&c.ownName!==name)throw new P4PError('ดำเนินการได้เฉพาะรายชื่อของตนเอง กรุณาตรวจชื่อเต็มในโปรไฟล์',403);const p=[...c.source.staff,...c.source.headStaff].find(p=>p.name===name);if(!p)throw new P4PError('ไม่พบรายชื่อผู้เบิก',404);return p;}
export function writeOrigin(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw new P4PError('แหล่งที่มาของคำขอไม่ถูกต้อง',403);}
export async function saveDocument(c:Context,name:string,kind:string,data:unknown,expectedVersion:number){
 const contextVersions=Object.fromEntries(['claims','head'].map(k=>[k,documentOf(c.documents,name,k)?.version||0]));
 const {data:result,error}=await db().rpc(c.departmentId===4?'p4p_save_med5_claim':'p4p_save_document',{...(c.departmentId===4?{}:{p_department_id:c.departmentId}),p_month:c.month,p_person_name:name,p_kind:kind,p_data:data,p_expected_version:expectedVersion,p_source_revision:c.sourceRevision,p_context_versions:contextVersions,p_user_id:c.user.id});
 if(error){if(/P4P_(SOURCE_CHANGED|DOCUMENT_CONFLICT|CONTEXT_CHANGED)/.test(error.message))throw new P4PError('ข้อมูลเปลี่ยนจากอีกหน้าต่าง กรุณาโหลดใหม่ก่อนบันทึก',409);if(/ANNUAL_CAP/.test(error.message))throw new P4PError('กิจกรรมที่จำกัด 2 ครั้ง/ปีเกินเกณฑ์',400);throw new P4PError('บันทึก P4P ไม่สำเร็จ ข้อมูลที่กรอกยังอยู่',503);}return result;
}
export function apiError(error:unknown){if(error instanceof DailyTableReadError)error=new P4PError(error.message,error.status);if(error instanceof P4PError)return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});console.error('P4P API error',error instanceof Error?error.name:'unknown');return Response.json({error:'ดำเนินการ P4P ไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ'},{status:500,headers:{'Cache-Control':'no-store'}});}
export const pngImage=(value:unknown)=>{const v=String(value||'');if(v.length>32000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(v))throw new P4PError('ภาพลายเซ็นต้องเป็น PNG ขนาดไม่เกินที่กำหนด');const bytes=Buffer.from(v.split(',')[1],'base64'),magic=Buffer.from([137,80,78,71,13,10,26,10]);if(bytes.length<40||!bytes.subarray(0,8).equals(magic)||bytes.toString('ascii',12,16)!=='IHDR')throw new P4PError('ไฟล์ลายเซ็น PNG ไม่ถูกต้อง');const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);if(w<1||h<1||w>1280||h>400)throw new P4PError('ขนาดลายเซ็นเกินกำหนด');return v;};

export function p4pReadFailure(phase:'RPC'|'PROFILE',error:{code?:string;message?:string}){
 const raw=String(error.code||''),code=/^[A-Za-z0-9_-]{1,24}$/.test(raw)?raw:'UNKNOWN';
 const known:Record<string,string>={P4P_GROUP_EXISTING_DOCUMENTS:'พบเอกสารเบิกเดิมที่พิเศษอายุรกรรม 5 กรุณาตรวจและย้ายเอกสารก่อนเปิดรวมเบิก',P4P_GROUP_SOURCE_MISSING:'ข้อมูลรายวันของอายุรกรรม 5 หรือพิเศษอายุรกรรม 5 ยังไม่ครบเดือนที่เลือก',P4P_SOURCE_CONNECTION:'การจับคู่ source_id / หน่วยงานยังไม่พร้อม',P4P_SOURCE_CONFLICT:'source_id ของข้อมูลรายวันไม่ตรงกับข้อมูลรวม',INVALID_P4P_DAILY_PAYLOAD:'รูปแบบ payload หรือชื่อหน่วยงานไม่ตรง',INVALID_P4P_DAILY_SHIFT:'วันหรือเวรใน payload ไม่ตรงกับแถวรายวัน',INVALID_P4P_DAILY_ARRAY:'payload ขาดรายการแบบ array',INVALID_P4P_DAILY_MAP:'payload ขาดข้อมูลแบบ object'};
 const validation=Object.keys(known).find(k=>String(error.message||'').includes(k));
 const causes:Record<string,string>={'42501':'สิทธิ์อ่านตารางหรือเรียกฟังก์ชันไม่ครบ','PGRST202':'ไม่พบ RPC ใน project ที่เว็บไซต์เชื่อมต่อ','42883':'ไม่พบฟังก์ชัน SQL ที่จำเป็น','57014':'คำสั่งฐานข้อมูลใช้เวลาเกินกำหนด','PGRST116':'ไม่พบโปรไฟล์หนึ่งรายการที่ตรงกับผู้ใช้','PGRST301':'key หรือสิทธิ์เชื่อมต่อไม่ถูกต้อง','PGRST303':'key หรือสิทธิ์เชื่อมต่อไม่ถูกต้อง'};
 return 'อ่าน P4P ไม่สำเร็จ ['+phase+':'+(validation||code)+'] '+(validation?known[validation]:causes[code]||(phase==='PROFILE'?'อ่านโปรไฟล์ผู้ใช้ไม่ได้':'เรียกฐานข้อมูลรายวันไม่ได้ กรุณาตรวจ Vercel Runtime Logs'));
}
