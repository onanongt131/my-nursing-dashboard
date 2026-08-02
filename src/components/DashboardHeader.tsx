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
    <div className="bg-white shadow-sm">
      {/* ส่วน Header หลัก: ปรับให้ยืดหยุ่นบนมือถือ (จัดเรียงแนวตั้งหรือแนวนอนตามขนาดจอ) */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 bg-white gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img 
            src="/Logo-NSO.png" 
            alt="Logo" 
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            {/* ใช้ prop title ที่ส่งเข้ามา หรือแสดงค่ากลางตามที่ต้องการ */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              {title || "กลุ่มภารกิจด้านการพยาบาล"}
            </h1>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* แถบ Tabs: ใส่ overflow-x-auto เพื่อให้ปัดเลื่อนซ้าย-ขวาได้บนมือถือ */}
      <div className="w-full overflow-x-auto scrollbar-none border-b border-gray-200">
        <nav className="flex gap-6 sm:gap-8 px-4 sm:px-6 min-w-max" role="tablist">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || activeTab === tab.name;

            return (
              <button
                key={tab.name}
                onClick={() => onTabChange && onTabChange(tab.name)}
                aria-selected={isActive}
                role="tab"
                className={`pb-3 px-1 font-medium text-sm sm:text-base transition-all border-b-2 duration-300 whitespace-nowrap ${
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