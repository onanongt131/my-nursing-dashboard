// components/DashboardHeader.tsx
'use client';
import LogoutButton from "@/components/LogoutButton";
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export const DashboardHeader = ({ title, activeTab, onTabChange, stats }: any) => {
  const pathname = usePathname();
  // State สำหรับเปิด-ปิดเมนูบนมือถือ
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { name: 'dashboard', label: 'หน้าหลัก', path: '/dashboard' },
    { name: 'category', label: 'KPI รายหมวด', path: '/dashboard/category' },
    { name: 'strategy', label: 'KPI แผนยุทธศาสตร์', path: '/dashboard/strategy' },
    { name: 'productivity', label: 'Productivity', path: '/dashboard/productivity' },
    { name: 'wp-qa', label: 'WP/QA', path: '/dashboard/wp-qa' },
    { name: 'audit-chart', label: 'Audit chart', path: '/dashboard/audit-chart' },
    { name: 'iv-care', label: 'IV care', path: '/dashboard/iv-care' },
    { name: 'unit', label: 'หน่วยงาน', path: '/dashboard/departments' }
  ];

  return (
    <div className="bg-white shadow-sm w-full">
      {/* ส่วน Header หลัก */}
      <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 py-4 bg-white gap-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left w-full md:w-auto">
          <img 
            src="/Logo-NSO.png" 
            alt="Logo" 
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 leading-snug">
              {title || "กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต"}
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          {/* ปุ่มแฮมเบอร์เกอร์สำหรับกดเปิด-ปิดเมนูบนมือถือ */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg border border-purple-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
            <span>เมนูนำทาง</span>
          </button>

          <LogoutButton />
        </div>
      </header>

      {/* แถบ Tabs: แสดงเป็นแนวตั้งเมื่อกดปุ่มบนมือถือ และแสดงเป็นแนวนอนปกติบนจอคอม/ไอแพด */}
      <div className={`w-full bg-white border-b border-gray-200 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <nav className="flex flex-col md:flex-row gap-1 md:gap-8 px-4 sm:px-6 py-3 md:py-0" role="tablist">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || activeTab === tab.name;

            return (
              <button
                key={tab.name}
                onClick={() => {
                  onTabChange && onTabChange(tab.name);
                  setIsMobileMenuOpen(false); // กดเลือกเมนูแล้วปิดอัตโนมัติบนมือถือ
                }}
                aria-selected={isActive}
                role="tab"
                className={`py-2.5 md:py-3 px-3 md:px-1 font-medium text-sm md:text-base transition-all text-left md:text-center rounded-lg md:rounded-none md:border-b-2 ${
                  isActive 
                    ? 'bg-purple-50 md:bg-transparent text-purple-700 md:border-purple-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 md:hover:bg-transparent md:hover:text-gray-900 md:border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};