'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Department = { id?: string | number; Department?: string; department_name?: string; name?: string; group?: string; group_name?: string };
type Item = { label: string; href: string };
type Group = { label: string; items: Item[] };

const dash: Item[] = [
  {label:'Executive Dashboard',href:'/dashboard/nursing-dashboard/executive'},
  {label:'Strategic Dashboard',href:'/dashboard/nursing-dashboard/strategic'},
  {label:'Quality & Safety',href:'/dashboard/nursing-dashboard/quality-safety'},
  {label:'Workforce',href:'/dashboard/nursing-dashboard/workforce'},
  {label:'People Excellence',href:'/dashboard/nursing-dashboard/people-excellence'},
  {label:'Action & Risk',href:'/dashboard/nursing-dashboard/action-risk'},
];
const nso: Item[] = [
  {label:'ภาพรวมยุทธศาสตร์',href:'/dashboard/nso-strategy'},
  {label:'SWOT / TOWS',href:'/dashboard/nso-strategy/swot'},
  {label:'แผนยุทธศาสตร์',href:'/dashboard/nso-strategy/plan'},
  {label:'Strategy Map',href:'/dashboard/nso-strategy/strategy-map'},
  {label:'KPI Dictionary',href:'/dashboard/nso-strategy/kpi'},
  {label:'Action Plan',href:'/dashboard/nso-strategy/action-plan'},
  {label:'บันทึกและรับรองผล',href:'/dashboard/nso-strategy/monitoring'},
];
const workforce: Item[] = [
  {label:'บุคลากรและสมรรถนะ',href:'/dashboard/staffing'},
  {label:'Ward Command Center',href:'/dashboard/staffing/command-center'},
  {label:'ตารางเวร',href:'/dashboard/staffing/schedule'},
  {label:'ภาพรวมอัตรากำลัง',href:'/dashboard/staffing/overview'},
  {label:'รายงานเวรตรวจการ',href:'/dashboard/staffing/inspection-report'},
];
const committees: Item[] = [
  {label:'คณะกรรมการบริหาร',href:'/dashboard/committee/executive'},
  {label:'คณะกรรมการ QA',href:'/dashboard/committee/qa'},
  {label:'คณะกรรมการ RM',href:'/dashboard/committee/rm'},
  {label:'คณะกรรมการ HRN',href:'/dashboard/committee/academic'},
  {label:'คณะกรรมการอัตรากำลัง',href:'/dashboard/committee/personnel'},
  {label:'คณะกรรมการ R2R',href:'/dashboard/committee/r2r'},
  {label:'คณะกรรมการบ้านพัก',href:'/dashboard/committee/home'},
];
const kpis: Item[] = [
  {label:'KPI ตามหมวด',href:'/dashboard/category'},
  {label:'KPI ตามแผน',href:'/dashboard/strategy'},
  {label:'KPI RM',href:'/dashboard/rm'},
];
const monthly: Item[] = [
  {label:'Productivity',href:'/dashboard/productivity'},
  {label:'WP/QA',href:'/dashboard/wp-qa'},
  {label:'IV Care',href:'/dashboard/iv-care'},
  {label:'Audit Chart',href:'/dashboard/audit-chart'},
];
const nursingBranches: Item[] = [
  'การพยาบาลวิจัยและพัฒนาการบริการ','การพยาบาลผู้ป่วยหนัก','การพยาบาลผู้ป่วยอุบัติเหตุและฉุกเฉิน',
  'การพยาบาลผู้ป่วยผ่าตัด','การพยาบาลผู้ป่วยอายุรกรรม','การพยาบาลควบคุมและป้องกันการติดเชื้อ',
  'การพยาบาลผู้ป่วยกุมารเวชกรรม','การพยาบาลโสต ศอ นาสิก จักษุ','การพยาบาลตรวจรักษาพิเศษ',
  'การพยาบาลผู้ป่วยศัลยกรรม','การพยาบาลผู้ป่วยสูติ–นรีเวช','การพยาบาลผู้ป่วยจิตเวช',
  'การพยาบาลผู้ป่วยนอก','การพยาบาลวิสัญญี','การพยาบาลผู้คลอด','การพยาบาลผู้ป่วยออร์โธปิดิกส์'
].map((label,i)=>({label,href:`/dashboard/nursing/branch-${i+1}`}));
const matching = (path:string, href:string) => path===href || (href!=='/dashboard/nso-strategy' && path.startsWith(href+'/'));
function sectionFor(path:string){
  if(path.startsWith('/dashboard/nso-strategy'))return 'nso';
  if(path.startsWith('/dashboard/nursing-dashboard'))return 'dash';
  if(path.startsWith('/dashboard/departments'))return 'units';
  if(path.startsWith('/dashboard/nursing/'))return 'branches';
  if(path.startsWith('/dashboard/staffing'))return 'staff';
  if(path.startsWith('/dashboard/committee'))return 'committee';
  if(['/dashboard/category','/dashboard/strategy','/dashboard/rm'].some(p=>path===p||path.startsWith(p+'/')))return 'kpis';
  if(['/dashboard/productivity','/dashboard/wp-qa','/dashboard/iv-care','/dashboard/audit-chart'].some(p=>path===p||path.startsWith(p+'/')))return 'monthly';
  return 'all';
}

