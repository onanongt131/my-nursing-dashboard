import {isWpApplicable} from '@/lib/wpIpdCriteria';
import pressureSoreHistory from '@/lib/pressureSoreHistory.json';
import {normalizeWard} from '@/lib/inspectionWards';
import {departmentWpGraph} from '@/lib/departmentWpGraph';
import {NextRequest,NextResponse} from 'next/server';
import {db,currentUser,canRead,fail,unexpected} from '@/lib/audits/chartServer';
import {aggregateNursingAudits} from '@/lib/audits/report';
import {aggregateIvCare,ivPercent,ivFraction,type IvReportRow} from '@/lib/ivCareReport';
import {reviewMonth} from '@/lib/review/period';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{
 const user=await currentUser();if(!user)return fail('กรุณาเข้าสู่ระบบ',401);
 const id=Number(request.nextUrl.searchParams.get('department_id'));if(!Number.isSafeInteger(id)||id<=0)return fail('หน่วยงานไม่ถูกต้อง');if(!await canRead(user,id))return fail('ไม่มีสิทธิ์ดูหน่วยงานนี้',403);
 async function read(table:string,columns:string,kind:'old'|'new'|'staff') {const rows:Record<string,any>[]=[];for(let offset=0;;offset+=1000){let q=db().from(table).select(columns).eq('department_id',String(id));if(kind==='old')q=q.gte('fiscal_year',2567).lte('fiscal_year',2569);else if(kind==='staff')q=q.gte('date','2026-10-01').lt('date','2027-10-01');else q=q.eq('status','approved');const {data,error}=await q.order(kind==='old'?'month':kind==='staff'?'date':'id').order('id').range(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)return rows;}}
 const includeWp=request.nextUrl.searchParams.get('exclude_wp')!=='1';
 const fallReport = Promise.all([
  read('fall_monthly_summary','id,fiscal_year,month,patient_days','new'),
  read('fall_incident_records','id,incident_date','new'),
 ]).then(([summaries, incidents]) => {
  const months = new Map<string, number>();
  for (const row of summaries) {
   const period = `${Number(row.fiscal_year)-543}-${String(row.month).padStart(2,'0')}`;
   if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period) && Number(row.patient_days)>0) {
    months.set(period, Number(row.patient_days));
   }
  }
  return [2567,2568,2569,2570].map(year => {
   const periods = [...months.keys()].filter(period => period >= `${year-544}-10` && period < `${year-543}-10`);
   const days = periods.reduce((total, period) => total + months.get(period)!, 0);
   const cases = incidents.filter(row => periods.includes(String(row.incident_date).slice(0,7))).length;
   return {year, days, cases, rate: days > 0 ? cases / days * 1000 : null};
  });
 }).catch(error => {
  console.error('Department KPI Fall report query failed', error);
  return null;
 });
 const [wpOld,wpNew,ivOld,ivSummary,ivCases,auditOld,auditNew,auditSpecial,npOld,staff]=await Promise.all([
 includeWp?read('wp_qa_results','id,fiscal_year,month,name,wp','old'):Promise.resolve([]),includeWp?read('wp_qa_records','id,audit_month,wp_id,wp_name,total_evaluated,total_practiced,status','new'):Promise.resolve([]),read('iv_care_data','*','old'),read('iv_care_monthly_summaries','id,department_id,audit_month,status,total_sites,total_punctures,first_attempt_punctures,total_infusion_days','new'),read('iv_care_complications','id,department_id,record_date,status,complication,grade','new'),read('audit_chart_data','*','old'),read('nursing_chart_audits','*','new'),read('nso_special_audits','id,audit_month,audit_date,total_score,max_score','new'),read('nursing_kpi_data','id,fiscal_year,month,np_value','old'),read('daily_staffing','id,date,np','staff')]);
 const {data:department,error:departmentError}=await db().from('departments').select('Department').eq('id',id).maybeSingle();
 if(departmentError)throw departmentError;
 const wpSeries=departmentWpGraph(
  wpOld.filter(row=>isWpApplicable(department?.Department,row.name)),
  wpNew.filter(row=>isWpApplicable(department?.Department,row.wp_id,row.wp_name)),
 );
 const liveIv=aggregateIvCare(ivSummary,ivCases).items,liveAudit=aggregateNursingAudits(auditNew.map(r=>({...r,status:'approved'}))).items;
 const mean=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
 const num=(v:unknown)=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
 const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);
 const averageDetail=(values:number[],note:string)=>values.length?{n:sum(values),d:values.length,note}:null;
 const ivMetrics=[['iv','success'],['phlebitis','phlebitis'],['extravasation','extravasation'],['infiltration','infiltration']] as const;
 function ivDetails(rows:IvReportRow[]){
  return Object.fromEntries(ivMetrics.map(([key,metric])=>{
   const pairs=rows.map(row=>ivFraction(row,metric)).filter(pair=>pair!==null);
   const hasLegacyZeroDenominator=rows.some(row=>row.source!=='live'&&!(Number(metric==='success'?row.all_iv_insertion:row.iv_position)>0));
   const detail=!pairs.length||hasLegacyZeroDenominator?null:rows.some(row=>row.source==='live')
    ?{n:sum(pairs.map(p=>p.n)),d:sum(pairs.map(p=>p.d))}
    :pairs.length===1?pairs[0]:averageDetail(pairs.map(p=>p.n/p.d*100),'ผลรวมร้อยละของรายการ ÷ จำนวนรายการ');
   return [key,detail];
  }));
 }
 const result:Array<{year:number;month:number;wp:number|null;audit:number|null;product:number|null;iv:number|null;phlebitis:number|null;extravasation:number|null;infiltration:number|null;details:Record<string,unknown>}>=[];for(const year of [2567,2568,2569,2570])for(const month of [10,11,12,1,2,3,4,5,6,7,8,9]){const period=`${year-543-(month>=10?1:0)}-${String(month).padStart(2,'0')}`;const old=(rows:Record<string,any>[])=>rows.filter(r=>Number(r.fiscal_year)===year&&Number(r.month)===month);let wp:number|null=null,audit:number|null=null,product:number|null=null;
 let auditDetail=null,productDetail=null;
 if(year<2570){
  const oldAudits=old(auditOld).map(r=>{
   const n=['a','p','i','e'].reduce((s,k)=>s+Number(r[k]??r[k.toUpperCase()]??0),0);
   const d=Number(r.total_apie);
   return d>0?{n,d,rate:n/d*100}:{n,d:4,rate:n/4,note:'ผลรวมร้อยละรายหมวด ÷ 4 หมวด'};
  });
  const auditValues=oldAudits.map(r=>r.rate);
  audit=mean(auditValues);
  auditDetail=oldAudits.length===1?oldAudits[0]:averageDetail(auditValues,'ผลรวมค่าของรายการ ÷ จำนวนรายการ');
  const productValues=old(npOld).map(r=>num(r.np_value)).filter((v):v is number=>v!==null);
  product=mean(productValues);
  if(productValues.length>1)productDetail=averageDetail(productValues,'ผลรวมค่า NP ÷ จำนวนรายการ');
 }
 else {
 const ar=liveAudit.filter(r=>r.audit_month===period);let score=0,max=0;for(const r of ar){score+=r.a+r.p+r.i+r.e;max+=r.total_apie;}for(const r of auditSpecial.filter(r=>reviewMonth(r)===period)){if(num(r.max_score)!==null&&Number(r.max_score)>0&&num(r.total_score)!==null){score+=Number(r.total_score);max+=Number(r.max_score);}}audit=max?score/max*100:null;auditDetail=max?{n:score,d:max}:null;
 const days=new Map<string,number[]>();for(const r of staff.filter(r=>String(r.date).startsWith(period))){const v=num(r.np);if(v===null)continue;const a=days.get(r.date)||[];a.push(v);days.set(r.date,a);}const values=[...days.values()].map(v=>mean(v)!);product=mean(values);productDetail=averageDetail(values,'ผลรวมค่า NP เฉลี่ยรายวัน ÷ จำนวนวันที่มีข้อมูล');}
 wp=wpSeries.items.find(row=>row.year===year&&row.month===month)?.wp??null;
 const ivRows=year===2570?liveIv.filter(r=>r.audit_month===period):old(ivOld);result.push({year,month,wp,audit,product,details:{...ivDetails(ivRows as IvReportRow[]),audit:auditDetail,product:productDetail,wp:wpSeries.items.find(r=>r.year===year&&r.month===month)?.details.wp},iv:ivPercent(ivRows as any,'success'),phlebitis:ivPercent(ivRows as any,'phlebitis'),extravasation:ivPercent(ivRows as any,'extravasation'),infiltration:ivPercent(ivRows as any,'infiltration')});}
 const annual=[2567,2568,2569,2570].map(year=>{const monthly=result.filter(r=>r.year===year);const row:Record<string,any>={year};for(const key of ['wp','audit','product'])row[key]=mean(monthly.map(r=>r[key as 'wp'|'audit'|'product']).filter((v):v is number=>v!==null));const ivRows=year===2570?liveIv:ivOld.filter(r=>Number(r.fiscal_year)===year);for(const [key,metric] of ivMetrics)row[key]=ivPercent(ivRows as any,metric);
 const annualWp=wpSeries.annual.find(item=>item.year===year);
 row.wp=annualWp?.wp??null;
 row.details={...ivDetails(ivRows as IvReportRow[]),wp:annualWp?.details.wp};
 for(const key of ['audit','product'] as const)row.details[key]=averageDetail(monthly.map(r=>r[key]).filter((v):v is number=>v!==null),'ผลรวมค่ารายเดือน ÷ จำนวนเดือนที่มีข้อมูล');
 if(year===2570){let score=0,max=0;for(const r of liveAudit.filter(r=>Number(r.fiscal_year)===2570)){score+=r.a+r.p+r.i+r.e;max+=r.total_apie;}for(const r of auditSpecial){const period=reviewMonth(r);if(period&&period>='2026-10'&&period<'2027-10'&&Number(r.max_score)>0&&num(r.total_score)!==null){score+=Number(r.total_score);max+=Number(r.max_score);}}row.audit=max?score/max*100:null;row.details.audit=max?{n:score,d:max}:null;}return row;});
 const pressureSore=department?.Department
  ? Object.entries(pressureSoreHistory).find(([name])=>normalizeWard(name).toLowerCase()===normalizeWard(department.Department).toLowerCase())?.[1]??null
  : null;
 return NextResponse.json({items:result,annual,pressureSore,fall:await fallReport},{headers:{'Cache-Control':'no-store'}});
}catch(e){return unexpected(e);}}
