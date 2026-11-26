import {NextRequest} from 'next/server';
import {unstable_cache} from 'next/cache';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import {buildCells,total,type Incident,type Summary} from '@/lib/readmitAmaReport';
export const dynamic='force-dynamic';
// ผลขึ้นกับ department_id เท่านั้น จึง cache ร่วมกันได้ ตรวจสิทธิ์นอก cache ทุกครั้ง
// รายการ approved/pending ที่เพิ่งเปลี่ยนจะแสดงภายใน READMIT_AMA_CACHE_SECONDS
const READMIT_AMA_CACHE_SECONDS=300;
async function computeReadmitAma(id:number){
 async function read(table:string,dateField?:string){const rows:any[]=[];for(let offset=0;;offset+=1000){let q=db().from(table).select(dateField?'id,department_id,status,'+dateField:'*').eq('department_id',id);if(dateField)q=q.in('status',['approved','pending']).gte(dateField,'2023-10-01').lt(dateField,'2027-10-01');else q=q.in('fiscal_year',[2566,2567,2568,2569,2570]);const {data,error}=await q.order('id').range(offset,offset+999);if(error||!Array.isArray(data))throw new Error('อ่านข้อมูลตัวชี้วัด '+table+' ไม่สำเร็จ');rows.push(...data);if(data.length<1000)return rows;}}
 const [r,a,rs,as]=await Promise.all([read('readmit_incident_records','admit_date'),read('ama_incident_records','incident_date'),read('readmit_monthly_summary'),read('ama_monthly_summary')]);
 const incidents=(rows:any[],date:string):Incident[]=>rows.map(x=>({id:x.id,department_id:x.department_id,status:x.status,date:x[date]}));
 const summaries=(rows:any[],denominator:string):Summary[]=>rows.map(x=>({department_id:x.department_id,fiscal_year:x.fiscal_year,month:x.month,status:x.status,denominator:x[denominator]}));
 const kinds=[{key:'readmit',incidents:incidents(r,'admit_date'),summaries:summaries(rs,'prev_month_discharges')},{key:'ama',incidents:incidents(a,'incident_date'),summaries:summaries(as,'total_discharges')}];
 const items=kinds.map(k=>({key:k.key,years:[2567,2568,2569,2570].map(year=>{const cells=buildCells(year,[id],k.incidents,k.summaries,false),t=total(cells,false);return{year,...t,monthly:cells.map(c=>({month:c.month,numerator:c.approved,pending:c.pending,denominator:c.denominator,rate:c.rate,denominatorPending:c.denominatorPending}))};})}));
 return {departmentId:id,approvedOnly:true,items};
}
const cachedReadmitAma=unstable_cache(computeReadmitAma,['department-readmit-ama-kpi-v1'],{revalidate:READMIT_AMA_CACHE_SECONDS,tags:['department-kpi']});
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);const id=Number(request.nextUrl.searchParams.get('department_id'));if(!Number.isSafeInteger(id)||id<1)return fail('รหัสหน่วยงานไม่ถูกต้อง');if(!await canRead(user,id))return fail('ไม่มีสิทธิ์หน่วยงานนี้',403);
 return Response.json(await cachedReadmitAma(id),{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return unexpected(e);}}
