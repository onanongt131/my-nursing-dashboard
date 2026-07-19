'use client';
import CategoryClient from './CategoryClient';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { checkStatus } from '@/utils/kpiCalculations';

const categories = [
  { id: 1, name: "หมวด 1 ผลลัพธ์ด้านการนำองค์กร", icon: "🏛️" },
  { id: 2, name: "หมวด 2 ผลลัพธ์ด้านกลยุทธ์", icon: "🎯" },
  { id: 3, name: "หมวด 3 ผลลัพธ์ด้านผู้ใช้บริการ", icon: "👥" },
  { id: 4, name: "หมวด 4 ผลลัพธ์ด้านการวัด", icon: "📊" },
  { id: 5, name: "หมวด 5 ผลลัพธ์ด้านบุคลากร", icon: "👩‍⚕️" },
  { id: 6, name: "หมวด 6 ผลลัพธ์ด้านการปฏิบัติการพยาบาล", icon: "📝" },
];

export default function CategoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    const loadKpis = async () => {
      const { data } = await supabase.from('kpis').select('*, kpi_entries(*)');
      if (data) setKpis(data);
    };
    loadKpis();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. ส่วน Grid หมวดหมู่ */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${selectedCategory ? "hidden" : ""}`}>
        {categories.map((cat) => {
          const categoryKpis = kpis.filter((k) => k.category === cat.name);
          const total = categoryKpis.length; // จำนวนจริงตามฐานข้อมูล
          const passed = categoryKpis.filter((k) => {
              const latest = [...(k.kpi_entries || [])].sort((a, b) => b.year - a.year)[0];
              return latest && checkStatus(Number(latest.value), k.target_value, k.operator, k.is_higher_better);
          }).length;
          const failed = total - passed; // คำนวณจำนวนที่ไม่ผ่าน

          return (
            <div 
              key={cat.id} 
              onClick={() => setSelectedCategory(cat.name)} 
              className="mt-6 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm cursor-pointer hover:border-purple-300 ..."
                >
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{cat.icon}</span>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-purple-700">{cat.name}</h3>
              </div>
              <div className="border-t border-gray-100 mb-4"></div>
              <div className="flex justify-between items-center">
              <div className="flex flex-col">
                  <span className="text-gray-500 text-sm">KPI ทั้งหมด</span>
                  <span className="text-2xl font-bold text-gray-800">{total}</span>
              </div>
              <div className="ml-auto flex gap-8">
                <div className="flex flex-col items-center">
                  <span className="text-green-600 text-sm font-medium">ผ่าน</span>
                  <span className="text-2xl font-bold text-green-600">{passed}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-red-600 text-sm font-medium">ไม่ผ่าน</span>
                  <span className="text-red-600 text-2xl font-bold">{failed}</span>
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {/* 2. ส่วน CategoryClient (วางไว้นอก map) */}
      {selectedCategory && (
        <div className="space-y-2 animate-in slide-in-from-top-4 duration-500 pt-6">
          <button 
            onClick={() => setSelectedCategory(null)} 
            className="text-purple-600 font-bold flex items-center gap-2 hover:underline"
          >
            ← กลับไปหน้าเลือกหมวดทั้งหมด
          </button>
          <CategoryClient category={selectedCategory} />
        </div>
      )}
    </div>
  );
}