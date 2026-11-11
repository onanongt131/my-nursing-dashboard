import {currentUser, db, fail, validDate} from '@/lib/audits/chartServer';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ', 401);
    const params = new URL(request.url).searchParams;
    const date = params.get('date'), shift = params.get('shift');
    if (!validDate(date) || !['เวรเช้า','เวรบ่าย','เวรดึก','all'].includes(shift || '')) return fail('วันที่หรือเวรไม่ถูกต้อง');
    const selected = params.get('department_id');
    const departmentId = Number(selected);
    if (selected !== null && (!Number.isSafeInteger(departmentId) || departmentId <= 0)) return fail('หน่วยงานไม่ถูกต้อง');
    const client = db();
    let departmentsQuery = client.from('departments').select('*');
    if (!['admin','head_nurse'].includes(user.role)) {
      if (user.role === 'head_group' && user.group) departmentsQuery = departmentsQuery.eq('group',user.group);
      else if (user.departmentId) departmentsQuery = departmentsQuery.eq('id',user.departmentId);
      else return fail('ไม่พบหน่วยงานที่มีสิทธิ์อ่าน',403);
    }
    if (selected !== null) departmentsQuery = departmentsQuery.eq('id', departmentId);
    const {data: departments,error: departmentError} = await departmentsQuery;
    if (departmentError) return fail('อ่านรายชื่อหน่วยงานไม่สำเร็จ',503);
    const ids = (departments || []).map(d => d.id);
    if (selected !== null && !ids.length) return fail('ไม่มีสิทธิ์ดูหน่วยงานนี้หรือไม่พบหน่วยงาน',403);
    if (!ids.length) return Response.json({departments:[],records:[]},{headers:{'Cache-Control':'no-store'}});
    let query = client.from('daily_staffing').select('*').eq('date',date).in('department_id',ids);
    if(shift!=='all')query=query.eq('shift',shift);
    const {data:records,error}=await query.limit(1000);
    if (error) return fail('อ่าน daily_staffing ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อฐานข้อมูล',503);
    return Response.json({departments,records:records || []},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return fail('โหลดรายงานไม่สำเร็จ กรุณาตรวจการตั้งค่าเซิร์ฟเวอร์',503);
  }
}
