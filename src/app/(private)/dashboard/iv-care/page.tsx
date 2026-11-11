'use client';
import { ReportStatusIcon, ReportStatusLegend, ReportValue, MonthlyTableViewport } from '@/components/MonthlyReportStatus';
import { sortMonthlyDepartments } from '@/lib/monthlyReportDepartments';
import ReportMonthHeading from '@/components/ReportMonthHeading';
import {useState,useEffect,useMemo,useCallback,useRef} from 'react';
import {createPortal} from 'react-dom';
import {createClient} from '@/utils/supabase/client';
import {ivFraction,ivPercent,type IvMetric,type IvReportRow} from '@/lib/ivCareReport';
const months=[{id:10,name:'OCT'},{id:11,name:'NOV'},{id:12,name:'DEC'},{id:1,name:'JAN'},{id:2,name:'FEB'},{id:3,name:'MAR'},{id:4,name:'APR'},{id:5,name:'MAY'},{id:6,name:'JUN'},{id:7,name:'JUL'},{id:8,name:'AUG'},{id:9,name:'SEP'}];
const tabs:{key:IvMetric;label:string;detail:string}[]=[{key:'success',label:'อัตราความสำเร็จ',detail:'ครั้งแรกสำเร็จ / แทงเข็มทั้งหมด'},{key:'phlebitis',label:'Phlebitis',detail:'ระดับ 3–4 / ตำแหน่งให้สารน้ำ'},{key:'extravasation',label:'Extravasation',detail:'ทุกระดับ / ตำแหน่งให้สารน้ำ'},{key:'infiltration',label:'Infiltration',detail:'ทุกระดับ / ตำแหน่งให้สารน้ำ'}];
const fmt=(n:number|null)=>n===null?'—':n.toFixed(2);
type IvDepartment = {id: number | string; Department: string; group?: string | null};

type IvExportIncident = {
 department_id: string | number;
 record_date: string;
 complication: string;
 grade: number;
 status: string;
 contributing_factors?: {groups?: {label: string; items: {label: string; detail?: string; causes: {label: string}[]}[]}[]};
 factor_drug?: string;
 factor_fluid?: string;
 factor_patient?: string;
 factor_personnel?: string;
};

