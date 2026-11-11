import {NextRequest} from 'next/server';
import {currentUser,canRead,db,fail,unexpected} from '@/lib/audits/chartServer';
export const dynamic='force-dynamic';
export async function GET(r:NextRequest){try{const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);const id=Number(r.nextUrl.searchParams.get('department_id'));if(!Number.isSafeInteger(id)||id<1)return fail('หน่วยงานไม่ถูกต้อง');if(!await canRead(user,id))return fail('ไม่มีสิทธิ์หน่วยงานนี้',403);
 const client=db(),{data:department,error}=await client.from('departments').select('*').eq('id',id).single();if(error)return fail('อ่านหน่วยงานไม่สำเร็จ',503);
 async function all(table:string,scoped:boolean,columns='*',order='id'){const rows:any[]=[];for(let offset=0;;offset+=1000){let q=client.from(table).select(columns);if(scoped)q=q.eq('department_id',id);const {data,error}=await q.order(order).range(offset,offset+999);if(error||!Array.isArray(data))throw new Error('อ่าน '+table+' ไม่สำเร็จ');rows.push(...data);if(data.length<1000)return rows;}}
 const [kpis,entries,maps]=await Promise.all([all('kpis',false),all('kpi_entries',true),all('kpi_department_map',true,'department_id,kpi_id','kpi_id')]);
 const formatted={...department,kpis:maps.map(m=>{const k=kpis.find(x=>String(x.id)===String(m.kpi_id));return k?{...k,entries:entries.filter(e=>String(e.kpi_id)===String(k.id))}:null;}).filter(Boolean)};
 return Response.json({department:formatted,counts:{mappedKpis:maps.length,entries:entries.length,unmappedEntries:entries.filter(e=>!maps.some(m=>String(m.kpi_id)===String(e.kpi_id))).length}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return unexpected(e);}}
