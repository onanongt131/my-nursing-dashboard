import {currentUser,db,canRead,fail} from '@/lib/audits/chartServer';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
  const id=Number(new URL(request.url).searchParams.get('department_id'));
  if(!Number.isSafeInteger(id)||id<=0)return fail('หน่วยงานไม่ถูกต้อง');
  if(!await canRead(user,id))return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้',403);
  const {data,error}=await db().from('staff').select('*').eq('department_id',id).order('id');
  if(error)return fail('อ่านตาราง staff ไม่สำเร็จ',503);
  return Response.json({records:data||[]},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('โหลดบุคลากรไม่สำเร็จ',503);}
}
