import {NextRequest} from 'next/server';
import {currentUser,db,canRead,canCreate,fail,unexpected} from '@/lib/audits/chartServer';
import {UNIT_TABLES} from '@/lib/unitDataScope';
export const dynamic='force-dynamic';
// Authenticated bridge for legacy browser PostgREST queries. Never forward credentials from the browser.
export async function POST(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const body=await request.json();if(typeof body.path!=='string'||body.path.length>16000)return fail('คำขอไม่ถูกต้อง');
 const relative=new URL(body.path,'https://unit.invalid');const table=relative.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
 if(!table||!UNIT_TABLES.includes(table)||!['GET','HEAD','POST','PATCH','DELETE'].includes(body.method))return fail('ไม่รองรับคำขอนี้',403);
 const query=relative.searchParams;const staff=user.role==='staff';
 // Do not permit unscoped embedded relations or bulk RPC through this bridge.
 if((query.get('select')||'').includes('('))return fail('กรุณาใช้คำขอแยกตามหน่วยงาน',400);
 let allowed:number[]=[];if(user.role==='admin'||user.role==='head_nurse'){}else if(user.role==='head_group'){
 const {data,error}=await db().from('departments').select('id');if(error)throw error;for(const d of data||[])if(await canRead(user,Number(d.id)))allowed.push(Number(d.id));
 }else if(user.departmentId)allowed=[Number(user.departmentId)];
 if(user.role!=='admin'&&user.role!=='head_nurse'){
 if(!allowed.length)return fail('บัญชียังไม่ได้ผูกหน่วยงาน กรุณาติดต่อผู้ดูแลระบบ',403);
 // append, rather than replace, preserves caller filters while enforcing an AND restriction.
 query.append('department_id',allowed.length===1?`eq.${allowed[0]}`:`in.(${allowed.join(',')})`);
 }
 const writing=!['GET','HEAD'].includes(body.method);let payload=body.payload;
 if(writing){
 if(staff&&body.method==='DELETE')return fail('ไม่มีสิทธิ์ลบข้อมูล',403);
 if(staff&&body.method==='POST'&&String(body.headers?.prefer||'').includes('resolution=merge-duplicates')&&!(query.get('on_conflict')||'').split(',').map(v=>v.trim()).includes('department_id'))return fail('การอัปเดตรายการซ้ำต้องระบุหน่วยงานในคีย์',403);
 if(body.method==='POST'||body.method==='PATCH'){
 const rows=Array.isArray(payload)?payload:[payload];if(!rows.length||rows.length>500||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)))return fail('ข้อมูลไม่ถูกต้อง');
 for(const row of rows){const target=Number(row.department_id??user.departmentId);if(!Number.isSafeInteger(target)||!canCreate(user,target))return fail('บันทึกได้เฉพาะหน่วยงานที่ได้รับสิทธิ์',403);
 if(staff){if(body.method==='POST'&&row.id!=null)return fail('ไม่อนุญาตให้กำหนดรหัสรายการเดิมเมื่อสร้างข้อมูล',403);if(row.status!=null&&!['draft','pending'].includes(row.status))return fail('staff ไม่มีสิทธิ์อนุมัติรายการ',403);if(['approved_by','approved_at','created_by'].some(k=>k in row))return fail('ไม่อนุญาตให้แก้ข้อมูลผู้อนุมัติหรือผู้บันทึก',403);}
 if(body.method==='POST')row.department_id=target;
 }
 }
 if(user.role!=='admin'&&user.role!=='head_nurse'){if(!user.departmentId)return fail('ไม่พบหน่วยงาน',403);query.append('department_id',`eq.${user.departmentId}`);}
 }
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)throw Error('Missing configuration');
 const headers:Record<string,string>={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 for(const name of ['prefer','range','range-unit','accept'])if(typeof body.headers?.[name]==='string')headers[name]=body.headers[name];
 const response=await fetch(`${base}/rest/v1/${table}?${query}`,{method:body.method,headers,body:writing&&body.method!=='DELETE'?JSON.stringify(payload):undefined,cache:'no-store'});
 const out=new Headers({'Cache-Control':'no-store'});for(const name of ['content-type','content-range','range-unit','preference-applied']){const value=response.headers.get(name);if(value)out.set(name,value);}
 return new Response(body.method==='HEAD'||response.status===204?null:await response.text(),{status:response.status,headers:out});
}catch(e){return unexpected(e);}}
