'use client';
import { LayoutDashboard } from 'lucide-react';
import LogoutButton from "@/components/LogoutButton";

const tabs = [
  { name: 'dashboard', label: 'ภาพรวม' },
  { name: 'category', label: 'รายหมวด' },
  { name: 'strategy', label: 'แผนยุทธศาสตร์' },
  { name: 'unit', label: 'รายหน่วยงาน' },
  { name: 'productivity', label: 'Productivity' } // เพิ่มตรงนี้ครับ // เก็บ label เป็น 'รายหน่วยงาน' ไว้ตามเดิมได้ครับ
];

export const DashboardHeader = ({ title, activeTab, onTabChange, stats }: any) => {
  return (
    <div className="mb-8">
      {/* ส่วนบน: หัวข้อ */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{title || "กลุ่มภารกิจด้านการพยาบาล"}</h1>
            <p className="text-sm text-gray-500">ผลการติดตามตัวชี้วัดภาพรวม ({stats?.total || 0} รายการ)</p>
          </div>
        </div>
        <LogoutButton />
      </div>

      {/* ส่วน Tabs: ดีไซน์ใหม่แบบไม่มีกรอบ */}
      <div className="flex gap-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => onTabChange(tab.name)}
            aria-selected={activeTab === tab.name}
            role="tab"
            className={`pb-3 px-1 font-medium transition-all border-b-2 duration-300 ${ // เพิ่ม duration-300 ให้ขยับนุ่มนวล
              activeTab === tab.name 
                ? 'border-purple-600 text-purple-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' // เพิ่ม hover border ให้ดูตอบสนองดีขึ้น
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};