'use client';

import LogoutButton from "@/components/LogoutButton";
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export const DashboardHeader = ({ title, activeTab, onTabChange, departments = [], userName, userRole, userGroup }: any) => {
  const supabase = createClient();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const displayUserName = userName || "ผู้ใช้งานระบบ";
  
  // States สำหรับ Dropdown ต่างๆ
  const [isNursingDropdownOpen, setIsNursingDropdownOpen] = useState(false);
  const nursingDropdownRef = useRef<HTMLDivElement>(null);

  const [isCommitteeDropdownOpen, setIsCommitteeDropdownOpen] = useState(false);
  const committeeDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isStaffingDropdownOpen, setIsStaffingDropdownOpen] = useState(false);
  const staffingDropdownRef = useRef<HTMLDivElement>(null);
  
  // State สำหรับ Nursing Dashboard แบบดรอปดาวน์ 6 แดชบอร์ด
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(false);
  const dashboardDropdownRef = useRef<HTMLDivElement>(null);

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

  // 6 แดชบอร์ดดีย่อยตามโครงสร้างใหม่
  const nursingDashboardSubMenus = [
    { name: 'executive', label: '1. Executive Dashboard', desc: 'ภาพรวมองค์กร', path: '/dashboard/nursing-dashboard/executive' },
    { name: 'strategic', label: '2. Strategic Dashboard', desc: 'เป้าหมาย 5 ยุทธศาสตร์', path: '/dashboard/nursing-dashboard/strategic' },
    { name: 'quality-safety', label: '3. Quality & Safety Dashboard', desc: 'จุดเสี่ยงทางการพยาบาล', path: '/dashboard/nursing-dashboard/quality-safety' },
    { name: 'workforce', label: '4. Workforce Dashboard', desc: 'Productivity/PCS/Skill Mix', path: '/dashboard/nursing-dashboard/workforce' },
    { name: 'people-excellence', label: '5. People Excellence Dashboard', desc: 'Competency, IDP, Engagement, Supervision', path: '/dashboard/nursing-dashboard/people-excellence' },
    { name: 'action-risk', label: '6. Action & Risk Dashboard', desc: 'เรื่องใดต้องแก้ ใครรับผิดชอบ และครบกำหนดเมื่อใด', path: '/dashboard/nursing-dashboard/action-risk' },
  ];

  // รายชื่อคณะกรรมการ
  const committeeList = [
    { name: 'คณะกรรมการบริหาร', path: '/dashboard/committee/executive' },
    { name: 'คณะกรรมการพัฒนาคุณภาพบริการพยาบาล (QA)', path: '/dashboard/committee/qa' },
    { name: 'คณะกรรมการบริหารความเสี่ยงและจริยธรรมทางการพยาบาล (RM)', path: '/dashboard/committee/rm' },
    { name: 'คณะกรรมการพัฒนางานวิชาการ (HRN)', path: '/dashboard/committee/academic' },
    { name: 'คณะกรรมการบริหารอัตรากำลัง', path: '/dashboard/committee/personnel' },
    { name: 'คณะกรรมการวิจัยและนวัตกรรมทางการพยาบาล', path: '/dashboard/committee/r2r' },
    { name: 'คณะกรรมการบ้านพัก', path: '/dashboard/committee/home' },
  ];

  // รายการเมนูย่อยของ "อัตรากำลัง"
  const staffingSubMenus = [
    { name: 'staffing-overview', label: 'บุคลากรและสมรรถนะ', path: '/dashboard/staffing' },
    { name: 'command-center', label: 'Ward Command Center', path: '/dashboard/staffing/command-center' },
    { name: 'shift-schedule', label: 'ตารางเวร', path: '/dashboard/staffing/schedule' },
    { name: 'staffing-dashboard', label: 'ภาพรวมอัตรากำลัง', path: '/dashboard/staffing/overview' },
    { name: 'inspection-report', label: 'รายงานเวรตรวจการ', path: '/dashboard/staffing/inspection-report' },
  ];

  useEffect(() => {
    const fetchNursingBranches = async () => {
      try {
        const { data, error } = await supabase
          .from('nursing_departments')
          .select('department_name, path')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          const formattedBranches = data.map((item: any) => ({
            name: item.department_name,
            path: item.path || `/dashboard/nursing/branch-${item.id}`
          }));
          setNursingBranches(formattedBranches);
        }
      } catch (err) {
        console.error('Failed to fetch nursing branches:', err);
      }
    };

    fetchNursingBranches();
  }, [supabase]);

  const [isKpiDropdownOpen, setIsKpiDropdownOpen] = useState(false);
  const kpiDropdownRef = useRef<HTMLDivElement>(null);

  const [isMonthlyDropdownOpen, setIsMonthlyDropdownOpen] = useState(false);
  const monthlyDropdownRef = useRef<HTMLDivElement>(null);

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const unitDropdownRef = useRef<HTMLDivElement>(null);
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const nursingGroups = Array.isArray(departments) ? departments.reduce((acc: any[], curr: any) => {
    const groupName = curr.group || curr.group_name || 'กลุ่มงานทั่วไป';
    const deptName = curr.Department || curr.department_name || curr.name;
    
    if (!deptName || !curr.id) return acc;

    let foundGroup = acc.find((g: any) => g.groupName === groupName);
    if (!foundGroup) {
      foundGroup = { groupName, departments: [] };
      acc.push(foundGroup);
    }
    
    foundGroup.departments.push({
      name: deptName,
      path: `/dashboard/departments/${curr.id}`
    });
    return acc;
  }, []) : [];

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
    const handleClickOutside = (event: MouseEvent) => {
      if (nursingDropdownRef.current && !nursingDropdownRef.current.contains(event.target as Node)) setIsNursingDropdownOpen(false);
      if (committeeDropdownRef.current && !committeeDropdownRef.current.contains(event.target as Node)) setIsCommitteeDropdownOpen(false);
      if (staffingDropdownRef.current && !staffingDropdownRef.current.contains(event.target as Node)) setIsStaffingDropdownOpen(false);
      if (kpiDropdownRef.current && !kpiDropdownRef.current.contains(event.target as Node)) setIsKpiDropdownOpen(false);
      if (monthlyDropdownRef.current && !monthlyDropdownRef.current.contains(event.target as Node)) setIsMonthlyDropdownOpen(false);
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) { setIsUnitDropdownOpen(false); }
      if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(event.target as Node)) setIsDashboardDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHomeActive = pathname === '/dashboard' || activeTab === 'home' || activeTab === 'overview';
  const isDashboardActive = pathname.startsWith('/dashboard/nursing-dashboard') || activeTab === 'nursing-dashboard';
  const isCommitteeActive = pathname.startsWith('/dashboard/committee') || activeTab === 'committee';
  const isNursingActive = (pathname.startsWith('/dashboard/nursing') && !pathname.startsWith('/dashboard/nursing-dashboard')) || activeTab === 'nursing';
  const isStaffingActive = pathname.startsWith('/dashboard/staffing') || activeTab === 'staffing' || activeTab === 'staffing-overview';
  const isUnitActive = pathname.startsWith('/dashboard/departments') || activeTab === 'unit';
  const isKpiActive = pathname.startsWith('/dashboard/category') || pathname.startsWith('/dashboard/strategy') || activeTab === 'category' || activeTab === 'strategy';
  const isMonthlyActive = (pathname.startsWith('/dashboard/productivity') || pathname.startsWith('/dashboard/wp-qa') || pathname.startsWith('/dashboard/iv-care') || pathname.startsWith('/dashboard/audit-chart') || ['productivity', 'wp-qa', 'iv-care', 'audit-chart', 'Audit chart'].includes(activeTab)) && !isUnitActive;
  
  const buttonBaseClass = "w-full md:w-auto flex-1 h-11 flex items-center justify-center gap-1 px-3 font-semibold text-xs md:text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap";
  const activeStyle = "bg-emerald-800 text-amber-300 border border-amber-400";
  const inactiveStyle = "bg-emerald-900 text-amber-100 hover:text-amber-300 hover:bg-emerald-800";

  return (
    <div className="bg-white shadow-sm w-full rounded-2xl overflow-visible border border-emerald-100">
      {/* Header ส่วนบน */}
      <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 py-4 bg-white gap-4 border-b border-gray-100">
  <div className="flex items-center justify-between w-full md:w-auto">
    <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left pl-2 sm:pl-4">
      
      {/* โลโก้โรงพยาบาล */}
      <img 
        src="/Logo VCR.png" 
        alt="Hospital Logo" 
        className="h-10 sm:h-12 w-auto object-contain flex-shrink-0" 
        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
      />

      {/* เส้นคั่นระหว่างโลโก้ */}
      <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>

      {/* โลโก้กลุ่มภารกิจฯ (Logo-NSO) */}
      <img 
        src="/Logo-NSO.png" 
        alt="Logo" 
        className="h-12 w-12 sm:h-14 sm:w-14 object-contain flex-shrink-0" 
        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
      />
      
      {/* ส่วนหัวข้อ: บรรทัดบนชื่อกลุ่มภารกิจฯ / บรรทัดล่างโรงพยาบาลวชิระภูเก็ต */}
      <div className="flex flex-col justify-center">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-snug">
          {title || "กลุ่มภารกิจด้านการพยาบาล"}
        </h1>
        <span className="text-xs sm:text-sm text-gray-500 font-medium tracking-wide">
          โรงพยาบาลวชิระภูเก็ต
        </span>
      </div>

    </div>
    
    <button 
      type="button" 
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
      className="md:hidden p-2 rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 focus:outline-none flex-shrink-0 ml-2"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isMobileMenuOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  </div>

  {/* ส่วนแสดงชื่อ Login และ Badge สิทธิ์ (Desktop View) */}
  <div className="hidden md:flex items-center gap-3">
    
    {/* ปุ่มอนุมัติสมาชิก */}
    {userRole && userRole.toLowerCase() === 'admin' && (
      <a 
        href="/dashboard/admin/approve-members" 
        className="h-11 flex items-center gap-2 px-4 rounded-2xl border border-emerald-300/60 bg-white text-emerald-900 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-2xs"
      >
        <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        อนุมัติสมาชิก
      </a>
    )}

    {/* กล่องชื่อผู้ใช้งาน */}
    <div className="h-11 flex items-center gap-3 px-4 rounded-2xl border border-emerald-300/60 bg-white shadow-2xs">
      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
        <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      
      <div className="flex flex-col justify-center">
        <span className="text-sm font-bold text-emerald-900 tracking-tight leading-tight">
          {displayUserName}
        </span>
        {userRole && (
          <span className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider mt-0.5">
            {userRole} {userGroup ? `(${userGroup})` : ''}
          </span>
        )}
      </div>
    </div>
    
    {/* ปุ่มออกจากระบบ */}
    <div className="h-11 flex items-center px-2 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-colors">
      <LogoutButton />
    </div>
  </div>
</header>

      {/* Navigation เมนูด้านล่าง */}
      <div className={`w-full bg-emerald-900 shadow-md transition-all duration-300 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <nav className="flex flex-col md:flex-row items-start md:items-center justify-start gap-3 px-4 sm:px-6 py-3">
          
          {/* 1. หน้าหลัก (Home / วิสัยทัศน์) */}
          <a 
            href="/dashboard"
            onClick={() => { if (onTabChange) onTabChange('home'); setIsMobileMenuOpen(false); }}
            className={`${buttonBaseClass} ${isHomeActive ? activeStyle : inactiveStyle}`}
          >
            <span>หน้าหลัก</span>
          </a>

          {/* 2. Nursing Dashboard (6 แดชบอร์ดดีย่อย) */}
          <div className="relative w-full md:w-auto" ref={dashboardDropdownRef}>
            <button 
              type="button" 
              onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)} 
              className={`${buttonBaseClass} ${isDashboardActive || isDashboardDropdownOpen ? activeStyle : inactiveStyle}`}
            >
              <span>Nursing Dashboard</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isDashboardDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isDashboardDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-80 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 max-h-[450px] overflow-y-auto">
                {nursingDashboardSubMenus.map((m: any, index: number) => (
                  <a 
                    key={`${m.name}-${index}`} 
                    href={m.path}
                    onClick={() => {
                      if (onTabChange) onTabChange(m.name);
                      setIsMobileMenuOpen(false);
                      setIsDashboardDropdownOpen(false);
                    }} 
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="font-bold text-emerald-900">{m.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 3. คณะกรรมการ */}
          <div className="relative w-full md:w-auto" ref={committeeDropdownRef}>
            <button 
              type="button" 
              onClick={() => setIsCommitteeDropdownOpen(!isCommitteeDropdownOpen)} 
              className={`${buttonBaseClass} ${isCommitteeActive || isCommitteeDropdownOpen ? activeStyle : inactiveStyle}`}
            >
              <span>คณะกรรมการ</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isCommitteeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isCommitteeDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-64 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 max-h-96 overflow-y-auto">
                {committeeList.map((item: any, i: number) => (
                  <a key={i} href={item.path} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 border-b last:border-b-0">
                    {item.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 4. การพยาบาล 16 กลุ่มงาน */}
          <div className="relative w-full md:w-auto" ref={nursingDropdownRef}>
            <button 
              type="button" 
              onClick={() => setIsNursingDropdownOpen(!isNursingDropdownOpen)} 
              className={`${buttonBaseClass} ${isNursingActive || isNursingDropdownOpen ? activeStyle : inactiveStyle}`}
            >
              <span>16 กลุ่มงาน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isNursingDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isNursingDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-72 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 max-h-96 overflow-y-auto">
                {nursingBranches.map((branch: any, i: number) => (
                  <a key={i} href={branch.path} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 border-b">
                    {branch.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 5. อัตรากำลัง */}
          <div className="relative w-full md:w-auto" ref={staffingDropdownRef}>
            <button 
              type="button" 
              onClick={() => setIsStaffingDropdownOpen(!isStaffingDropdownOpen)} 
              className={`${buttonBaseClass} ${isStaffingActive || isStaffingDropdownOpen ? activeStyle : inactiveStyle}`}
            >
              <span>อัตรากำลัง</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isStaffingDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isStaffingDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-60 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 flex flex-col">
                {staffingSubMenus.map((m: any, index: number) => (
                  <a 
                    key={`${m.name}-${index}`} 
                    href={m.path}
                    onClick={() => {
                      if (onTabChange) onTabChange(m.name);
                      setIsMobileMenuOpen(false);
                      setIsStaffingDropdownOpen(false);
                    }} 
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors border-b last:border-b-0"
                  >
                    {m.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 6. ตัวชี้วัดตามแผน */}
          <div className="relative w-full md:w-auto" ref={kpiDropdownRef}>
            <button type="button" onClick={() => setIsKpiDropdownOpen(!isKpiDropdownOpen)} className={`${buttonBaseClass} ${isKpiActive ? activeStyle : inactiveStyle}`}>
              <span>ตัวชี้วัดตามแผน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isKpiDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isKpiDropdownOpen && (
            <div className="absolute left-0 mt-2 w-full md:w-56 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 flex flex-col">
              {kpiSubMenus.map((m: any, index: number) => (
                <button 
                  key={`${m.name}-${index}`} 
                  onClick={() => { onTabChange(m.name); setIsMobileMenuOpen(false); }} 
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors"
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          </div>

          {/* 7. ตัวชี้วัดรายเดือน */}
          <div className="relative w-full md:w-auto" ref={monthlyDropdownRef}>
            <button type="button" onClick={() => setIsMonthlyDropdownOpen(!isMonthlyDropdownOpen)} className={`${buttonBaseClass} ${isMonthlyActive ? activeStyle : inactiveStyle}`}>
              <span>ตัวชี้วัดรายเดือน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isMonthlyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isMonthlyDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-56 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50">
                {monthlySubMenus.map((m: any) => <button key={m.name} onClick={() => { onTabChange(m.name); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 text-gray-700">{m.label}</button>)}
              </div>
            )}
          </div>

          {/* 8. หน่วยงาน */}
          <div className="relative w-full md:w-auto" ref={unitDropdownRef}>
            <button type="button" onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)} className={`${buttonBaseClass} ${isUnitActive || isUnitDropdownOpen ? activeStyle : inactiveStyle}`}>
              <span>หน่วยงานภายใน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isUnitDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-80 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 max-h-[450px] overflow-y-auto">
                {nursingGroups.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">ไม่พบข้อมูลหน่วยงาน</div>
                ) : (
                  nursingGroups.map((g: any, i: number) => {
                    const isOpen = !!openGroups[g.groupName];
                    return (
                      <div key={i} className="border-b last:border-b-0">
                        <button 
                          type="button" 
                          onClick={() => toggleGroup(g.groupName)} 
                          className="w-full text-left flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-emerald-50 transition-colors"
                        >
                          <span>{g.groupName}</span>
                          <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="bg-emerald-50/50 py-1 pl-4 pr-2 space-y-1">
                            {g.departments.map((d: any, j: number) => (
                              <a 
                                key={j} 
                                href={d.path} 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block px-4 py-2 text-sm text-gray-600 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-lg transition-colors"
                              >
                                • {d.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ส่วนแสดงชื่อ Login สำหรับ Mobile View */}
          <div className="w-full pt-3 mt-2 border-t border-emerald-800 md:hidden flex flex-col items-center gap-3">
            <span className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{displayUserName}</span>
            </span>
            <LogoutButton />
          </div>

        </nav>
      </div>
    </div>
  );
};