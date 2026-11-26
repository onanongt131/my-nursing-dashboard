import {isWpApplicable} from '@/lib/wpIpdCriteria';
import {NextRequest} from 'next/server';
import {unstable_cache} from 'next/cache';
import {currentUser,canRead,db,fail} from '@/lib/audits/chartServer';
import {departmentWpGraph} from '@/lib/departmentWpGraph';
export const dynamic='force-dynamic';
// กราฟ WP ขึ้นกับ department_id เท่านั้น จึง cache ร่วมกันได้ ตรวจสิทธิ์นอก cache ทุกครั้ง
const WP_CACHE_SECONDS=300;
async function computeWpGraph(id:number){
 async function read(current:boolean){
  const rows:Record<string,any>[]=[];
  for(let offset=0;;offset+=1000){
   let query=current?db().from('wp_qa_records').select('id,audit_month,wp_id,wp_name,total_evaluated,total_practiced,status').eq('status','approved').gte('audit_month','2026-10').lt('audit_month','2027-10'):
    db().from('wp_qa_results').select('id,fiscal_year,month,name,wp').gte('fiscal_year',2567).lte('fiscal_year',2569);
   const {data,error}=await query.eq('department_id',id).order('id').range(offset,offset+999);
   if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)return rows;
  }
 }
 const [legacy,records,departmentResult]=await Promise.all([
  read(false),read(true),db().from('departments').select('Department').eq('id',id).maybeSingle(),
 ]);
 if(departmentResult.error)throw departmentResult.error;
 const name=departmentResult.data?.Department;
 return departmentWpGraph(legacy.filter(row=>isWpApplicable(name,row.name)),records.filter(row=>isWpApplicable(name,row.wp_id,row.wp_name)));
}
const cachedWpGraph=unstable_cache(computeWpGraph,['department-wp-kpi-v1'],{revalidate:WP_CACHE_SECONDS,tags:['department-kpi']});
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const id=Number(request.nextUrl.searchParams.get('department_id'));
 if(!Number.isSafeInteger(id)||id<=0)return fail('หน่วยงานไม่ถูกต้อง');
 if(!await canRead(user,id))return fail('ไม่มีสิทธิ์ดูหน่วยงานนี้',403);
 return Response.json(await cachedWpGraph(id),{headers:{'Cache-Control':'private, no-store'}});
}catch(error){
 console.error('Department WP graph read failed',{code:(error as {code?:string})?.code||'configuration'});
 return fail('อ่านกราฟ WP/QA ไม่สำเร็จ กรุณาตรวจตาราง wp_qa_results และ wp_qa_records กับการตั้งค่าเซิร์ฟเวอร์',503);
}}
