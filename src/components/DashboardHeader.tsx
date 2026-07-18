'use client';
import LogoutButton from "@/components/LogoutButton";

export const DashboardHeader = ({ title, activeTab, onTabChange, stats }: any) => {
  const tabs = [
    { name: 'dashboard', label: 'ภาพรวม' },
    { name: 'category', label: 'รายหมวด' },
    { name: 'strategy', label: 'แผนยุทธศาสตร์' },
    { name: 'unit', label: 'รายหน่วยงาน' },
    { name: 'productivity', label: 'Productivity' }
  ];

  return (
    <div className="bg-white shadow-sm">
      {/* ส่วน Header หลัก */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img 
            src="/Logo-NSO.png" 
            alt="Nursing Mission Group Logo" 
            className="h-12 w-auto object-contain" 
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {title || "กลุ่มภารกิจด้านการพยาบาล โรงพยาบาลวชิระภูเก็ต"}
            </h1>
            <p className="text-sm text-gray-500">
              ผลการติดตามตัวชี้วัดภาพรวม ({stats?.total || 0} รายการ)
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* ส่วน Tabs นำมาไว้ภายใน Return และครอบด้วย Container เดียวกัน */}
      <nav className="flex gap-8 px-6 border-b border-gray-200" role="tablist">
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