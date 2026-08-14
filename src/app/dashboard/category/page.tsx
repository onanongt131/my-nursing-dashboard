// app/dashboard/category/page.tsx
'use client';
import CategoryClient from './CategoryClient';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { checkStatus } from '@/utils/kpiCalculations';

const categories = [
  { id: 1, prefix: "หมวด 1", name: "ผลลัพธ์ด้านการนำองค์กร", icon: "🏛️" },
  { id: 2, prefix: "หมวด 2", name: "ผลลัพธ์ด้านประสิทธิภาพ", icon: "🎯" },
  { id: 3, prefix: "หมวด 3", name: "ผลลัพธ์ด้านผู้ใช้บริการ", icon: "👥" },
  { id: 4, prefix: "หมวด 4", name: "ผลลัพธ์ด้านบุคลากร", icon: "📊" },
  { id: 5, prefix: "หมวด 5", name: "ผลลัพธ์ด้านระบบงานและกระบวนการสำคัญ", icon: "👩‍⚕️" },
  { id: 6, prefix: "หมวด 6", name: "ผลลัพธ์ด้านบริการพยาบาล", icon: "📝" },
];

export default function CategoryPage() {
  const supabase = createClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [kpis, setKpis] = useState<any[]>([]);

  useEffect(() => {
    const loadKpis = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let userProfile = null;

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*, departments(group)')
            .eq('id', user.id)
            .maybeSingle();
          userProfile = data;
        }

        const { data: allKpis, error: kpiError } = await supabase
          .from('kpis')
          .select('*, kpi_entries(*)');

        if (kpiError) {
          console.error("Error fetching KPIs:", kpiError.message);
        }

        if (allKpis) {
          let filtered = allKpis.filter((k: any) => k.departments_id === null);

          if (userProfile && userProfile.role) {
            const role = userProfile.role;
            const userDeptId = userProfile.department_id;
            const userGroup = (userProfile.departments as any)?.group;

            if (role === 'staff' || role === 'head_department') {
              filtered = allKpis.filter((k: any) => k.departments_id === userDeptId);
            } 
            else if (role === 'head_group' && userGroup) {
              const { data: deptsInGroup } = await supabase
                .from('departments')
                .select('id')
                .eq('group', userGroup);

              const deptIds = deptsInGroup ? deptsInGroup.map(d => d.id) : [];
              filtered = allKpis.filter((k: any) => deptIds.includes(k.departments_id));
            }
            else if (role === 'admin' || role === 'head_nurse') {
              filtered = allKpis;
            }
          } else {
            filtered = allKpis;
          }

          const validCategoryKpis = filtered.filter(
            (k: any) => k.category && k.category.trim() !== ''
          );

          setKpis(validCategoryKpis);
        }
      } catch (err) {
        console.error("Unexpected error loading KPIs:", err);
      }
    };

    loadKpis();
  }, []);

  function catsFullName(prefixOrName: string) {
    const found = categories.find(c => c.name === prefixOrName || `${c.prefix} ${c.name}` === prefixOrName);
    return found ? `${found.prefix} ${found.name}` : prefixOrName;
  }

  const activeKpis = selectedCategory 
    ? kpis.filter((k) => k.category === catsFullName(selectedCategory)) 
    : kpis;

  // คำนวณภาพรวมผ่านผลรวมย่อยของแต่ละหมวด เพื่อให้ตัวเลขสอดคล้องกันทุกจุด
  const totalCategoriesSummary = categories.map((cat) => {
    const fullName = `${cat.prefix} ${cat.name}`;
    const categoryKpis = kpis.filter((k) => k.category === fullName);
    const total = categoryKpis.length;
    const passed = categoryKpis.filter((k) => {
      const latest = [...(k.kpi_entries || [])].sort((a, b) => b.year - a.year)[0];
      return latest && checkStatus(Number(latest.value), k.target_value, k.operator, k.is_higher_better);
    }).length;
    const failed = total - passed;
    return { total, passed, failed };
  });

  const stats = selectedCategory ? (() => {
    const total = activeKpis.length;
    const passed = activeKpis.filter((k) => {
      const latest = [...(k.kpi_entries || [])].sort((a, b) => b.year - a.year)[0];
      return latest && checkStatus(Number(latest.value), k.target_value, k.operator, k.is_higher_better);
    }).length;
    const failed = total - passed;
    return {
      total,
      passed,
      failed,
      percent: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  })() : {
    total: totalCategoriesSummary.reduce((sum, item) => sum + item.total, 0),
    passed: totalCategoriesSummary.reduce((sum, item) => sum + item.passed, 0),
    failed: totalCategoriesSummary.reduce((sum, item) => sum + item.failed, 0),
    get percent() {
      return this.total > 0 ? Math.round((this.passed / this.total) * 100) : 0;
    }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= ฝั่งซ้าย: สรุปภาพรวม (ตรึงตำแหน่งด้วย sticky และ top-6) ================= */}
        <div className="lg:col-span-2 flex flex-col space-y-4 sticky top-6">
          
          {/* Card 1: KPI ทั้งหมด */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
            <span className="text-slate-500 font-medium mb-1 text-[11px] uppercase tracking-wider text-center">
              {selectedCategory ? "KPI ในหมวดนี้" : "KPI ทั้งหมด"}
            </span>
            <span className="text-4xl font-black text-slate-900 mt-1">{stats.total}</span>
          </div>

          {/* Card 2: ผ่านเกณฑ์ / ไม่ผ่าน */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-rose-500"></div>
            
            {/* ผ่านเกณฑ์ */}
            <div className="flex items-center justify-between bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/60">
              <div className="flex items-center gap-1.5">
                <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">✓</span>
                <span className="text-emerald-800 font-semibold text-xs">ผ่านเกณฑ์</span>
              </div>
              <span className="text-4xl font-black text-emerald-700">{stats.passed}</span>
            </div>

            {/* ไม่ผ่าน */}
            <div className="flex items-center justify-between bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/60">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px]">✕</span>
                <span className="text-rose-800 font-semibold text-xs">ไม่ผ่าน</span>
              </div>
              <span className="text-2xl font-black text-rose-600">{stats.failed}</span>
            </div>
          </div>

          {/* Card 3: สัดส่วนการผ่าน */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <span className="text-slate-500 font-medium mb-1 text-[11px] uppercase tracking-wider text-center">สัดส่วนการผ่าน</span>
            <span className="text-4xl font-black text-amber-500 mt-1">{stats.percent}%</span>
          </div>

          {/* ปุ่มเคลียร์เลือกหมวดหมู่ */}
          {selectedCategory && (
            <button 
              onClick={() => setSelectedCategory(null)} 
              className="w-full py-2.5 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-xl border border-purple-200 transition-all text-center shadow-sm"
            >
              ← ดูภาพรวมทั้งหมด
            </button>
          )}

        </div>

        {/* ================= ฝั่งขวา: กล่องหมวดหมู่ / เนื้อหาภายในหมวด (col-span-10) ================= */}
        <div className="lg:col-span-10 flex flex-col">
          {!selectedCategory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat, index) => {
                const summaryData = totalCategoriesSummary[index];
                const total = summaryData.total;
                const passed = summaryData.passed;
                const failed = summaryData.failed;
                const fullName = `${cat.prefix} ${cat.name}`;

                return (
                  <div 
                    key={cat.id} 
                    onClick={() => setSelectedCategory(fullName)} 
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <span className="text-3xl p-2.5 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform shrink-0">{cat.icon}</span>
                        <div>
                          <span className="text-xl font-bold text-purple-600 block mb-0.5">{cat.prefix}</span>
                          <h3 className="font-bold text-xl text-slate-800 leading-snug line-clamp-2">{cat.name}</h3>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 mb-3"></div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                          <span className="text-slate-400 text-[11px] font-medium">ทั้งหมด</span>
                          <span className="text-xl font-bold text-slate-700">{total}</span>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-600 text-[11px] font-medium">ผ่าน</span>
                          <span className="text-xl font-bold text-emerald-600">{passed}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-rose-600 text-[11px] font-medium">ไม่ผ่าน</span>
                          <span className="text-xl font-bold text-rose-600">{failed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 animate-in slide-in-from-right-4 duration-300 flex flex-col">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>{categories.find(c => `${c.prefix} ${c.name}` === selectedCategory)?.icon}</span>
                  <span>{selectedCategory}</span>
                </h2>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-purple-600 font-semibold hover:underline"
                >
                  ✕ ปิดมุมมองนี้
                </button>
              </div>
              <div className="flex-1">
                <CategoryClient category={selectedCategory} />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}