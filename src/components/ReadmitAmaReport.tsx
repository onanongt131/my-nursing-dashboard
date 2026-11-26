'use client';
import { ReportStatusIcon, ReportStatusLegend, ReportValue, MonthlyTableViewport } from '@/components/MonthlyReportStatus';
import {sortMonthlyDepartments} from '@/lib/monthlyReportDepartments';
import ReportMonthHeading from '@/components/ReportMonthHeading';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {buildCells,fiscalMonths,summaryMonth,total,type Incident,type ReportKind,type Summary} from '@/lib/readmitAmaReport';

type Data={fiscal_year:number;departments:{id:number|string;name:string}[];readmit:Incident[];ama:Incident[];readmitSummaries:Summary[];amaSummaries:Summary[]};
const MONTH_LABEL=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const label=(ym:string)=>MONTH_LABEL[Number(ym.slice(5,7))-1]+' '+String(Number(ym.slice(0,4))+543).slice(-2);
const KINDS:{key:ReportKind;title:string;rateLabel:string;denominator:string;detail:string}[]=[
 {key:'readmit',title:'Re-admit',rateLabel:'อัตรา Re-admit',denominator:'จำหน่ายเดือนก่อน',detail:'โรคที่ Admit'},
 {key:'ama',title:'จำหน่ายไม่สมัครอยู่ (AMA)',rateLabel:'อัตรา AMA',denominator:'จำหน่ายทั้งหมด',detail:'เหตุผลไม่สมัครอยู่'},
];
const fmt=(v:number|null)=>v===null?'—':v.toFixed(2);
function currentFiscalYear(){const now=new Date(),y=now.getFullYear()+543;return now.getMonth()>=9?y+1:y;}

