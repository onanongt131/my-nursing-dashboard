import {NextResponse} from 'next/server';
import {isPendingMember} from '@/lib/members/status';
import {currentUser,db,fail,unexpected} from '@/lib/audits/chartServer';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);if(user.role!=='admin')return fail('เฉพาะผู้ดูแลระบบ',403);
 const rows:Record<string,unknown>[]=[];
 let cols='id,full_name,email,status,role,department_id,extra_department_ids';
 for(let offset=0;;offset+=1000){let {data,error}=await db().from('profiles').select(cols).order('id').range(offset,offset+999) as {data:any[]|null;error:any};if(error&&cols.includes('extra_department_ids')&&/extra_department_ids/.test(String(error.message||''))){cols='id,full_name,email,status,role,department_id';({data,error}=await db().from('profiles').select(cols).order('id').range(offset,offset+999) as {data:any[]|null;error:any});}if(error)throw error;rows.push(...(data||[]).filter(row=>isPendingMember(row.status)));if((data||[]).length<1000)break;}
 return NextResponse.json(new URL(request.url).searchParams.get('count')==='1'?{count:rows.length}:{items:rows,count:rows.length},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
