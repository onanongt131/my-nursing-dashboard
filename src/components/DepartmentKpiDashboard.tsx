'use client';
import DepartmentFallHistory, {type FallYear} from './DepartmentFallHistory';
import DepartmentPressureSoreHistory, {type PressureSoreHistory} from './DepartmentPressureSoreHistory';
import CopyableKpiChart from './CopyableKpiChart';
import DepartmentKpiTable, {fiscalMonths as monthNumbers,type KpiDetail} from './DepartmentKpiTable';
import DepartmentReadmitAmaCharts from './DepartmentReadmitAmaCharts';
import {useEffect,useState} from 'react';
import {BarChart,Bar,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,ReferenceLine} from 'recharts';
type Metric = 'wp'|'audit'|'product'|'iv'|'phlebitis'|'extravasation'|'infiltration';
type Row={year:number;month?:number;details?:Partial<Record<Metric,KpiDetail|null>>} & Partial<Record<Metric,number|null>>;
const colors=['#94a3b8','#8b5cf6','#3b82f6','#059669'];
const months=['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];
const metrics=[{key:'wp',title:'WP / QA',description:'ร้อยละการปฏิบัติตามแนวปฏิบัติ'},{key:'iv',title:'IV Care',description:'อัตราความสำเร็จในการแทงเข็มครั้งแรก'},{key:'audit',title:'Audit Chart',description:'ร้อยละความสมบูรณ์ของบันทึกทางการพยาบาล'},{key:'product',title:'Productivity',description:'Nursing Productivity (NP)'}];
const years=[2567,2568,2569,2570];
function MonthlyTooltip({active,payload,label,monthly,metric,title}:{active?:boolean;payload?:readonly any[];label?:string|number;monthly:Row[];metric:Metric;title:string}){
 if(!active||label==null)return null;
 const year=Number(label),annual=payload?.[0]?.value;
 const format=(value:number|null|undefined)=>value==null?'ไม่มีข้อมูล':`${Number(value).toFixed(2)}%`;
 return <div className="w-60 rounded-xl border border-teal-200 bg-white p-3 text-xs shadow-xl" role="status"><div className="mb-2 border-b border-slate-100 pb-2"><p className="font-bold text-teal-900">{title} · ปี {year}</p><p className="mt-1 text-slate-600">ผลรายปี: <strong>{format(annual)}</strong>{year===2570?' (สะสม)':''}</p></div><div className="grid grid-cols-2 gap-x-4 gap-y-1.5">{months.map((month,i)=>{const value=monthly.find(r=>r.year===year&&r.month===monthNumbers[i])?.[metric];return <div key={month} className="flex justify-between gap-2"><span className="text-slate-500">{month}</span><span className={value==null?'text-slate-400':'font-semibold text-teal-800'}>{value==null?'—':format(value)}</span></div>;})}</div><p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">— ไม่มีข้อมูล</p></div>;
}
export default function DepartmentKpiDashboard({departmentId}:{departmentId:string}){
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [wpRows,setWpRows]=useState<Row[]>([]),[wpMonthly,setWpMonthly]=useState<Row[]>([]),[wpLoading,setWpLoading]=useState(true),[wpError,setWpError]=useState('');
 const [view,setView]=useState<'chart'|'table'>('chart');
 const [ivMetric,setIvMetric]=useState('iv');
 const [fall,setFall]=useState<FallYear[]|null>(null);
 const [pressureSore,setPressureSore]=useState<PressureSoreHistory|null>(null);
 const [monthly,setMonthly]=useState<Row[]>([]);
 useEffect(()=>{const controller=new AbortController();setRows([]);setMonthly([]);setPressureSore(null);setFall(null);setLoading(true);setError('');fetch(`/api/department-kpi-dashboard?department_id=${encodeURIComponent(departmentId)}&exclude_wp=1`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'โหลดข้อมูลไม่สำเร็จ');if(!controller.signal.aborted){setRows(data.annual||[]);setMonthly(data.items||[]);setPressureSore(data.pressureSore??null);setFall(data.fall??null);}}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[departmentId]);
 useEffect(()=>{
  const controller=new AbortController();setWpRows([]);setWpMonthly([]);setWpLoading(true);setWpError('');
  fetch('/api/department-wp-kpi?department_id='+encodeURIComponent(departmentId),{signal:controller.signal,cache:'no-store'})
   .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'อ่านกราฟ WP/QA ไม่สำเร็จ');if(!controller.signal.aborted){setWpRows(data.annual||[]);setWpMonthly(data.items||[]);}})
   .catch(error=>{if(!controller.signal.aborted)setWpError(error.message);})
   .finally(()=>{if(!controller.signal.aborted)setWpLoading(false);});
  return()=>controller.abort();
 },[departmentId]);
 return <div className="space-y-4">
 <div role="group" aria-label="มุมมอง KPI dashboard" className="flex justify-end gap-2">
  <button type="button" aria-pressed={view==='chart'} onClick={()=>setView('chart')} className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-900 aria-pressed:bg-teal-700 aria-pressed:text-white">ดูแบบกราฟ</button>
  <button type="button" aria-pressed={view==='table'} onClick={()=>setView('table')} className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-900 aria-pressed:bg-teal-700 aria-pressed:text-white">ดูแบบตาราง</button>
 </div>
 <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{metrics.map(metric=>{const key=(metric.key==='iv'?ivMetric:metric.key) as Metric;const metricRows=metric.key==='wp'?wpRows:rows,metricMonthly=metric.key==='wp'?wpMonthly:monthly,metricLoading=metric.key==='wp'?wpLoading:loading,metricError=metric.key==='wp'?wpError:error;const chart=years.map(year=>({name:String(year),value:metricRows.find(r=>r.year===year)?.[key]??null}));const hasData=chart.some(p=>p.value!==null);return <section data-kpi-chart key={metric.key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><h3 className="font-bold text-teal-900">{metric.title}</h3>{view==='chart'&&hasData&&!metricLoading&&!metricError&&<CopyableKpiChart title={metric.key==='iv'?'IV Care · '+(ivMetric==='iv'?'อัตราความสำเร็จ':ivMetric):metric.title}/>}</div><p className="text-xs text-slate-500">{metric.description}</p></div>{metric.key==='iv'&&<select aria-label="ตัวชี้วัด IV Care" value={ivMetric} onChange={e=>setIvMetric(e.target.value)} className="max-w-full rounded-lg border border-slate-200 p-1 text-xs"><option value="iv">อัตราความสำเร็จ</option><option value="phlebitis">Phlebitis</option><option value="extravasation">Extravasation</option><option value="infiltration">Infiltration</option></select>}</div>{metricError?<div role="alert" className="flex h-64 items-center justify-center rounded-xl bg-red-50 p-4 text-sm text-red-700">{metricError}</div>:metricLoading?<p role="status" className="flex h-64 items-center justify-center text-sm text-slate-500">กำลังโหลดตัวชี้วัด…</p>:view==='table'?<DepartmentKpiTable title={metric.key==='iv'?metric.title+' · '+ivMetric:metric.title} key={departmentId+key} years={years} getDetail={(year,month)=>(month===undefined?metricRows.find(r=>r.year===year):metricMonthly.find(r=>r.year===year&&r.month===month))?.details?.[key]} getRate={(year,month)=>month===undefined?metricRows.find(r=>r.year===year)?.[key]:metricMonthly.find(r=>r.year===year&&r.month===month)?.[key]}/>:hasData?<div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:25,right:8,left:-22,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10}} interval={0}/><YAxis tick={{fontSize:10}} unit="%"/><Tooltip filterNull={false} allowEscapeViewBox={{x:false,y:true}} wrapperStyle={{zIndex:20,pointerEvents:'none'}} content={<MonthlyTooltip monthly={metricMonthly} metric={key} title={metric.key==='iv'&&ivMetric!=='iv'?ivMetric:metric.title}/>}/>{metric.key==='product'&&<><ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="4 4"/><ReferenceLine y={110} stroke="#f59e0b" strokeDasharray="4 4"/></>}<Bar dataKey="value" name="ผลรายปี" radius={[6,6,0,0]} maxBarSize={65} label={{position:'top',fontSize:11,formatter:(v:any)=>v==null?'':`${Number(v).toFixed(2)}%`}}>{chart.map((point,i)=><Cell key={point.name} fill={colors[i]}/>)}</Bar></BarChart></ResponsiveContainer></div>:<div className="flex h-64 items-center justify-center text-sm text-slate-400">ยังไม่มีข้อมูลตัวชี้วัดนี้</div>}</section>;})}</div>
 {!loading&&!error&&<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
  {pressureSore&&<DepartmentPressureSoreHistory history={pressureSore} view={view}/>}
  <DepartmentFallHistory rows={fall} view={view}/>
 </div>}
 <DepartmentReadmitAmaCharts departmentId={departmentId} view={view}/>
</div>;
}