export default function ReadmitAmaReport({fixedKind}:{fixedKind?:ReportKind}){
 const [year,setYear]=useState(2570),[kind,setKind]=useState<ReportKind>(fixedKind||'readmit'),[includePending,setIncludePending]=useState(true);
 const [data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[detail,setDetail]=useState<{title:string;rows:Incident[]}|null>(null);
 const generation=useRef(0);
 const load=useCallback(async()=>{const token=++generation.current;setLoading(true);setError('');try{const r=await fetch('/api/readmit-ama-report?fiscal_year='+year,{cache:'no-store'}),body=await r.json();if(!r.ok)throw new Error(body.error||'โหลดรายงานไม่สำเร็จ');if(token===generation.current)setData(body);}catch(e){if(token===generation.current){setData(null);setError(e instanceof Error?e.message:'โหลดรายงานไม่สำเร็จ');}}finally{if(token===generation.current)setLoading(false);}},[year]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{if(!detail)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setDetail(null);};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=before;window.removeEventListener('keydown',key);};},[detail]);

 const meta=KINDS.find(k=>k.key===kind)!,months=fiscalMonths(year);
 const incidents=useMemo(()=>data?(kind==='readmit'?data.readmit:data.ama):[],[data,kind]);
 const summaries=useMemo(()=>data?(kind==='readmit'?data.readmitSummaries:data.amaSummaries):[],[data,kind]);
 const departments=useMemo(()=>sortMonthlyDepartments(data?.departments||[]),[data]);
 const pendingSummaries=useMemo(()=>new Set(summaries.filter(s=>s.status==='pending')
   .map(s=>String(s.department_id)+'|'+summaryMonth(s))),[summaries]);
 const cells=useMemo(()=>buildCells(year,departments.map(d=>d.id),incidents,summaries,includePending),[year,departments,incidents,summaries,includePending]);
 const cellOf=(id:string,month:string)=>cells.find(c=>c.department_id===id&&c.month===month)!;
 const overall=total(cells,includePending),pendingAll=incidents.filter(i=>i.status==='pending').length;
 const open=(title:string,rows:Incident[])=>setDetail({title,rows:[...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date)))});
 const casesOf=(id:string,month?:string)=>incidents.filter(i=>String(i.department_id)===id&&(!month||String(i.date).slice(0,7)===month)&&(i.status==='approved'||(includePending&&i.status==='pending')));
 const years=[currentFiscalYear()+1,currentFiscalYear(),currentFiscalYear()-1,2570].filter((y,i,a)=>y>=2570&&a.indexOf(y)===i);

 return <div data-print-readmit-ama className="mx-auto w-full min-w-0 max-w-[1480px] space-y-3 px-3 py-4 sm:px-5 lg:px-6">
  <style>{`
   @media print {
    body:has([data-print-readmit-ama]) { overflow: visible !important; }
    body:has([data-print-readmit-ama]) *:not([data-print-readmit-ama]):not([data-print-readmit-ama] *):not(:has([data-print-readmit-ama])) { display: none !important; }
    body :has([data-print-readmit-ama]), [data-print-readmit-ama] {
     display: block !important;
     position: static !important;
     width: 100% !important;
     max-width: none !important;
     min-height: 0 !important;
     overflow: visible !important;
     margin: 0 !important;
     padding: 0 !important;
     background: white !important;
    }
    [data-print-readmit-ama] section { overflow: visible !important; box-shadow: none !important; }
    [data-print-readmit-ama] thead { display: table-header-group; position: static !important; }
    [data-print-readmit-ama] tr { break-inside: avoid; }
    [data-print-readmit-ama] th { position: static !important; }
    [data-print-readmit-ama] .truncate { white-space: normal; overflow: visible; }
   }
  `}</style>
  <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-white px-5 py-3 shadow-sm print:border-none print:shadow-none">
   <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><h1 className="text-lg font-extrabold text-slate-900">รายงาน {fixedKind?meta.title:'Re-admit / จำหน่ายไม่สมัครอยู่'}</h1><ReportStatusLegend statuses={['pending','missing']}/></div>
   <p className="hidden text-xs print:block">ปีงบประมาณ {year} · {includePending?'รวมรายการรออนุมัติ':'เฉพาะรายการอนุมัติ'}</p>
   <div className="flex flex-wrap items-center gap-2 print:hidden">
    <label className="text-sm text-slate-600">ปีงบประมาณ <select value={year} onChange={e=>setYear(Number(e.target.value))} className="ml-1 rounded-lg border border-slate-300 px-2 py-1.5">{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
    <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800"><input type="checkbox" checked={includePending} onChange={e=>setIncludePending(e.target.checked)}/>รวมรายการรออนุมัติ</label>
    <button type="button" onClick={()=>window.print()} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">พิมพ์รายงาน</button>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {!fixedKind&&<section aria-label="เลือกรายงาน" className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">{KINDS.map(k=>{const list=data?(k.key==='readmit'?data.readmit:data.ama):[],pending=list.filter(i=>i.status==='pending').length,approved=list.filter(i=>i.status==='approved').length,active=kind===k.key;
   return <button key={k.key} type="button" aria-pressed={active} onClick={()=>setKind(k.key)} className={`rounded-2xl border p-4 text-left shadow-sm transition ${active?'border-teal-600 bg-teal-50 ring-2 ring-teal-600/20':'border-slate-200 bg-white hover:border-teal-300'}`}>
    <div className="text-sm font-bold text-slate-800">{k.title}</div><div className="mt-1 text-2xl font-extrabold text-teal-800">{approved+(includePending?pending:0)} <span className="text-sm font-semibold text-slate-500">ราย</span></div>
    <div className="mt-1 text-xs text-slate-500">อนุมัติแล้ว {approved}{pending>0&&<span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">รออนุมัติ {pending}</span>}</div></button>;})}</section>}
  <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-800">{meta.rateLabel} (%) = จำนวนราย ÷ {meta.denominator} × 100</h2></div>
    <div className="text-sm font-semibold text-slate-700">รวมทั้งปี {fmt(overall.rate)}% ({overall.ratedCount}/{overall.denominator??'?'} • ทั้งหมด {overall.count} ราย){pendingAll>0&&<span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">รออนุมัติ {pendingAll}</span>}</div></div>
   {loading?<p className="p-6 text-sm text-slate-500">กำลังโหลด…</p>:!departments.length?<p className="p-6 text-sm text-slate-500">ไม่มีหน่วยงานที่มีสิทธิ์ดู</p>:
   <MonthlyTableViewport label={meta.title}><table className="w-full table-fixed border-collapse text-xs">
    <thead className="bg-slate-50 text-slate-600"><tr><th className="sticky left-0 z-10 w-[17%] bg-slate-50 px-3 py-2 text-left">หน่วยงาน</th>{months.map(m=><ReportMonthHeading key={m} month={m} className="!px-0.5" />)}<th className="w-[8%] px-2 py-2 text-center">ทั้งปี</th></tr></thead>
    <tbody className="divide-y divide-slate-100">{departments.map(d=>{const id=String(d.id),t=total(cells,includePending,id);return <tr key={id} className="h-9 hover:bg-slate-50/60">
     <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-0 text-left font-medium text-indigo-600">
       <span title={d.name} className="flex items-center gap-2">
         <span aria-hidden="true" className="shrink-0">🏢</span><span className="truncate">{d.name}</span>
       </span>
     </th>
     {months.map(m=>{
       const c=cellOf(id,m),count=c.approved+(includePending?c.pending:0);
       const summaryPending=pendingSummaries.has(id+'|'+m);
       const hasCases=c.approved+c.pending>0;
       const incomplete=hasCases&&c.rate===null;
       const pending=c.pending>0||summaryPending||incomplete;
       const statusDetail=[
         c.pending>0?'รออนุมัติ '+c.pending+' ราย':'',
         summaryPending?'สรุปรายเดือนรออนุมัติ':'',
         incomplete?'ข้อมูลสรุปรายเดือนยังไม่ครบสำหรับคำนวณ':'',
       ].filter(Boolean).join(' · ');
       return <td key={m} className="px-0.5 py-0 text-right align-middle">
         {c.rate===null ? (
           <button type="button" disabled={!count} onClick={()=>open(d.name+' • '+label(m),casesOf(id,m))}
             className="rounded-full enabled:hover:ring-2 enabled:hover:ring-teal-200">
             <ReportStatusIcon status={pending?'pending':'missing'} detail={statusDetail||undefined}/>
           </button>
         ) : (
           <ReportValue align="compact" warning={pending&&<ReportStatusIcon status="pending" detail={statusDetail}/>}>
             <button type="button" disabled={!count} onClick={()=>open(d.name+' • '+label(m),casesOf(id,m))}
               className="max-w-full rounded text-right leading-tight tabular-nums enabled:hover:bg-teal-50 disabled:cursor-default">
               <div className={'font-bold '+(c.rate>0?'text-rose-600':'text-emerald-700')}>{fmt(c.rate)}</div>
               <div className="break-all text-[10px] tabular-nums text-slate-500">{count}/{c.denominator}</div>
             </button>
           </ReportValue>
         )}
       </td>;
     })}
     <td className="px-1 py-0 text-right align-middle">
       {t.rate===null ? (
         <button type="button" disabled={!t.count} onClick={()=>open(d.name+' • ปีงบประมาณ '+year,casesOf(id))}
           className="rounded-full enabled:hover:ring-2 enabled:hover:ring-teal-200">
           <ReportStatusIcon status={t.missingDenominator>0?'pending':'missing'}
             detail={t.missingDenominator>0?'ข้อมูลสรุปยังไม่ครบ '+t.missingDenominator+' เดือน':undefined}/>
         </button>
       ) : (
         <ReportValue align="compact" warning={t.missingDenominator>0&&<ReportStatusIcon status="pending" detail={'ข้อมูลสรุปยังไม่ครบ '+t.missingDenominator+' เดือน'}/>}>
           <button type="button" disabled={!t.count} onClick={()=>open(d.name+' • ปีงบประมาณ '+year,casesOf(id))}
             className="max-w-full rounded text-right leading-tight tabular-nums enabled:hover:bg-teal-50 disabled:cursor-default">
             <div className="font-extrabold text-slate-800">{fmt(t.rate)}</div>
             <div className="break-all text-[10px] tabular-nums text-slate-500">{t.ratedCount}/{t.denominator}</div>
           </button>
         </ReportValue>
       )}
     </td>
    </tr>;})}</tbody></table></MonthlyTableViewport>}
  </section>
  {detail&&createPortal(<div role="dialog" aria-modal="true" aria-label={detail.title} onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}} className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-3">
   <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
    <header className="flex items-center justify-between bg-teal-700 px-5 py-3 text-white"><div><h3 className="font-bold">{meta.title}</h3><p className="text-xs text-teal-100">{detail.title} • {detail.rows.length} ราย</p></div><button type="button" aria-label="ปิด" onClick={()=>setDetail(null)} className="rounded-full px-2 text-xl hover:bg-white/10">×</button></header>
    <div className="overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-600"><tr><th className="px-3 py-2 text-left">วันที่</th><th className="px-3 py-2 text-left">HN / AN</th><th className="px-3 py-2 text-left">{meta.detail}</th><th className="px-3 py-2 text-left">สถานะ</th></tr></thead>
     <tbody className="divide-y divide-slate-100">{detail.rows.map(r=><tr key={String(r.id)}><td className="px-3 py-2 whitespace-nowrap">{r.date}</td><td className="px-3 py-2 whitespace-nowrap">HN {r.hn}<br/><span className="text-xs text-slate-500">AN {r.an}</span></td><td className="px-3 py-2">{r.detail||'-'}{r.extra&&<div className="text-xs text-slate-500">{r.extra}</div>}</td>
      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status==='approved'?'bg-emerald-50 text-emerald-700':'bg-amber-100 text-amber-800'}`}>{r.status==='approved'?'อนุมัติแล้ว':'รออนุมัติ'}</span></td></tr>)}</tbody></table></div>
   </div></div>,document.body)}
 </div>;
}
