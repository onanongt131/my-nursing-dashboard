// components/DashboardHeader.tsx
'use client';
import LogoutButton from "@/components/LogoutButton";
import { usePathname } from 'next/navigation';

export const DashboardHeader = ({ title, activeTab, onTabChange, stats }: any) => {
  const pathname = usePathname();

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
      {/* ส่วน Header หลัก: จัดเรียงแบบ responsive (มือถือเป็นแนวตั้งซ้อนกัน / จอใหญ่เป็นแนวนอน) */}
      <header className="flex flex-col md:flex-row items-center md:items-center justify-between px-4 sm:px-6 py-4 bg-white gap-4 border-b border-gray-100">
        
        {/* ส่วนโลโก้และชื่อองค์กร */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 text-center sm:text-left w-full md:w-auto">
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

        {/* ปุ่มออกจากระบบ (ให้ชิดขวาบนจอใหญ่ และอยู่ด้านล่าง/เต็มจอสวยๆ บนมือถือ) */}
        <div className="flex-shrink-0 w-full sm:w-auto flex justify-end">
          <LogoutButton />
        </div>
      </header>

      {/* แถบ Tabs: เปิดใช้งาน overflow-x-auto ให้ปัดเลื่อนซ้าย-ขวาได้อย่างลื่นไหลบนมือถือ */}
      <div className="w-full overflow-x-auto scrollbar-none border-b border-gray-200 bg-white">
        <nav className="flex gap-6 sm:gap-8 px-4 sm:px-6 min-w-max" role="tablist">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || activeTab === tab.name;

            return (
              <button
                key={tab.name}
                onClick={() => onTabChange && onTabChange(tab.name)}
                aria-selected={isActive}
                role="tab"
                className={`py-3 px-1 font-medium text-sm sm:text-base transition-all border-b-2 duration-300 whitespace-nowrap ${
                  isActive 
                    ? 'border-purple-600 text-purple-700' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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