export default function IvCarePage(){
 const [year,setYear]=useState(2570),[tab,setTab]=useState<IvMetric>('success'),[rows,setRows]=useState<IvReportRow[]>([]),[departments,setDepartments]=useState<IvDepartment[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState(''),[pendingMonths,setPendingMonths]=useState<Set<string>>(new Set()),[detail,setDetail]=useState<{title:string;subtitle:string;lines:{label:string;value:string}[]}|null>(null);
 const [incidents,setIncidents]=useState<IvExportIncident[]>([]);
 const [exportMonth,setExportMonth]=useState(10);
 const supabase=useMemo(()=>createClient(),[]),generation=useRef(0);
 const load=useCallback(async()=>{const token=++generation.current;setLoading(true);try{const response=await fetch('/api/iv-care-report',{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error||'โหลดรายงานไม่สำเร็จ');if(token!==generation.current)return;setRows(body.items||[]);setIncidents(body.incidents||[]);setDepartments(sortMonthlyDepartments<IvDepartment>(body.departments||[]));setPendingMonths(new Set(body.pending_months||[]));setWarning(body.invalid?'ข้อมูลไม่ถูกต้อง/สรุปซ้ำ '+body.invalid+' รายการ':'');setError('');}catch(e){if(token===generation.current)setError(e instanceof Error?e.message:'โหลดไม่สำเร็จ');}finally{if(token===generation.current)setLoading(false);}},[]);
 useEffect(()=>{void load();const channel=supabase.channel('iv-care-report').on('postgres_changes',{event:'*',schema:'public',table:'iv_care_data'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'iv_care_complications'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'iv_care_monthly_summaries'},()=>void load()).subscribe();return()=>{generation.current++;void supabase.removeChannel(channel);};},[load,supabase]);
 useEffect(()=>{if(!detail)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[detail]);
 const years=useMemo(()=>Array.from(new Set([2570,2569,2568,2567,2566,...rows.map(r=>Number(r.fiscal_year))])).sort((a,b)=>b-a),[rows]);
 const selected=useMemo(()=>rows.filter(r=>Number(r.fiscal_year)===year),[rows,year]);
 const monthlyMetrics=useMemo(()=>months.map(month=>{
   const data=selected.filter(row=>Number(row.month)===month.id);
   return {...month,values:Object.fromEntries(tabs.map(metric=>[metric.key,ivPercent(data,metric.key,'overall')]))};
 }),[selected]);
 const departmentNames=useMemo(()=>Object.fromEntries(departments.map(d=>[String(d.id),d.Department])),[departments]);
 const name=(id:string|number,y=year)=>{const raw=departmentNames[String(id)]||`หน่วยงาน ${id}`;if(![2566,2567,2568].includes(y))return raw;return ({'อายุรกรรม 4':'อายุรกรรมชาย 1','อายุรกรรม 2':'อายุรกรรมชาย 2','อายุรกรรม 5':'อายุรกรรมหญิง','อายุรกรรม 6':'ร่มไทร'} as Record<string,string>)[raw]||raw;};
 const hasPending = (id: string, month: number) =>
   year === 2570 && pendingMonths.has(id + ':' + (month >= 10 ? '2026' : '2027') + '-' + String(month).padStart(2, '0'));
 const units=departments.map(d=>String(d.id));
 const monthRows=useMemo(()=>{
   const buckets=new Map<string,IvReportRow[]>();
   for(const row of selected){
     const key=String(row.department_id)+':'+Number(row.month);
     const group=buckets.get(key);
     if(group)group.push(row);
     else buckets.set(key,[row]);
   }
   return buckets;
 },[selected]);
 const hasExportData=units.some(id=>monthRows.has(id+':'+exportMonth)||hasPending(id,exportMonth));
 function downloadMonthly(){
   const reportRows=[
     ['IV Care','ปีงบประมาณ',year,'เดือน',months.find(month=>month.id===exportMonth)?.name],
     ['หน่วยงาน',...tabs.flatMap(metric=>[metric.label+' (%)',metric.label+' ตัวตั้ง',metric.label+' ตัวหาร']),'สถานะ'],
     ...units.map(id=>{
       const data=monthRows.get(id+':'+exportMonth)||[];
       const values=tabs.map(metric=>ivPercent(data,metric.key));
       const status=hasPending(id,exportMonth)?'มีรายการรออนุมัติ':values.some(value=>value!==null)?'มีผลรายงาน':'ไม่มีข้อมูล';
       const metrics=tabs.flatMap((metric,index)=>{
         const pairs=data.flatMap(row=>{
           const denominator=Number(metric.key==='success'?row.all_iv_insertion:row.iv_position);
           const pair=ivFraction(row,metric.key);
           return pair&&denominator>0?[pair]:[];
         });
         // Historical rates can average multiple records. Keep their paired counts in matching order.
         return [values[index]?.toFixed(2),pairs.map(pair=>pair.n).join(' / '),pairs.map(pair=>pair.d).join(' / ')];
       });
       return [name(id),...metrics,status];
     }),
   ];
   const period=`${year-(exportMonth>=10?544:543)}-${String(exportMonth).padStart(2,'0')}`;
   const monthlyIncidents=incidents.filter(row=>row.record_date.slice(0,7)===period);
   if(monthlyIncidents.length){
     reportRows.push([],['รายละเอียดปัจจัยภาวะแทรกซ้อน'],
       ['หน่วยงาน','วันที่','ภาวะแทรกซ้อน','ระดับ','สถานะ','ปัจจัยจากแบบบันทึก','ปัจจัยด้านยา','ปัจจัยด้านสารน้ำ','ปัจจัยด้านผู้ป่วย','ปัจจัยด้านบุคลากร']);
     for(const row of monthlyIncidents){
       const factors=row.contributing_factors?.groups?.flatMap(group=>group.items.map(item=>
         [group.label,item.label,...item.causes.map(cause=>cause.label),item.detail].filter(Boolean).join(' · ')
       )).join(' | ');
       reportRows.push([name(row.department_id),row.record_date,row.complication,row.grade,
         row.status==='pending'?'รออนุมัติ':'อนุมัติแล้ว',factors,row.factor_drug,row.factor_fluid,row.factor_patient,row.factor_personnel]);
     }
   }
   const csv=reportRows.map(row=>row.map(value=>{
     const cell=String(value??'');
     const safeCell=/^\s*[=+@-]/.test(cell)?"'"+cell:cell;
     return '"'+safeCell.replaceAll('"','""')+'"';
   }).join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
   const link=document.createElement('a');
   link.href=url;
   link.download=`IV-Care-${year}-${String(exportMonth).padStart(2,'0')}.csv`;
   link.click();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function unitAverage(id:string){let data=selected.filter(r=>String(r.department_id)===id);if(year===2569){const raw=departmentNames[id];if(raw==='อายุรกรรม 3')data=data.filter(r=>![10,11,12,1,2].includes(Number(r.month)));if(raw==='อายุรกรรม 7')data=data.filter(r=>![10,11,12,1,2,3].includes(Number(r.month)));}return ivPercent(data,tab);}
 function history(id:string){setDetail({title:'สถิติย้อนหลังรายปี',subtitle:name(id)+' · '+tabs.find(t=>t.key===tab)?.label,lines:years.map(y=>({label:`ปีงบประมาณ ${y}`,value:fmt(ivPercent(rows.filter(r=>String(r.department_id)===id&&Number(r.fiscal_year)===y),tab))+'%'}))});}
 function cell(id:string,m:number){if(tab==='success')return;const data=selected.filter(r=>String(r.department_id)===id&&Number(r.month)===m);const usable=data.filter(r=>r.source!=='live'||r.has_summary);const denominator=usable.reduce((s,r)=>s+(Number(r.iv_position)||0),0);const prefix=tab;const lines=[1,2,3,4].map(level=>{const count=usable.reduce((s,r)=>s+(Number(r[`${prefix}_${level}`])||0),0);return {label:`ระดับ ${level} · ${count} ครั้ง`,value:denominator>0?(count/denominator*100).toFixed(2)+'%':'—'};});setDetail({title:tabs.find(t=>t.key===tab)?.label||'',subtitle:`${name(id)} · ${months.find(x=>x.id===m)?.name} · ปีงบประมาณ ${year}`,lines:[{label:'จำนวนตำแหน่งให้สารน้ำ',value:denominator>0?denominator.toLocaleString():'—'},...lines]});}
 const scoreColor=(v:number|null)=>v===null?'text-slate-300':(tab==='success'?v>=80:v===0)?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-rose-200 bg-rose-50 text-rose-600';
 return <div className="mx-auto w-full min-w-0 max-w-[1480px] space-y-3 px-3 py-4 sm:px-5 lg:px-6"><header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-sm">
   <h1 className="text-lg font-extrabold text-slate-900">รายงาน IV Care</h1>
   <ReportStatusLegend statuses={['pending','missing']}/>
   <div className="flex flex-wrap items-center gap-2 text-xs">
    <label htmlFor="iv-year" className="font-semibold text-slate-700">ปีงบประมาณ</label>
    <select id="iv-year" value={year} onChange={e=>{setYear(Number(e.target.value));setDetail(null);}}
      className="h-8 rounded-lg border border-teal-200 bg-teal-50 px-2 text-teal-900">
     {years.map(y=><option key={y} value={y}>{y}</option>)}
    </select>
    <button type="button" disabled={loading} onClick={()=>void load()}
      className="h-8 rounded-lg border border-slate-200 px-3 text-slate-600 disabled:opacity-50">{loading?'กำลังโหลด…':'โหลดใหม่'}</button>
   </div>
   <div className="flex flex-wrap items-center gap-2 text-xs">
    <label htmlFor="iv-export-month" className="font-semibold text-slate-700">เลือกเดือน</label>
    <input id="iv-export-month" type="month"
      value={`${year-(exportMonth>=10?544:543)}-${String(exportMonth).padStart(2,'0')}`}
      min={`${year-544}-10`} max={`${year-543}-09`}
      onChange={event=>{
       const input=event.currentTarget;
       if(input.value&&input.validity.valid)setExportMonth(Number(input.value.slice(-2)));
      }}
      className="h-8 rounded-lg border border-teal-200 bg-white px-2 text-slate-700"/>
    <button type="button" onClick={downloadMonthly} disabled={loading||!!error||!hasExportData}
      aria-label="ดาวน์โหลดรายงาน IV Care รายเดือน (CSV)"
      className="h-8 rounded-lg bg-teal-700 px-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">Download</button>
   </div>
 </header>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{year===2570&&warning&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>}
 <section aria-label="เลือกตัวชี้วัด IV Care" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tabs.map(t=>{const v=ivPercent(selected,t.key,'overall'),active=tab===t.key;return <button key={t.key} type="button" aria-pressed={active} onClick={()=>{setTab(t.key);setDetail(null);}} className={`group/card rounded-xl border px-3 py-1.5 text-left shadow-sm transition ${active?'border-teal-800 bg-teal-800 text-white':'border-slate-200 bg-white text-slate-800 hover:border-teal-300'}`}><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold leading-5">{t.label}</h2></div><span className="group/monthly relative inline-block" aria-describedby={!loading&&!error?`iv-monthly-${t.key}`:undefined}>
   <span className="block mt-0.5 text-xl font-extrabold tabular-nums">{loading?'…':fmt(v)}<span className={`ml-1 text-sm ${active?'text-teal-200':'text-slate-400'}`}>{v===null?'':'%'}</span></span>
   {!loading&&!error&&<span id={`iv-monthly-${t.key}`} role="tooltip"
     className="absolute left-0 top-full z-40 hidden w-40 rounded-xl lg:w-48 border border-teal-100 bg-white p-3 text-xs text-slate-700 shadow-lg group-hover/monthly:block group-focus-visible/card:block">
     <span className="mb-2 block font-semibold text-teal-800">{t.label} · รายเดือน</span>
     {monthlyMetrics.map(month=><span key={month.id} className="flex justify-between gap-2 py-0.5">
       <span>{month.name}</span><span className="font-semibold tabular-nums">{month.values[t.key]===null?'—':fmt(month.values[t.key])+'%'}</span>
     </span>)}
   </span>}
 </span></button>;})}</section>
 <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"><div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-sm font-bold text-slate-800">{tabs.find(t=>t.key===tab)?.label} · รายหน่วยงาน</h2><p className="text-xs text-slate-400">{units.length} หน่วยงาน · ตุลาคม – กันยายน · ร้อยละ</p></div><p className="text-[11px] text-slate-400">{tab==='success'?'เกณฑ์สีตามเดิม: ตั้งแต่ 80%':'เกณฑ์สีตามเดิม: 0%'}</p></div><MonthlyTableViewport label="ตาราง IV Care"><table className="w-full min-w-[1160px] table-fixed border-separate border-spacing-0 text-xs"><colgroup><col className="w-[170px]"/>{months.map(m=><col key={m.id}/>)}<col className="w-[92px]"/></colgroup><thead className="sticky top-0 z-20 bg-slate-50 text-slate-600"><tr><th className="sticky left-0 z-30 bg-slate-50 px-3 py-2 text-left">หน่วยงาน</th>{months.map(m=><ReportMonthHeading key={m.id} month={m.id} />)}<th className="bg-teal-50 px-1 py-2">{year===2570?'รวมทั้งปี':'ค่าเฉลี่ย'}</th></tr></thead><tbody>{loading?<tr><td colSpan={14} className="p-10 text-center text-slate-400">กำลังโหลดข้อมูล…</td></tr>:!units.length?<tr><td colSpan={14} className="p-10 text-center text-slate-400">ยังไม่มีข้อมูล{year===2570?'ที่อนุมัติแล้ว':''}ในปีงบประมาณ {year}</td></tr>:units.map(id=><tr key={id} className="group hover:bg-teal-50/30"><td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-1.5 group-hover:bg-teal-50"><button type="button" title={name(id)} onClick={()=>history(id)} className="flex w-full min-w-0 items-center gap-1.5 text-left font-medium text-indigo-600 hover:text-indigo-900 hover:underline"><span aria-hidden="true" className="shrink-0">🏢</span><span className="truncate">{name(id)}</span></button></td>{months.map(m=>{
   const v=ivPercent(monthRows.get(id+':'+m.id)||[],tab);
   const pending=hasPending(id,m.id);
   return <td key={m.id} className="border-l border-t border-slate-100 px-1 py-1 text-center">
     {v!==null?<ReportValue warning={pending&&<ReportStatusIcon status="pending"/>}>
       <button type="button" disabled={tab==='success'} onClick={()=>cell(id,m.id)}
         className={'min-w-8 rounded-md border px-1 py-0.5 font-semibold tabular-nums '+scoreColor(v)}>{v.toFixed(1)}</button>
     </ReportValue>:pending?<ReportStatusIcon status="pending"/>:<ReportStatusIcon status="missing" detail="ไม่มีข้อมูลหรือไม่มีตัวหารที่ใช้คำนวณ"/>}
   </td>;
 })}<td className="border-t border-slate-100 bg-teal-50/60 px-1 py-1.5 text-center font-bold tabular-nums text-teal-900"><ReportValue warning={months.some(m=>hasPending(id,m.id))&&<ReportStatusIcon status="pending"/>}>{fmt(unitAverage(id))}</ReportValue></td></tr>)}</tbody></table></MonthlyTableViewport></section>
 {detail&&createPortal(<div role="dialog" aria-modal="true" aria-label={detail.title} className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/60 p-3"><div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between gap-3 bg-teal-800 p-4 text-white"><div><h3 className="font-bold">{detail.title}</h3><p className="mt-1 text-xs text-teal-100">{detail.subtitle}</p></div><button type="button" aria-label="ปิด" onClick={()=>setDetail(null)} className="rounded-lg px-2 py-1 text-xl">×</button></header><div className="space-y-2 overflow-y-auto p-4">{detail.lines.map((line,i)=><div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 text-sm"><span className="text-slate-600">{line.label}</span><strong className="tabular-nums text-teal-800">{line.value==='—%'?'—':line.value}</strong></div>)}</div><footer className="flex justify-end border-t p-3"><button type="button" onClick={()=>setDetail(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm">ปิดหน้าต่าง</button></footer></div></div>,document.body)}
 </div>;
}
