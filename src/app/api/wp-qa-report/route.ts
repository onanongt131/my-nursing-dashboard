import {isWpApplicable} from '@/lib/wpIpdCriteria';
import {monthlyNpRoster} from '@/lib/monthlyNpRoster';
import {currentUser,db,fail} from '@/lib/audits/chartServer';
import {aggregateWpReport} from '@/lib/wpReport';
export const dynamic='force-dynamic';

// Read-only aggregate report for approved signed-in users, across departments.
export async function GET(){try{
 if(!await currentUser())return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ',401);
 const client=db();
 async function read(table:string,columns:string,kind:'departments'|'legacy'|'current'){
  const rows:Record<string,any>[]=[];
  for(let offset=0;;offset+=1000){
   let query=client.from(table).select(columns);
   if(kind==='legacy')query=query.lt('fiscal_year',2570);
   if(kind==='current')query=query.in('status',['approved','pending']).gte('audit_month','2026-10').lt('audit_month','2027-10');
   const {data,error}=await query.order('id').range(offset,offset+999);
   if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)return rows;
  }
 }
 const [departments,old,records,roster]=await Promise.all([
  read('departments','id,Department,group','departments'),
  read('wp_qa_results','id,fiscal_year,department_id,month,name,wp','legacy'),
  read('wp_qa_records','id,department_id,audit_month,wp_id,wp_name,total_evaluated,total_practiced,unpracticed_reasons,status','current'),
  monthlyNpRoster(),
 ]);
 const allowed=departments.filter(row=>roster.has(String(row.id))).map(row=>({id:row.id,name:row.Department,group:row.group}));
 const names=new Map(allowed.map(row=>[String(row.id),row.name]));
 const report=aggregateWpReport(records.filter(row=>names.has(String(row.department_id))&&isWpApplicable(names.get(String(row.department_id)),row.wp_id,row.wp_name)),true);
 let invalidLegacy=0;
 const legacy=old.filter(row=>names.has(String(row.department_id))&&isWpApplicable(names.get(String(row.department_id)),row.name)).flatMap(row=>{
  if(!row.name||!Number.isInteger(Number(row.month))||Number(row.month)<1||Number(row.month)>12||row.wp==null||String(row.wp).trim()===''||!Number.isFinite(Number(row.wp))){invalidLegacy++;return [];}
  return [{department_id:row.department_id,fiscal_year:Number(row.fiscal_year),month:Number(row.month),name:String(row.name),wp:Number(row.wp)}];
 });
 return Response.json({departments:allowed,items:[...legacy,...report.items],invalid:report.invalid+invalidLegacy},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){
 console.error('WP report read failed',{code:(error as {code?:string})?.code||'configuration'});
 return fail('อ่านรายงาน WP/QA ไม่สำเร็จ กรุณาตรวจการตั้งค่าเซิร์ฟเวอร์และตารางข้อมูล',503);
}}
