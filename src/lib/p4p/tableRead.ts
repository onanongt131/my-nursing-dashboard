import 'server-only';
import type {db} from '@/lib/audits/chartServer';
import type {Source,P4PDocument,Staff} from './types';
type Client=ReturnType<typeof db>;
type Packet={department_id:number;month:string;date:string;shift:string;source_id:string;version:number;updated_at:string;payload:Source};
type Projection={department_id:number;month:string;source_id:string;revision:number;updated_at:string;native_daily:Source['nativeDaily']};
export class DailyTableReadError extends Error{constructor(message:string,public status=503){super(message);}}
const bad=(message:string):never=>{throw new DailyTableReadError(message,409);};
function check(error:{code?:string}|null,table:string){if(!error)return;const code=/^[A-Za-z0-9_-]{1,24}$/.test(error.code||'')?error.code:'UNKNOWN';throw new DailyTableReadError(`อ่าน P4P จาก ${table} ไม่สำเร็จ [${code}] กรุณาตรวจการเชื่อมต่อและสิทธิ์เซิร์ฟเวอร์`);}
const arrays=['staff','headStaff','activities','records','daily','roster','statistics','procedures','rosterNameOrder'] as const;
const maps=['autoCounts','assignments','morningDischarges'] as const;
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** Match the daily-only reader's merge rules without a monthly JSON aggregate in PostgreSQL. */
export function foldDailyPackets(packets:Packet[],month:string,ward:string,sourceId:string,native:Source['nativeDaily']):Source{
 if(!packets.length)bad('ไม่พบข้อมูลรายวัน P4P ของเดือนที่เลือก');
 const latest=packets[packets.length-1].payload;
 if(!object(latest))bad('รูปแบบ payload รายวัน P4P ไม่ถูกต้อง');
 const source:Source={schemaVersion:1,month,ward,supervisorName:latest.supervisorName,activities:latest.activities,
  staff:[],headStaff:[],records:[],daily:[],roster:[],statistics:[],procedures:[],rosterImported:false,
  rosterNameOrder:[],autoCounts:Object.create(null),assignments:Object.create(null),morningDischarges:Object.create(null),nativeDaily:native||{},legacyHeads:[],legacySignatureSamples:[]};
 const people=new Map<string,Staff>(),heads=new Map<string,Staff>();
 for(const row of packets){
  const p=row.payload;
  if(row.month!==month||row.source_id!==sourceId||p?.schemaVersion!==1||p.month!==month||p.ward!==ward)bad('หน่วยงานหรือ source_id ของข้อมูลรายวัน P4P ไม่ตรงกัน กรุณาตรวจต้นทาง');
  if(!['เวรเช้า','เวรบ่าย','เวรดึก'].includes(row.shift)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))bad('วันหรือเวรของข้อมูลรายวัน P4P ไม่ถูกต้อง');
  const date=new Date(row.date+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==row.date)bad('วันที่ของข้อมูลรายวัน P4P ไม่ถูกต้อง');
  if(row.shift==='เวรดึก')date.setUTCDate(date.getUTCDate()-1);
  if(date.toISOString().slice(0,7)!==month)bad('เดือนเบิกกับวันและเวรในข้อมูลรายวัน P4P ไม่ตรงกัน');
  if(arrays.some(key=>!Array.isArray(p[key]))||maps.some(key=>!object(p[key])))bad('โครงสร้างข้อมูลรายวัน P4P ไม่ครบ กรุณาส่งข้อมูลต้นทางใหม่');
  if(p.daily.length!==1||p.daily[0].date!==row.date||p.daily[0].shift!==row.shift||p.daily[0].saved!==true)bad('วันหรือเวรใน payload รายวัน P4P ไม่ตรงกับแถวฐานข้อมูล');
  for(const field of ['records','roster','statistics','procedures'] as const){
   if(p[field].some((item:any)=>item.date!==row.date||item.shift!==row.shift))bad('พบข้อมูลต่างเวรใน payload รายวัน P4P');
   source[field].push(...p[field] as any);
  }
  source.daily.push(...p.daily);source.rosterImported=source.rosterImported||p.rosterImported===true;
  if(p.rosterNameOrder.length)source.rosterNameOrder=p.rosterNameOrder;
  for(const person of p.staff)people.set(person.name,person);
  for(const person of p.headStaff)heads.set(person.name,person);
  Object.assign(source.autoCounts,p.autoCounts);Object.assign(source.assignments,p.assignments);Object.assign(source.morningDischarges,p.morningDischarges);
 }
 const byName=(a:Staff,b:Staff)=>a.name<b.name?-1:a.name>b.name?1:0;
 source.staff=[...people.values()].sort(byName);source.headStaff=[...heads.values()].sort(byName);
 return source;
}

