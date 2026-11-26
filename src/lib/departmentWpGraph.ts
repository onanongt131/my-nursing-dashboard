type RecordRow=Record<string,any>;
const years=[2567,2568,2569,2570];
const months=[10,11,12,1,2,3,4,5,6,7,8,9];
const number=(value:unknown)=>value!=null&&String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;

// Historical WP percentages and the current assessment counts are different schemas.
export function departmentWpGraph(legacy:RecordRow[],records:RecordRow[]){
 const approved=records.filter(row=>row.status==='approved'&&String(row.audit_month)>='2026-10'&&String(row.audit_month)<'2027-10');
 function percentage(rows:RecordRow[]){
  let practiced=0,evaluated=0;
  for(const row of rows){const p=number(row.total_practiced),n=number(row.total_evaluated);if(p===null||n===null||n<=0||p<0||p>n)continue;practiced+=p;evaluated+=n;}
  return evaluated?{n:practiced,d:evaluated}:null;
 }
 const items=years.flatMap(year=>months.map(month=>{
  const period=`${year-543-(month>=10?1:0)}-${String(month).padStart(2,'0')}`;
  const pair=year===2570?percentage(approved.filter(row=>row.audit_month===period)):null;
  const wp=year===2570?(pair?pair.n/pair.d*100:null):
   mean(legacy.filter(row=>Number(row.fiscal_year)===year&&Number(row.month)===month).map(row=>number(row.wp)).filter((value):value is number=>value!==null));
  return {year,month,wp,details:{wp:pair}};
 }));
 const annual=years.map(year=>{
  const pair=year===2570?percentage(approved):null;
  const values=items.filter(row=>row.year===year).map(row=>row.wp).filter((value):value is number=>value!==null);
  return {year,wp:year===2570?(pair?pair.n/pair.d*100:null):mean(values),
   details:{wp:year===2570?pair:values.length?{n:values.reduce((sum,v)=>sum+v,0),d:values.length,note:'ผลรวมร้อยละรายเดือน ÷ จำนวนเดือนที่มีข้อมูล'}:null}};
 });
 return {items,annual};
}
