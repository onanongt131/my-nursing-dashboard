import {monthlyNpRoster} from '@/lib/monthlyNpRoster';
import {NextResponse} from 'next/server';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import {aggregateNursingAudits,auditReportGroups} from '@/lib/audits/report';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const roster=await monthlyNpRoster();
 const {data:departments,error:deptError}=await db().from('departments').select('*');if(deptError)return unexpected(deptError);
 const rights=await Promise.all((departments||[]).filter(d=>roster.has(String(d.id))).map(async (department:Record<string,any>)=>({department,allowed:await canRead(user,Number(department.id))})));const allowed=rights.filter((r:{department:Record<string,any>;allowed:boolean})=>r.allowed).map((r:{department:Record<string,any>;allowed:boolean})=>r.department),ids=new Set(allowed.map((d:Record<string,any>)=>String(d.id)));
 const source:Record<string,unknown>[]=[],historical:Record<string,any>[]=[];
 const columns=['id','department_id','audit_date','audit_month','status','audit_na_keys','notes','s1_notes','s2_notes','s3_notes','s4_notes','s5_notes',...Object.values(auditReportGroups).flat()].join(',');
 for(let offset=0;;offset+=1000){const {data,error}=await db().from('nursing_chart_audits').select(columns).in('status',['approved','pending']).order('id').range(offset,offset+999).returns<Record<string,unknown>[]>();if(error)return unexpected(error);source.push(...(data||[]).filter((row:Record<string,any>)=>ids.has(String(row.department_id))));if((data||[]).length<1000)break;}
 for(let offset=0;;offset+=1000){const {data,error}=await db().from('audit_chart_data').select('*').lt('fiscal_year',2570).order('department_id').order('fiscal_year').order('month').range(offset,offset+999);if(error)return unexpected(error);historical.push(...(data||[]).filter((row:Record<string,any>)=>ids.has(String(row.department_id))));if((data||[]).length<1000)break;}
 const calculated=aggregateNursingAudits(source,true,true);
 return NextResponse.json({items:[...historical,...calculated.items],departments:allowed,skipped:calculated.skipped},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