async function documentMetadata(client:Client,departmentId:number,month:string){
 const rows:Record<string,any>[]=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await client.from('p4p_documents').select('person_name,kind,version,updated_at').eq('department_id',departmentId).eq('month',month).order('person_name').order('kind').range(offset,offset+999);
  check(error,'p4p_documents');rows.push(...(data||[]));if((data||[]).length<1000)return rows;
 }
}
async function metadata(client:Client,departmentId:number,month:string){
 const [{data:projection,error:se},{data:days,error:de},documents]=await Promise.all([
  client.from('p4p_sources').select('department_id,month,source_id,revision,updated_at,native_daily:payload->nativeDaily').eq('department_id',departmentId).eq('month',month).maybeSingle(),
  client.from('p4p_daily_records').select('department_id,month,date,shift,source_id,version,updated_at').eq('department_id',departmentId).eq('month',month).order('updated_at').order('date').order('shift'),
  documentMetadata(client,departmentId,month),
 ]);
 check(se,'p4p_sources');check(de,'p4p_daily_records');
 return {projection:projection as unknown as Projection|null,days:days||[],documents:documents||[]};
}
const daysStamp=(rows:Record<string,any>[])=>JSON.stringify(rows.map(row=>[row.department_id,row.month,row.date,row.shift,row.source_id,row.version,row.updated_at]));
const docsStamp=(rows:Record<string,any>[])=>JSON.stringify(rows.map(row=>[row.person_name,row.kind,row.version,row.updated_at]));
const stamp=(m:Awaited<ReturnType<typeof metadata>>)=>JSON.stringify([m.projection,daysStamp(m.days),docsStamp(m.documents)]);

async function readScope(client:Client,departmentId:number,month:string){
 const before=await metadata(client,departmentId,month);
 if(!before.days.length)throw new DailyTableReadError('ไม่พบข้อมูลใน p4p_daily_records ของหน่วยงานและเดือนที่เลือก',404);
 const sourceId=before.days[0].source_id;
 if(before.projection&&before.projection.source_id!==sourceId)bad('source_id ของข้อมูลรายวันไม่ตรงกับหน่วยงาน กรุณาตรวจต้นทาง');
 const {data:connection,error:ce}=await client.from('p4p_connections').select('ward_name').eq('source_id',sourceId).eq('department_id',departmentId).eq('enabled',true).maybeSingle();
 check(ce,'p4p_connections');if(!connection)throw new DailyTableReadError('ไม่พบการเชื่อมต่อ P4P ที่เปิดใช้งานของหน่วยงานนี้',409);
 const packets:Packet[]=[];
 // Small payload pages, up to four concurrent reads, keep each response bounded.
 const size=6;
 for(let wave=0;wave<before.days.length;wave+=size*4){
  const offsets=Array.from({length:Math.min(4,Math.ceil((before.days.length-wave)/size))},(_,i)=>wave+i*size);
  const pages=await Promise.all(offsets.map(async offset=>{
   const {data,error}=await client.from('p4p_daily_records').select('department_id,month,date,shift,source_id,version,updated_at,payload')
    .eq('department_id',departmentId).eq('month',month).order('updated_at').order('date').order('shift').range(offset,Math.min(offset+size,before.days.length)-1);
   check(error,'p4p_daily_records');return (data||[]) as unknown as Packet[];
  }));for(const page of pages)packets.push(...page);
 }
 const documents:P4PDocument[]=[];
 for(let offset=0;;offset+=200){const {data,error}=await client.from('p4p_documents').select('department_id,month,person_name,kind,data,version,updated_at').eq('department_id',departmentId).eq('month',month).order('person_name').order('kind').range(offset,offset+199);check(error,'p4p_documents');documents.push(...(data||[]) as P4PDocument[]);if((data||[]).length<200)break;}
 const after=await metadata(client,departmentId,month);
 const actualDays=packets.map(({payload,...row})=>row);
 const actualDocs=documents.map(({person_name,kind,version,updated_at})=>({person_name,kind,version,updated_at}));
 if(stamp(before)!==stamp(after)||daysStamp(before.days)!==daysStamp(actualDays)||docsStamp(before.documents)!==docsStamp(actualDocs))bad('ข้อมูล P4P เปลี่ยนระหว่างโหลด กรุณาโหลดใหม่');
 const payload=foldDailyPackets(packets,month,connection.ward_name,sourceId,before.projection?.native_daily);
 const updatedAt=[before.projection?.updated_at,...packets.map(row=>row.updated_at)].filter(Boolean).sort().pop();
 return {source:{payload,revision:Number(before.projection?.revision||0),updated_at:updatedAt},documents,directDailyCount:packets.length,_stamp:stamp(after)};
}

export async function readDailyTableContext(client:Client,departmentId:number,month:string){
 if(departmentId!==4)return readScope(client,departmentId,month);
 const [primary,secondary]=await Promise.all([readScope(client,4,month),readScope(client,8,month)]);
 if(secondary.documents.length)bad('พบเอกสารเบิกเดิมที่พิเศษอายุรกรรม 5 กรุณาตรวจและย้ายเอกสารก่อนเปิดรวมเบิก');
 // Only hash two revision numbers; this RPC neither reads nor aggregates daily JSON.
 const {data:revision,error}=await client.rpc('p4p_claim_revision_token',{p_revision_a:primary.source.revision,p_revision_b:secondary.source.revision});
 check(error,'p4p_claim_revision_token');
 const current=await Promise.all([metadata(client,4,month),metadata(client,8,month)]);
 if(stamp(current[0])!==primary._stamp||stamp(current[1])!==secondary._stamp)bad('ข้อมูล P4P ของสองหน่วยงานเปลี่ยนระหว่างโหลด กรุณาโหลดใหม่');
 return {...primary,companion:secondary,claimRevision:Number(revision)};
}
