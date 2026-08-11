// components/DashboardHeader.tsx
'use client';

import LogoutButton from "@/components/LogoutButton";
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export const DashboardHeader = ({ title, activeTab, onTabChange, departments = [] }: any) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isNursingDropdownOpen, setIsNursingDropdownOpen] = useState(false);
  const nursingDropdownRef = useRef<HTMLDivElement>(null);

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

  const nursingBranches = [
    { name: 'การพยาบาลวิจัยและพัฒนาการบริการ', path: '/dashboard/nursing/branch' },
    { name: 'การพยาบาลผู้ป่วยหนัก', path: '/dashboard/nursing/branch' },
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
  ];

  const kpiSubMenus = [
    { name: 'category', label: 'KPI ตามหมวด', path: '/dashboard/category' },
    { name: 'strategy', label: 'KPI ตามแผน', path: '/dashboard/strategy' },
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
      if (kpiDropdownRef.current && !kpiDropdownRef.current.contains(event.target as Node)) setIsKpiDropdownOpen(false);
      if (monthlyDropdownRef.current && !monthlyDropdownRef.current.contains(event.target as Node)) setIsMonthlyDropdownOpen(false);
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) { setIsUnitDropdownOpen(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHomeActive = pathname === '/dashboard' || activeTab === 'dashboard';
  const isUnitActive = pathname.startsWith('/dashboard/departments') || activeTab === 'unit';
  const isKpiActive = pathname.startsWith('/dashboard/category') || pathname.startsWith('/dashboard/strategy') || activeTab === 'category' || activeTab === 'strategy';
  const isMonthlyActive = (pathname.startsWith('/dashboard/productivity') || pathname.startsWith('/dashboard/wp-qa') || pathname.startsWith('/dashboard/iv-care') || pathname.startsWith('/dashboard/audit-chart') || ['productivity', 'wp-qa', 'iv-care', 'audit-chart', 'Audit chart'].includes(activeTab)) && !isUnitActive;

  const buttonBaseClass = "w-full md:w-52 h-11 flex items-center justify-center gap-2 px-4 font-semibold text-sm md:text-base rounded-xl transition-all cursor-pointer whitespace-nowrap";
  const activeStyle = "bg-emerald-800 text-amber-300 border border-amber-400";
  const inactiveStyle = "bg-emerald-900 text-amber-100 hover:text-amber-300 hover:bg-emerald-800";

  return (
    <div className="bg-white shadow-sm w-full">
      <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 py-4 bg-white gap-4 border-b border-gray-100">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
            <img src="/Logo-NSO.png" alt="Logo" className="h-12 w-12 sm:h-14 sm:w-14 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 leading-snug">{title || "กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต"}</h1>
          </div>
          
          <button 
            type="button" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="md:hidden p-2 rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 focus:outline-none flex-shrink-0 ml-2"
            aria-label="Toggle Menu"
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

        <div className="hidden md:block">
          <LogoutButton />
        </div>
      </header>

      <div className={`w-full bg-emerald-900 shadow-md transition-all duration-300 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <nav className="flex flex-col md:flex-row items-start md:items-center justify-start gap-3 px-4 sm:px-6 py-3">
          
          <button type="button" onClick={() => { onTabChange && onTabChange('dashboard'); setIsMobileMenuOpen(false); }} className={`${buttonBaseClass} ${isHomeActive ? activeStyle : inactiveStyle}`}>หน้าหลัก</button>

          <div className="relative w-full md:w-auto" ref={nursingDropdownRef}>
            <button type="button" onClick={() => setIsNursingDropdownOpen(!isNursingDropdownOpen)} className={`${buttonBaseClass} ${isNursingDropdownOpen ? activeStyle : inactiveStyle}`}>
              <span>การพยาบาล 16 กลุ่มงาน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isNursingDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isNursingDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-72 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50 max-h-96 overflow-y-auto">
                {nursingBranches.map((branch: any, i: number) => <a key={i} href={branch.path} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 border-b">{branch.name}</a>)}
              </div>
            )}
          </div>

          <div className="relative w-full md:w-auto" ref={kpiDropdownRef}>
            <button type="button" onClick={() => setIsKpiDropdownOpen(!isKpiDropdownOpen)} className={`${buttonBaseClass} ${isKpiActive ? activeStyle : inactiveStyle}`}>
              <span>ตัวชี้วัดตามแผน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isKpiDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isKpiDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-56 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50">
                {kpiSubMenus.map((m: any) => <button key={m.name} onClick={() => { onTabChange(m.name); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50">{m.label}</button>)}
              </div>
            )}
          </div>

          <div className="relative w-full md:w-auto" ref={monthlyDropdownRef}>
            <button type="button" onClick={() => setIsMonthlyDropdownOpen(!isMonthlyDropdownOpen)} className={`${buttonBaseClass} ${isMonthlyActive ? activeStyle : inactiveStyle}`}>
              <span>ตัวชี้วัดรายเดือน</span>
              <svg className={`w-4 h-4 ml-1 transition-transform ${isMonthlyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isMonthlyDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full md:w-56 bg-white rounded-xl shadow-2xl border border-amber-200 py-2 z-50">
                {monthlySubMenus.map((m: any) => <button key={m.name} onClick={() => { onTabChange(m.name); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50">{m.label}</button>)}
              </div>
            )}
          </div>

          <div className="relative w-full md:w-auto" ref={unitDropdownRef}>
            <button type="button" onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)} className={`${buttonBaseClass} ${isUnitActive || isUnitDropdownOpen ? activeStyle : inactiveStyle}`}>
              <span>หน่วยงาน</span>
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

          <div className="w-full pt-2 border-t border-emerald-800 md:hidden flex justify-center">
            <LogoutButton />
          </div>

        </nav>
      </div>
    </div>
  );
};