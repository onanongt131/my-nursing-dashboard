'use client';
import LogoutButton from "@/components/LogoutButton";
import { usePathname } from 'next/navigation';

export const DashboardHeader = ({ title, activeTab, onTabChange, stats }: any) => {
  const pathname = usePathname();

  const tabs = [
    { name: 'dashboard', label: 'ภาพรวม', path: '/dashboard' },
    { name: 'category', label: 'รายหมวด', path: '/dashboard/category' },
    { name: 'strategy', label: 'แผนยุทธศาสตร์', path: '/dashboard/strategy' },
    { name: 'unit', label: 'รายหน่วยงาน', path: '/dashboard/departments' }, // ปรับ path ให้ตรงกับฟังก์ชัน handleTabChange ของคุณ
    { name: 'productivity', label: 'Productivity', path: '/dashboard/productivity' },
    { name: 'wp-qa', label: 'WP/QA', path: '/dashboard/wp-qa' },
    { name: 'audit-chart', label: 'Audit chart', path: '/dashboard/audit-chart' }
  ];

  return (
    <div className="bg-white shadow-sm -mt-6">
      {/* ส่วน Header หลัก */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <img 
            src="/Logo-NSO.png" 
            alt="Logo" 
            className="h-14 w-14 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต</h1>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* แถบ Tabs */}
      <nav className="flex gap-8 px-6 border-b border-gray-200 mt-4" role="tablist">
        {tabs.map((tab) => {
          // เช็คว่า active จากทั้ง URL path ปัจจุบัน หรือจาก prop activeTab ที่ส่งเข้ามา
          const isActive = pathname === tab.path || activeTab === tab.name;

          return (
            <button
              key={tab.name}
              onClick={() => onTabChange && onTabChange(tab.name)}
              aria-selected={isActive}
              role="tab"
              className={`pb-3 px-1 font-medium transition-all border-b-2 duration-300 ${
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
  )
}