export default function UniversalDashboardSidebar({departmentId,departments=[],selectedSection,onClose}:{departmentId?:string|number|null;departments?:Department[];selectedSection?:string|null;onClose?:()=>void}) {
  const path = usePathname() || '';
  const context=sectionFor(path);
  const [collapsed,setCollapsed]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [openGroup,setOpenGroup]=useState<string|null>(null);
  const [openUnitGroup,setOpenUnitGroup]=useState<string|null>(null);
  const units=useMemo(()=>{
    const map = new Map<string,Item[]>();
    departments.forEach(d=>{
      if(d.id==null)return;
      const title=d.Department||d.department_name||d.name;
      if(!title)return;
      const group=d.group||d.group_name||'กลุ่มงานทั่วไป';
      map.set(group,[...(map.get(group)||[]),{label:title,href:`/dashboard/departments/${encodeURIComponent(String(d.id))}`}]);
    });
    return [...map.entries()].map(([label,items])=>({label,items}));
  },[departments]);
  const groups:Group[]=useMemo(()=>[
    {label:'Nursing Dashboard',items:dash},
    {label:'บริหารยุทธศาสตร์ NSO',items:nso},
    {label:'หน่วยงานภายใน',items:units.flatMap(u=>u.items)},
    {label:'16 กลุ่มงาน',items:nursingBranches},
    {label:'คณะกรรมการ',items:committees},
    {label:'อัตรากำลัง',items:workforce},
    {label:'ตัวชี้วัดตามแผน',items:kpis},
    {label:'ตัวชี้วัดรายเดือน',items:monthly},
  ],[units]);
  const groupIndex:Record<string,number>={dash:0,nso:1,units:2,branches:3,committee:4,staff:5,kpis:6,monthly:7};
  const sectionGroups = useMemo(() => {
    if (selectedSection === 'dashboard') return groups.slice(0,1);
    if (selectedSection === 'nso') return groups.slice(1,2);
    if (selectedSection === 'work') return groups.slice(2,6);
    if (selectedSection === 'report') return groups.slice(6,8);
    return groups;
  }, [selectedSection, groups]);
  useEffect(() => {
    const preferred = groups[groupIndex[context]]?.label;
    const first = sectionGroups[0]?.label;
    // เมื่อเลือกเมนู "ระบบงาน" จากด้านบน ให้เริ่มด้วยกลุ่มเมนูที่พับอยู่
    // โดยยังแสดงปุ่ม "หน่วยงานของฉัน" แยกไว้ด้านบนเสมอ
    if (selectedSection === 'work') {
      setOpenGroup(null);
    } else {
      setOpenGroup(sectionGroups.some(g=>g.label===preferred)?preferred||first||null:first||null);
    }
    setOpenUnitGroup(null);
    setMobileOpen(true);
  }, [context, selectedSection, sectionGroups]);
  const activeClass=(href:string)=> matching(path,href) ? 'bg-amber-400 text-emerald-950 font-semibold' : 'text-emerald-50 hover:bg-emerald-800';
  const content=(
    <div className="overflow-y-auto lg:max-h-[calc(100vh-9rem)]">
      <div className="flex items-center justify-between border-b border-emerald-800 px-3 py-3">
        {!collapsed&&<span className="font-bold text-amber-200">{selectedSection==='dashboard'?'Nursing Dashboard':selectedSection==='nso'?'บริหารยุทธศาสตร์ NSO':selectedSection==='report'?'รายงาน':'ระบบงาน'}</span>}
        <button type="button" className="hidden rounded px-2 py-1 text-amber-100 hover:bg-emerald-800 lg:block" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'ขยาย Sidebar':'ยุบ Sidebar'}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform duration-200 ${collapsed?'rotate-180':''}`}><path d="m15 18-6-6 6-6" /></svg></button>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-amber-100 hover:bg-emerald-800" aria-label="ปิด Sidebar"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </div>
      <nav aria-label="เมนูระบบ Dashboard" className="space-y-1 p-2">
        {departmentId!=null&&String(departmentId).trim()!==''&&(
          <Link
            title="หน่วยงานของฉัน"
            href={`/dashboard/departments/${encodeURIComponent(String(departmentId))}`}
            onClick={()=>setMobileOpen(false)}
            aria-label="ไปยังหน่วยงานของฉัน"
            className="group mb-3 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-800/40 px-3 py-2.5 text-sm font-semibold text-emerald-50 shadow-sm transition-colors duration-200 hover:border-emerald-300/70 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700/70 text-emerald-100 ring-1 ring-emerald-400/30 transition-colors group-hover:bg-emerald-600">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M15 9h.01M9 12h.01M15 12h.01" />
              </svg>
            </span>
            {!collapsed&&<>
              <span className="min-w-0 flex-1">หน่วยงานของฉัน</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-emerald-300 transition-transform group-hover:translate-x-0.5"><path d="m9 18 6-6-6-6" /></svg>
            </>}
          </Link>
        )}
        {sectionGroups.map((g,i)=><div key={g.label}>
          <button type="button" title={g.label} onClick={()=>{if(collapsed)setCollapsed(false);setOpenGroup(openGroup===g.label?null:g.label)}} aria-expanded={openGroup===g.label} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-emerald-50 hover:bg-emerald-800">
            <span>{collapsed?String(i+1):g.label}</span>{!collapsed&&<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openGroup===g.label?'rotate-180':''}`}><path d="m6 9 6 6 6-6" /></svg>}
          </button>
          {!collapsed&&openGroup===g.label&&<div className="ml-2 space-y-1 border-l border-emerald-700 pl-2">
            {g.label === 'หน่วยงานภายใน' ? (
              units.length === 0 ? (
                <p className="p-2 text-xs text-emerald-100">ยังไม่มีข้อมูลหน่วยงาน</p>
              ) : units.map(unitGroup => {
                const expanded = openUnitGroup === unitGroup.label;
                return (
                  <div key={unitGroup.label} className="py-0.5">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpenUnitGroup(expanded ? null : unitGroup.label)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <span className="min-w-0 break-words">{unitGroup.label}</span>
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {expanded && (
                      <div className="ml-3 space-y-1 border-l border-emerald-600/70 pl-2">
                        {unitGroup.items.map(item => (
                          <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            onClick={() => setMobileOpen(false)}
                            aria-current={matching(path,item.href) ? 'page' : undefined}
                            className={`block break-words rounded-lg px-3 py-2 text-sm ${activeClass(item.href)}`}
                          >{item.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <>
                {g.items.length === 0 && <p className="p-2 text-xs text-emerald-100">ยังไม่มีข้อมูล</p>}
                {g.items.map(item => (
                  <Link key={item.href} href={item.href} title={item.label} onClick={() => setMobileOpen(false)} aria-current={matching(path,item.href)?'page':undefined} className={`block rounded-lg px-3 py-2 text-sm ${activeClass(item.href)}`}>{item.label}</Link>
                ))}
              </>
            )}
          </div>}
        </div>)}
      </nav>
    </div>
  );
  return <>
    <div className="lg:hidden">
      <button type="button" onClick={()=>setMobileOpen(v=>!v)} aria-expanded={mobileOpen} className="w-full rounded-xl bg-emerald-950 px-4 py-3 text-left text-sm font-semibold text-white">☰ เมนูด้านซ้าย <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-2 h-4 w-4 transition-transform duration-200 ${mobileOpen?'rotate-180':''}`}><path d="m6 9 6 6 6-6" /></svg></button>
      {mobileOpen&&<aside className="mt-2 max-h-[70vh] overflow-y-auto rounded-xl bg-emerald-950 text-white">{content}</aside>}
    </div>
    <aside className={`hidden shrink-0 self-start rounded-xl bg-emerald-950 text-white shadow-sm lg:block ${collapsed?'w-16':'w-64'}`}>{content}</aside>
  </>;
}
