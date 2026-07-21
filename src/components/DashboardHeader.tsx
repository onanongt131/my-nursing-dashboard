'use client';
import LogoutButton from "@/components/LogoutButton";

export const DashboardHeader = ({ title, activeTab, onTabChange, stats }: any) => {
  const tabs = [
    { name: 'dashboard', label: 'ภาพรวม' },
    { name: 'category', label: 'รายหมวด' },
    { name: 'strategy', label: 'แผนยุทธศาสตร์' },
    { name: 'unit', label: 'รายหน่วยงาน' },
    { name: 'productivity', label: 'Productivity' },
    { name: 'wp-qa', label: 'WP/QA', path: '/dashboard/wp-qa' }
  ];

  return (
   <div className="bg-white shadow-sm -mt-6"> {/* ใช้ -mt-6 เพื่อดึงขึ้นไปทับระยะห่างด้านบน */}
      {/* ส่วน Header หลัก */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-4"> {/* เพิ่ม gap เป็น 4 เพื่อเว้นระยะ */}
          <img 
            src="/Logo-NSO.png" 
            alt="Logo" 
            className="h-14 w-14 object-contain" // ปรับให้เป็นขนาดคงที่เพื่อป้องกันภาพยืดหรือเบี้ยว
            onError={(e) => { e.currentTarget.style.display = 'none'; }} // ซ่อนรูปถ้าโหลดไม่ขึ้น เพื่อไม่ให้แสดงชื่อ alt
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต</h1>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* เพิ่ม mt-4 หรือ mt-6 เพื่อให้แถบ Tabs ขยับห่างจาก Header ด้านบน */}
<nav className="flex gap-8 px-6 border-b border-gray-200 mt-4" role="tablist">
  {tabs.map((tab) => (
    <button
      key={tab.name}
      onClick={() => onTabChange(tab.name)}
      aria-selected={activeTab === tab.name}
      role="tab"
      className={`pb-3 px-1 font-medium transition-all border-b-2 duration-300 ${
        activeTab === tab.name 
          ? 'border-purple-600 text-purple-700' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {tab.label}
    </button>
  ))}
</nav>
    </div>
  );
};