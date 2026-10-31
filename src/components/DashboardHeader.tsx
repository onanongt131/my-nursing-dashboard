 'use client';

import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type Department = { id?: string | number; Department?: string; department_name?: string; name?: string; group?: string; group_name?: string };
type Props = { title?: string; activeTab?: string; onTabChange?: (tab: string) => void; departments?: Department[]; userName?: string; userRole?: string; userGroup?: string; selectedSidebar?: string | null; onSidebarSelect?: (section: string | null) => void };
type NavItem = { label: string; href?: string; tab?: string; desc?: string };
type NavSection = { title: string; items: NavItem[] };

export const DashboardHeader = ({ title, activeTab, onTabChange, departments = [], userName, userRole, userGroup, selectedSidebar, onSidebarSelect }: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayUserName = userName || 'ผู้ใช้งานระบบ';

  const [nursingBranches, setNursingBranches] = useState<any[]>([
    { name: 'การพยาบาลวิจัยและพัฒนาการบริการ', path: '/dashboard/nursing/branch-1' },
    { name: 'การพยาบาลผู้ป่วยหนัก', path: '/dashboard/nursing/branch-2' },
    { name: 'การพยาบาลผู้ป่วยอุบัติเหตุและฉุกเฉิน', path: '/dashboard/nursing/branch-3' },
    { name: 'การพยาบาลผู้ป่วยผ่าตัด', path: '/dashboard/nursing/branch-4' },
    { name: 'การพยาบาลผู้ป่วยอายุรกรรม', path: '/dashboard/nursing/branch-5' },
    { name: 'การพยาบาลด้านการควบคุมและป้องกันการติดเชื้อ', path: '/dashboard/nursing/branch-6' },
    { name: 'การพยาบาลผู้ป่วยกุมารเวชกรรม', path: '/dashboard/nursing/branch-7' },
    { name: 'การพยาบาลผู้ป่วยโสต ศอ นาสิก จักษุ', path: '/dashboard/nursing/branch-8' },
    { name: 'การพยาบาลตรวจรักษาพิเศษ', path: '/dashboard/nursing/branch-9' },
    { name: 'การพยาบาลผู้ป่วยศัลยกรรม', path: '/dashboard/nursing/branch-10' },
    { name: 'การพยาบาลผู้ป่วยสูติ–นรีเวช', path: '/dashboard/nursing/branch-11' },
    { name: 'การพยาบาลผู้ป่วยจิตเวช', path: '/dashboard/nursing/branch-12' },
    { name: 'การพยาบาลผู้ป่วยนอก', path: '/dashboard/nursing/branch-13' },
    { name: 'การพยาบาลวิสัญญี', path: '/dashboard/nursing/branch-14' },
    { name: 'การพยาบาลผู้คลอด', path: '/dashboard/nursing/branch-15' },
    { name: 'การพยาบาลผู้ป่วยออร์โธปิดิกส์', path: '/dashboard/nursing/branch-16' },
  ]);

  const nursingDashboardSubMenus = [
    { name: 'executive', label: '1. Executive Dashboard', desc: 'ภาพรวมองค์กร', path: '/dashboard/nursing-dashboard/executive' },
    { name: 'strategic', label: '2. Strategic Dashboard', desc: 'เป้าหมาย 5 ยุทธศาสตร์', path: '/dashboard/nursing-dashboard/strategic' },
    { name: 'quality-safety', label: '3. Quality & Safety Dashboard', desc: 'จุดเสี่ยงทางการพยาบาล', path: '/dashboard/nursing-dashboard/quality-safety' },
    { name: 'workforce', label: '4. Workforce Dashboard', desc: 'Productivity/PCS/Skill Mix', path: '/dashboard/nursing-dashboard/workforce' },
    { name: 'people-excellence', label: '5. People Excellence Dashboard', desc: 'Competency, IDP, Engagement, Supervision', path: '/dashboard/nursing-dashboard/people-excellence' },
    { name: 'action-risk', label: '6. Action & Risk Dashboard', desc: 'เรื่องใดต้องแก้ ใครรับผิดชอบ และครบกำหนดเมื่อใด', path: '/dashboard/nursing-dashboard/action-risk' },
  ];

  const committeeList = [
    { name: 'คณะกรรมการบริหาร', path: '/dashboard/committee/executive' },
    { name: 'คณะกรรมการพัฒนาคุณภาพบริการพยาบาล (QA)', path: '/dashboard/committee/qa' },
    { name: 'คณะกรรมการบริหารความเสี่ยงและจริยธรรมทางการพยาบาล (RM)', path: '/dashboard/committee/rm' },
    { name: 'คณะกรรมการพัฒนางานวิชาการ (HRN)', path: '/dashboard/committee/academic' },
    { name: 'คณะกรรมการบริหารอัตรากำลัง', path: '/dashboard/committee/personnel' },
    { name: 'คณะกรรมการวิจัยและนวัตกรรมทางการพยาบาล', path: '/dashboard/committee/r2r' },
    { name: 'คณะกรรมการบ้านพัก', path: '/dashboard/committee/home' },
  ];

  const staffingSubMenus = [
    { name: 'staffing-overview', label: 'บุคลากรและสมรรถนะ', path: '/dashboard/staffing' },
    { name: 'command-center', label: 'Ward Command Center', path: '/dashboard/staffing/command-center' },
    { name: 'shift-schedule', label: 'ตารางเวร', path: '/dashboard/staffing/schedule' },
    { name: 'staffing-dashboard', label: 'ภาพรวมอัตรากำลัง', path: '/dashboard/staffing/overview' },
    { name: 'inspection-report', label: 'รายงานเวรตรวจการ', path: '/dashboard/staffing/inspection-report' },
  ];

  const kpiSubMenus = [
    { name: 'category', label: 'KPI ตามหมวด', path: '/dashboard/category' },
    { name: 'strategy', label: 'KPI ตามแผน', path: '/dashboard/strategy' },
    { name: 'rm', label: 'KPI RM', path: '/dashboard/rm' },
  ];

  const monthlySubMenus = [
    { name: 'productivity', label: 'Productivity', path: '/dashboard/productivity' },
    { name: 'wp-qa', label: 'WP/QA', path: '/dashboard/wp-qa' },
    { name: 'iv-care', label: 'IV care', path: '/dashboard/iv-care' },
    { name: 'audit-chart', label: 'Audit chart', path: '/dashboard/audit-chart' },
  ];


  useEffect(() => {
    let cancelled = false;
    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase.from('nursing_departments')
          .select('id, department_name, path').order('id', { ascending: true });
        if (!cancelled && !error && data?.length) {
          setNursingBranches(data.map((d: any) => ({name: d.department_name, path: d.path || `/dashboard/nursing/branch-${d.id}`})));
        }
      } catch (err) { console.error('โหลดข้อมูลกลุ่มงานไม่สำเร็จ', err); }
    };
    fetchBranches();
    return () => { cancelled = true; };
  }, [supabase]);

  const nursingGroups = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    for (const d of Array.isArray(departments) ? departments : []) {
      const name = d.Department || d.department_name || d.name;
      if (!d.id || !name) continue;
      const group = d.group || d.group_name || 'กลุ่มงานทั่วไป';
      (groups[group] ||= []).push({ label: name, href: `/dashboard/departments/${encodeURIComponent(String(d.id))}` });
    }
    return groups;
  }, [departments]);

  // Dashboard ส่วนแสดงผล; NSO ส่วนจัดทำแผน; ระบบงานใช้เส้นทางเดิม
  const dashboardItems: NavItem[] = nursingDashboardSubMenus.map(m => ({label: m.label, href: m.path, desc: m.desc}));
  const nsoItems: NavItem[] = [
    {label:'ภาพรวมบริหารยุทธศาสตร์', href:'/dashboard/nso-strategy'},
    {label:'วิเคราะห์ SWOT / TOWS', href:'/dashboard/nso-strategy/swot'},
    {label:'แผนยุทธศาสตร์ 5 ด้าน', href:'/dashboard/nso-strategy/plan'},
    {label:'Strategy Map', href:'/dashboard/nso-strategy/strategy-map'},
    {label:'KPI Dictionary', href:'/dashboard/nso-strategy/kpi'},
    {label:'Action Plan', href:'/dashboard/nso-strategy/action-plan'},
    {label:'บันทึกและรับรองผล KPI', href:'/dashboard/nso-strategy/monitoring'},
  ];
  const sections: NavSection[] = [
    {title:'หน่วยงานภายใน', items: Object.entries(nursingGroups).flatMap(([g, items]) => [{label:`กลุ่ม: ${g}`}, ...items])},
    {title:'16 กลุ่มงาน', items: nursingBranches.map(b => ({label:b.name, href:b.path}))},
    {title:'คณะกรรมการ', items: committeeList.map(c => ({label:c.name, href:c.path}))},
    {title:'อัตรากำลัง', items: staffingSubMenus.map(s => ({label:s.label, href:s.path}))},
    {title:'ตัวชี้วัดตามแผน', items: kpiSubMenus.map(s => ({label:s.label, tab:s.name}))},
    {title:'ตัวชี้วัดรายเดือน', items: monthlySubMenus.map(s => ({label:s.label, tab:s.name}))},
  ];
  const close = () => { setOpenMenu(null); setOpenSection(null); setMobileOpen(false); };
  const go = (item: NavItem) => {
    if (item.tab) {
      if (onTabChange) { onTabChange(item.tab); }
      else { router.push(item.tab === 'category' ? '/dashboard/category' : item.tab === 'strategy' ? '/dashboard/strategy' : item.tab === 'rm' ? '/dashboard/rm' : `/dashboard/${item.tab}`); }
    } else if (item.href) router.push(item.href);
    close();
  };
  useEffect(() => {
    const onOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) {setOpenMenu(null);setOpenSection(null);} };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenMenu(null); setOpenSection(null); } };
    document.addEventListener('pointerdown', onOutside); document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onEscape); };
  }, []);
  useEffect(() => { setOpenMenu(null); setOpenSection(null); }, [pathname]);
  const mainMenus = [
    {id:'dashboard', label:'Nursing Dashboard', items:dashboardItems},
    {id:'nso', label:'บริหารยุทธศาสตร์ NSO', items:nsoItems},
    {id:'work', label:'ระบบงาน', items:[] as NavItem[]},
    {id:'report', label:'รายงาน', items:[
      {label:'Executive Dashboard', href:'/dashboard/nursing-dashboard/executive'},
      {label:'Strategic Dashboard', href:'/dashboard/nursing-dashboard/strategic'},
      {label:'KPI ตามหมวด',tab:'category'}, {label:'KPI ตามแผน',tab:'strategy'}, {label:'KPI RM',tab:'rm'}
    ]},
  ];
  // Clicking a top-level section opens its Sidebar and navigates to its landing page.
  // Use real existing routes in the recovered project; do not navigate to /dashboard
  // and leave the previous page's children rendered.
  const sectionLandingRoutes: Record<string, string> = {
    dashboard: '/dashboard/nursing-dashboard/executive',
    nso: '/dashboard/nso-strategy',
    work: '/dashboard/departments',
    report: '/dashboard/category',
  };
  const selectTopSection = (section: string) => {
    onSidebarSelect?.(section);
    close();
    const destination = sectionLandingRoutes[section];
    if (destination && pathname !== destination) router.push(destination);
  };
  const active = (id:string) => id==='dashboard' ? pathname.startsWith('/dashboard/nursing-dashboard') : id==='nso' ? pathname.startsWith('/dashboard/nso-strategy') : id==='work' ? ['/dashboard/departments','/dashboard/nursing/','/dashboard/committee','/dashboard/staffing'].some(p=>pathname.startsWith(p)) : false;
  const cls = 'inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors min-w-0';
  return <div ref={containerRef} className="relative z-40 w-full rounded-xl border border-emerald-100 bg-white shadow-sm">
    <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 sm:px-6">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={close}>
        <img src="/Logo VCR.png" alt="Vachira Phuket Hospital" className="h-10 w-auto object-contain" />
        <img src="/Logo-NSO.png" alt="NSO" className="h-11 w-11 object-contain" />
        <div className="min-w-0"><h1 className="truncate text-base font-bold text-emerald-950 sm:text-xl">{title || 'กลุ่มภารกิจด้านการพยาบาล'}</h1><p className="text-xs text-gray-500">โรงพยาบาลวชิระภูเก็ต</p></div>
      </Link>
      <div className="hidden items-center gap-3 md:flex">
        {userRole?.toLowerCase()==='admin' && <Link href="/dashboard/admin/approve-members" className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-900">อนุมัติสมาชิก</Link>}
        <span className="text-sm font-semibold text-emerald-900">{displayUserName}<span className="ml-2 text-xs font-normal text-emerald-600">{userRole} {userGroup ? `(${userGroup})` : ''}</span></span>
        <LogoutButton />
      </div>
      <button type="button" className="rounded-lg border border-emerald-300 p-2 text-emerald-950 md:hidden" onClick={()=>setMobileOpen(v=>!v)} aria-expanded={mobileOpen} aria-label="เมนูหลัก">☰</button>
    </header>
    <div className="bg-emerald-950 px-3 sm:px-5">
      <nav aria-label="เมนูหลัก" className={`${mobileOpen?'flex':'hidden'} flex-col gap-1 py-2 md:flex md:flex-row md:flex-nowrap md:items-center md:justify-between`}>
        <Link href="/dashboard" onClick={()=>{onSidebarSelect?.(null);close();}} className={`${cls} ${pathname==='/dashboard'?'bg-emerald-800 text-amber-300 ring-1 ring-amber-400':'text-amber-100 hover:bg-emerald-800'}`}>หน้าหลัก</Link>
        {mainMenus.map(m => <div key={m.id} className="relative min-w-0">
          <button type="button" onClick={()=>selectTopSection(m.id)} aria-expanded={selectedSidebar===m.id} className={`${cls} w-full ${active(m.id)||selectedSidebar===m.id?'bg-emerald-800 text-amber-300 ring-1 ring-amber-400':'text-amber-100 hover:bg-emerald-800'}`}>{m.label}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${selectedSidebar===m.id ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg></button>

        </div>)}
        <div className="flex flex-col gap-2 border-t border-emerald-800 px-3 py-3 text-amber-100 md:hidden"><span>{displayUserName}</span><LogoutButton /></div>
      </nav>
    </div>
  </div>;
};
