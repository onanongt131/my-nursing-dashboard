import {currentUser,db,fail,validDate} from '@/lib/audits/chartServer';
import {isInspectionWard} from '@/lib/inspectionWards';
export const dynamic='force-dynamic';
const columns='department_id,date,shift,carry_forward,new_admission,transfer_in,discharge,transfer_out,dead,surgery,sick_baby,high_flow,ventilator,score_5,score_4,nursing_count,staff_names,normal_labor,in_labor';
// All approved signed-in users can read the configured IPD report. Read only.
export async function GET(request:Request){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ',401);
 const params=new URL(request.url).searchParams,date=params.get('date'),shift=params.get('shift');
 if(!validDate(date)||!['เวรเช้า','เวรบ่าย','เวรดึก'].includes(shift||''))return fail('วันที่หรือเวรไม่ถูกต้อง');
 const client=db();
 const {data:rows,error:departmentError}=await client.from('departments').select('id,Department');
 if(departmentError)return fail('อ่านหน่วยงานรายงานไม่สำเร็จ',503);
 const departments=(rows||[]).filter(d=>isInspectionWard(d.Department||'')),ids=departments.map(d=>d.id);
 let records:Record<string,unknown>[]=[];
 if(ids.length){const result=await client.from('daily_staffing').select(columns).eq('date',date).eq('shift',shift).in('department_id',ids).limit(1000);
 if(result.error)return fail('อ่านรายงานเวรตรวจการไม่สำเร็จ',503);records=result.data||[];}
 return Response.json({departments,records},{headers:{'Cache-Control':'no-store'}});
}catch{return fail('โหลดรายงานไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ',503);}}
