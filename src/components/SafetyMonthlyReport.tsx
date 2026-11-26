'use client';

import {useEffect,useState} from 'react';
import {MonthlyTableViewport,ReportStatusIcon,ReportStatusLegend,ReportValue} from '@/components/MonthlyReportStatus';
import ReportMonthHeading from '@/components/ReportMonthHeading';

type Month={cases:number|null;days:number|null;riskDays:number|null;pending:boolean;reportedRate?:number|null};
type Row={id:number;name:string;months:Month[];historical?:Partial<Record<'all'|'risk',{cases:number;days:number;rate:number|null}>>};
const months=[10,11,12,1,2,3,4,5,6,7,8,9];

export default function SafetyMonthlyReport({kind}:{kind:'fall'|'pressure'}){
 const pressure=kind==='pressure';
 const title=pressure?'Pressure sore · แผลกดทับระดับ 2–4':'Fall · พลัดตกหกล้ม';
 const [year,setYear]=useState(2570);
 const [exportMonth,setExportMonth]=useState(10);
 const [risk,setRisk]=useState(false);
 const [result,setResult]=useState<{year:number;items:Row[];error?:string}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/api/safety-monthly-report?kind=${kind}&year=${year}`,{signal:controller.signal,cache:'no-store'})
   .then(async response=>{
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'โหลดรายงานไม่สำเร็จ');
    if(!controller.signal.aborted)setResult({year,items:data.items});
   }).catch(error=>{
    if(!controller.signal.aborted)setResult({year,items:[],error:error.message});
   });
  return ()=>controller.abort();
 },[kind,year]);

 const historical=pressure&&[2567,2568,2569].includes(year);
 const annualOnly=historical&&year!==2569;
 const current=result?.year===year?result:null;
 const denominator=(month:Month)=>Number(risk?month.riskDays:month.days);
 function annual(row:Row):Month{
  if(historical){
   const record=row.historical?.[risk?'risk':'all'];
   return {cases:record?.cases??null,days:record?.days??null,riskDays:record?.days??null,pending:false,reportedRate:record?.rate??null};
  }
  const records=row.months;
  const valid=records.filter(month=>denominator(month)>0);
  const days=valid.reduce((total,month)=>total+denominator(month),0);
  return {days,riskDays:days,cases:valid.reduce((total,month)=>total+(month.cases??0),0),pending:records.some(month=>month.pending)};
 }
 const rate=(month:Month)=>month.reportedRate!==undefined?month.reportedRate?.toFixed(2)??null:denominator(month)>0?((month.cases??0)/denominator(month)*1000).toFixed(2):null;
 const unit=risk?'ต่อ 1,000 วันนอนกลุ่มเสี่ยง':'ต่อ 1,000 วันนอน';
 function download(){
  const monthIndex=months.indexOf(exportMonth);
  const rows=[
   [title,'ปีงบประมาณ',year,annualOnly?'รวมทั้งปี':'เดือน',annualOnly?'':exportMonth,unit],
   ['หน่วยงาน','ตัวตั้ง','ตัวหาร (วันนอน)','อัตรา','สถานะ'],
   ...(current?.items??[]).map(row=>{
    const month=annualOnly?annual(row):row.months[monthIndex];
    return [row.name,month.cases??'',(risk?month.riskDays:month.days)??'',rate(month)??'',
     month.pending?'รออนุมัติ':rate(month)===null?'ไม่มีข้อมูล':'มีผลรายงาน'];
   }),
  ];
  const csv=rows.map(row=>row.map(value=>{
   const cell=String(value);
   const safe=/^[\s]*[=+@-]/.test(cell)?"'"+cell:cell;
   return '"'+safe.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=`${kind}-${year}-${annualOnly?'annual':String(exportMonth).padStart(2,'0')}${risk?'-risk':''}.csv`;
  link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 return <div className="space-y-3 p-4">
  <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-100 bg-white p-3 lg:flex-nowrap">
   <div className="min-w-0 lg:flex-1"><h1 className="text-sm font-bold xl:text-base">{title}</h1><p className="text-xs text-slate-600">{annualOnly?'ข้อมูลย้อนหลังแบบรายปี':historical?'ข้อมูลย้อนหลังจากรายงานต้นทาง':'ข้อมูลที่อนุมัติแล้ว'} · อัตรา{unit}</p></div>
   <ReportStatusLegend statuses={['pending','missing']} stacked={pressure}/>
   <div className="flex flex-wrap items-center gap-1.5 text-xs lg:shrink-0 lg:flex-nowrap">
    <label className="whitespace-nowrap">ปีงบประมาณ <select value={year} onChange={event=>setYear(Number(event.target.value))} className="rounded-lg border border-teal-200 px-2 py-1">
     {[2570,2569,2568,2567].map(value=><option key={value}>{value}</option>)}
    </select></label>
    {!annualOnly&&<label className="whitespace-nowrap">เลือกเดือน <select value={exportMonth} onChange={event=>setExportMonth(Number(event.target.value))}
     className="rounded-lg border border-teal-200 px-2 py-1">
     {months.map(month=><option key={month} value={month}>{new Intl.DateTimeFormat('th-TH',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,month-1,1)))}</option>)}
    </select></label>}
    <button type="button" onClick={download} aria-label={annualOnly?'Download CSV รายปี':'Download CSV รายเดือน'} disabled={!current?.items.length} className="rounded-lg bg-teal-700 px-3 py-1.5 text-white disabled:opacity-50">Download</button>
    {pressure&&<div role="group" aria-label="ตัวหารแผลกดทับ" className="flex flex-wrap gap-2">
     {[false,true].map(value=><button key={String(value)} type="button" aria-pressed={risk===value} onClick={()=>setRisk(value)}
      className="rounded-lg border border-teal-200 whitespace-nowrap px-2 py-1.5 text-xs aria-pressed:bg-teal-700 aria-pressed:text-white">
      {value?'วันนอนกลุ่มเสี่ยง':'วันนอนทั้งหมด'}
     </button>)}
    </div>}
   </div>
  </header>
  {!current?<p role="status">กำลังโหลดข้อมูล…</p>:current.error?<p role="alert">{current.error}</p>:!current.items.length?<p>ไม่มีหน่วยงานในรายงานตามสิทธิ์ของบัญชี</p>:
  <MonthlyTableViewport label={title}>
   <table className="w-full min-w-[780px] bg-white text-xs">
    <thead className="sticky top-0 z-10 bg-slate-50"><tr>
     <th scope="col" className="px-2 py-2 text-left">หน่วยงาน</th>
     {months.map(month=><ReportMonthHeading key={month} month={month}/>)}
     <th scope="col" className="bg-teal-50 px-2 py-2">รวมทั้งปี</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{current.items.map(row=><tr key={row.id}>
     <th scope="row" className="px-2 py-1.5 text-left">{row.name}</th>
     {[...row.months,annual(row)].map((month,index)=>{
      const value=rate(month);
      return <td key={index} className={`px-1 py-1.5 text-right tabular-nums ${index===12?'bg-teal-50 font-bold':''}`}>
       {value!==null?<ReportValue align="right" warning={month.pending&&<ReportStatusIcon status="pending"/>}>
        <span title={`${month.cases??0} / ${denominator(month)} วันนอน`}>{value}</span>
       </ReportValue>:<ReportStatusIcon status={month.pending?'pending':'missing'}/>}
       {(value!==null||month.cases!==null)&&<span className="block whitespace-nowrap text-[10px] font-normal text-slate-500"
        aria-label="จำนวนเหตุการณ์ / วันนอน">{month.cases??'—'}/{(risk?month.riskDays:month.days)??'—'}</span>}
      </td>;
     })}
    </tr>)}</tbody>
   </table>
  </MonthlyTableViewport>}
 </div>;
}
