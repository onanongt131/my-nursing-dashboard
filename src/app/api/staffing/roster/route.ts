import {currentUser,db,canRead,fail} from '@/lib/audits/chartServer';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
const params=new URL(request.url).searchParams,id=Number(params.get('department_id'));
if(!Number.isSafeInteger(id)||id<=0)return fail('หน่วยงานไม่ถูกต้อง');
if(!await canRead(user,id))return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้',403);
const month=params.get('month')||'';if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return fail('เดือนไม่ถูกต้อง');const [y,m]=month.split('-').map(Number);const nextMonth=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);
const client=db();let records:any[]=[];
for(let offset=0;;offset+=1000){const {data,error}=await client.from('monthly_roster').select('staff_id,date,shift').eq('department_id',id).gte('date',month+'-01').lt('date',nextMonth).order('date').order('staff_id').range(offset,offset+999);if(error)return fail('อ่านตาราง monthly_roster ไม่สำเร็จ',503);records.push(...(data||[]));if(!data||data.length<1000)break;}
return Response.json({records},{headers:{'Cache-Control':'no-store'}});
}catch{return fail('โหลดข้อมูลไม่สำเร็จ',503);}}
