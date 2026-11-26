import {NextRequest,NextResponse} from 'next/server';
import {currentUser,db,fail,unexpected,validId} from '@/lib/audits/chartServer';
import {cleanExtraDepartments} from '@/lib/members/departments';
import {invalidateDepartmentKpi} from '@/lib/kpiCache';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
const missingColumn=(e:unknown)=>/extra_department_ids/.test(String((e as {message?:string})?.message||''));
const MISSING='ยังไม่ได้เพิ่มคอลัมน์ extra_department_ids ใน Supabase กรุณารัน SQL ก่อน';

// ผู้ดูแลระบบ: ค้นหาสมาชิก (ชื่อหรืออีเมล) เพื่อดู/แก้หน่วยงานที่ดูแลเพิ่ม
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);if(user.role!=='admin')return fail('เฉพาะผู้ดูแลระบบ',403);
 const term=(request.nextUrl.searchParams.get('q')||'').trim().replace(/[%,()*\\]/g,'').slice(0,60);
 if(term.length<2)return fail('พิมพ์ชื่อหรืออีเมลอย่างน้อย 2 ตัวอักษร');
 const {data,error}=await db().from('profiles').select('id,full_name,email,status,role,department_id,extra_department_ids')
  .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).order('full_name').limit(20);
 if(error){if(missingColumn(error))return fail(MISSING,409);throw error;}
 return NextResponse.json({items:data||[]},{headers:noStore});
}catch(e){return unexpected(e);}}

// ผู้ดูแลระบบ: กำหนดหน่วยงานที่ดูแลเพิ่มของสมาชิก
export async function PUT(request:NextRequest){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return fail('แหล่งที่มาคำขอไม่ถูกต้อง',403);
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);if(user.role!=='admin')return fail('เฉพาะผู้ดูแลระบบ',403);
 const body=await request.json().catch(()=>null);const id=String(body?.id||'');if(!validId(id))return fail('สมาชิกไม่ถูกต้อง');
 const {data:profile,error}=await db().from('profiles').select('id,department_id').eq('id',id).maybeSingle();if(error)throw error;if(!profile)return fail('ไม่พบสมาชิก',404);
 const extra=cleanExtraDepartments(body?.extra_department_ids,profile.department_id);if(!extra)return fail('หน่วยงานที่ดูแลเพิ่มไม่ถูกต้อง');
 if(extra.length){const {data:found,error:de}=await db().from('departments').select('id').in('id',extra);if(de)throw de;if((found||[]).length!==extra.length)return fail('มีหน่วยงานที่ไม่อยู่ในระบบ');}
 const {data:changed,error:ue}=await db().from('profiles').update({extra_department_ids:extra}).eq('id',id).select('id,extra_department_ids');
 if(ue){if(missingColumn(ue))return fail(MISSING,409);throw ue;}
 invalidateDepartmentKpi();
 return NextResponse.json({ok:true,item:changed?.[0]||null},{headers:noStore});
}catch(e){return unexpected(e);}}
