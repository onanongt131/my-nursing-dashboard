// app/dashboard/category/page.tsx
'use client';
import CategoryClient from './CategoryClient';
import { useState, useEffect, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { checkStatus } from '@/utils/kpiCalculations';

const categories = [
  { id: 1, prefix: "หมวด 1", name: "ผลลัพธ์ด้านการนำองค์กร", icon: "🏛️", borderColor: "hover:border-blue-400 group-hover:bg-blue-50/50" },
  { id: 2, prefix: "หมวด 2", name: "ผลลัพธ์ด้านประสิทธิภาพ", icon: "🎯", borderColor: "hover:border-indigo-400 group-hover:bg-indigo-50/50" },
  { id: 3, prefix: "หมวด 3", name: "ผลลัพธ์ด้านผู้ใช้บริการ", icon: "👥", borderColor: "hover:border-emerald-400 group-hover:bg-emerald-50/50" },
  { id: 4, prefix: "หมวด 4", name: "ผลลัพธ์ด้านบุคลากร", icon: "📊", borderColor: "hover:border-amber-400 group-hover:bg-amber-50/50" },
  { id: 5, prefix: "หมวด 5", name: "ผลลัพธ์ด้านระบบงานและกระบวนการสำคัญ", icon: "👩‍⚕️", borderColor: "hover:border-purple-400 group-hover:bg-purple-50/50" },
  { id: 6, prefix: "หมวด 6", name: "ผลลัพธ์ด้านบริการพยาบาล", icon: "📝", borderColor: "hover:border-rose-400 group-hover:bg-rose-50/50" },
];

export default function CategoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [kpis, setKpis] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

  const supabase = createClient();

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

            const deptIds = deptsInGroup ? deptsInGroup.map((d: any) => d.id) : [];
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

  useEffect(() => {
    loadKpis();
  }, []);

  function catsFullName(prefixOrName: string) {
    const found = categories.find(c => c.name === prefixOrName || `${c.prefix} ${c.name}` === prefixOrName);
    return found ? `${found.prefix} ${found.name}` : prefixOrName;
  }

  const activeKpis = selectedCategory 
    ? kpis.filter((k) => k.category === catsFullName(selectedCategory)) 
    : kpis;

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

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เว็บไซต์เปิดหน้าต่างป๊อปอัป (Popup) เพื่อพิมพ์รายงาน");
      return;
    }

    let rowsHTML = '';
    categories.forEach((cat) => {
      const fullName = `${cat.prefix} ${cat.name}`;
      const catKpis = kpis.filter((k) => k.category === fullName);
      if (catKpis.length === 0) return;

      rowsHTML += `
        <tr style="background-color: #f3e8ff; font-weight: bold; color: #3b0764;">
          <td colspan="11" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 13px;">
            ${cat.icon} ${cat.prefix} ${cat.name}
          </td>
        </tr>
      `;

      catKpis.forEach((kpi, idx) => {
        const entries = kpi.kpi_entries || [];
        const entry2565 = entries.find((e: any) => e.year === 2565)?.value ?? '-';
        const entry2566 = entries.find((e: any) => e.year === 2566)?.value ?? '-';
        const entry2567 = entries.find((e: any) => e.year === 2567)?.value ?? '-';
        const entry2568 = entries.find((e: any) => e.year === 2568)?.value ?? '-';
        const entry2569 = entries.find((e: any) => e.year === 2569)?.value ?? '-';
        const latestEntry = [...entries].sort((a, b) => b.year - a.year)[0];
        const isPassed = latestEntry ? checkStatus(Number(latestEntry.value), kpi.target_value, kpi.operator, kpi.is_higher_better) : false;
        const leValue = latestEntry ? (isPassed ? "Pass" : "Fail") : "-";
        const leColor = leValue === 'Pass' ? '#059669' : leValue === 'Fail' ? '#e11d48' : '#334155';
        const tValue = entries.length >= 2 ? "▼" : "-";
        const cValue = kpi.comparison || kpi.c || "Goal";
        const actionNote = kpi.action_note ? `<div style="padding: 4px; background: #faf5ff; color: #6b21a8; border: 1px solid #f3e8ff; border-radius: 4px; font-size: 10px;">${kpi.action_note}</div>` : '-';

        rowsHTML += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">${idx + 1}. ${kpi.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${kpi.target_value} ${kpi.unit || ''}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${entry2565}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${entry2566}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${entry2567}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${entry2568}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${entry2569}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; color: ${leColor};">${leValue}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; color: #e11d48;">${tValue}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; color: #6b21a8; background: #faf5ff;">${cValue}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">${actionNote}</td>
          </tr>
        `;
      });
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงานผลการดำเนินงานตัวชี้วัด กลุ่มภารกิจด้านการพยาบาล</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: sans-serif; font-size: 11px; color: #334155; margin: 0; padding: 20px; }
          h2 { text-align: center; margin-bottom: 4px; font-size: 18px; color: #1e293b; }
          p { text-align: center; margin-top: 0; margin-bottom: 20px; font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; color: #1e293b; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
        </style>
      </head>
      <body>
        <h2>สรุปผลการดำเนินงานตัวชี้วัด กลุ่มภารกิจด้านการพยาบาล</h2>
        <p>ประจำปีงบประมาณ 2569</p>
        <table>
          <thead>
            <tr>
              <th style="width: 24%;">ตัวชี้วัด (KPI)</th>
              <th style="width: 6%;">Goal</th>
              <th style="width: 6%;">2565</th>
              <th style="width: 6%;">2566</th>
              <th style="width: 6%;">2567</th>
              <th style="width: 6%;">2568</th>
              <th style="width: 6%;">2569</th>
              <th style="width: 6%;">Le</th>
              <th style="width: 6%;">T</th>
              <th style="width: 10%;">C</th>
              <th style="width: 18%;">I</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  return (
    <div className="space-y-6">
      
      {/* แถบหัวข้อและปุ่มพิมพ์ด้านบนสุด */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span>📊</span> ภาพรวมตัวชี้วัดตามหมวดหมู่ (NQA)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedCategory ? `กำลังแสดงข้อมูลในหมวด: ${selectedCategory}` : "สรุปผลการดำเนินงานตัวชี้วัดทุกหมวดหมู่ของกลุ่มภารกิจด้านการพยาบาล"}
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>📄</span> ดูและพิมพ์รายงานภาพรวม
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ฝั่งซ้าย: แผงควบคุมสรุปภาพรวม */}
        <div className="lg:col-span-3 flex flex-col space-y-4 sticky top-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-purple-600"></div>
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {selectedCategory ? "สรุปผลหมวดนี้" : "สรุปภาพรวมทั้งหมด"}
              </span>
              <span className="text-2xl px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-full">
                {stats.total} ตัวชี้วัด
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex flex-col">
                <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px]">✓</span> ผ่าน
                </span>
                <span className="text-4xl font-black text-emerald-700 mt-1">{stats.passed}</span>
              </div>

              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100 flex flex-col">
                <span className="text-rose-700 font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">✕</span> ไม่ผ่าน
                </span>
                <span className="text-2xl font-black text-rose-600 mt-1">{stats.failed}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">อัตราความสำเร็จ</span>
                <span className="font-extrabold text-slate-800">{stats.percent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.percent, 100)}%` }}
                ></div>
              </div>
            </div>

            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)} 
                className="w-full py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-xl border border-purple-200 transition-all text-center shadow-sm cursor-pointer"
              >
                ← ดูภาพรวมทุกหมวดหมู่
              </button>
            )}
          </div>
        </div>

        {/* ฝั่งขวา: การ์ดหมวดหมู่ / เนื้อหา */}
        <div className="lg:col-span-9 flex flex-col">
          {!selectedCategory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat, index) => {
                const summaryData = totalCategoriesSummary[index];
                const total = summaryData.total;
                const passed = summaryData.passed;
                const failed = summaryData.failed;
                const fullName = `${cat.prefix} ${cat.name}`;
                const catPercent = total > 0 ? Math.round((passed / total) * 100) : 0;

                return (
                  <div 
                    key={cat.id} 
                    onClick={() => setSelectedCategory(fullName)} 
                    // [ปรับปรุง] เพิ่มลูกเล่นขอบสีแบบมีมิติ, เงาจางๆ และเอฟเฟกต์ Transition เมื่อ Hover
                    className={`bg-white p-5 rounded-2xl border-2 border-slate-200/80 ${cat.borderColor} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
                  >
                    {/* แถบสีตกแต่งขอบบนของการ์ดเพิ่มความพรีเมียม */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/40 via-indigo-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <span className="text-3xl p-2.5 bg-slate-50 rounded-2xl group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">{cat.icon}</span>
                        <div>
                          <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider block mb-0.5">{cat.prefix}</span>
                          <h3 className="font-bold text-base text-slate-800 leading-snug line-clamp-1 group-hover:text-purple-950 transition-colors">{cat.name}</h3>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 my-3"></div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[11px] font-medium">ตัวชี้วัดทั้งหมด</span>
                            <span className="text-lg font-extrabold text-slate-700">{total}</span>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-emerald-600 text-[11px] font-medium">ผ่าน</span>
                            <span className="text-lg font-extrabold text-emerald-600">{passed}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-rose-600 text-[11px] font-medium">ไม่ผ่าน</span>
                            <span className="text-lg font-extrabold text-rose-600">{failed}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${catPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 animate-in slide-in-from-right-4 duration-300 flex flex-col">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>{categories.find(c => `${c.prefix} ${c.name}` === selectedCategory)?.icon}</span>
                  <span>{selectedCategory}</span>
                </h2>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all cursor-pointer"
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

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-[95vw] h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">พรีวิวรายงานตัวชี้วัด กลุ่มภารกิจด้านการพยาบาล</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrintReport}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>🖨️</span> สั่งพิมพ์เอกสาร (แนวนอน)
                </button>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1 bg-white text-xs">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">สรุปผลการดำเนินงานตัวชี้วัด กลุ่มภารกิจด้านการพยาบาล</h2>
                <p className="text-sm text-slate-500 mt-1">ประจำปีงบประมาณ 2569</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-2 text-center w-[24%]">ตัวชี้วัด (KPI)</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">Goal</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">2565</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">2566</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">2567</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">2568</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">2569</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">Le</th>
                      <th className="border border-slate-300 p-2 text-center w-[6%]">T</th>
                      <th className="border border-slate-300 p-2 text-center w-[10%]">C</th>
                      <th className="border border-slate-300 p-2 text-center w-[18%]">I</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const fullName = `${cat.prefix} ${cat.name}`;
                      const catKpis = kpis.filter((k) => k.category === fullName);
                      if (catKpis.length === 0) return null;

                      return (
                        <Fragment key={cat.id}>
                          <tr className="bg-purple-100/90 font-bold text-purple-950">
                            <td colSpan={11} className="border border-slate-300 p-2.5 text-sm">
                              {cat.icon} {cat.prefix} {cat.name}
                            </td>
                          </tr>
                          {catKpis.map((kpi, idx) => {
                            const entries = kpi.kpi_entries || [];
                            const entry2565 = entries.find((e: any) => e.year === 2565)?.value ?? '-';
                            const entry2566 = entries.find((e: any) => e.year === 2566)?.value ?? '-';
                            const entry2567 = entries.find((e: any) => e.year === 2567)?.value ?? '-';
                            const entry2568 = entries.find((e: any) => e.year === 2568)?.value ?? '-';
                            const entry2569 = entries.find((e: any) => e.year === 2569)?.value ?? '-';
                            const latestEntry = [...entries].sort((a, b) => b.year - a.year)[0];
                            const isPassed = latestEntry ? checkStatus(Number(latestEntry.value), kpi.target_value, kpi.operator, kpi.is_higher_better) : false;
                            const leValue = latestEntry ? (isPassed ? "Pass" : "Fail") : "-";
                            const tValue = entries.length >= 2 ? "▼" : "-";
                            const cValue = kpi.comparison || kpi.c || "Goal";

                            return (
                              <tr key={kpi.id || idx} className="hover:bg-slate-50/50">
                                <td className="border border-slate-300 p-2 text-left font-medium text-slate-800">{idx + 1}. {kpi.name}</td>
                                <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700">{kpi.target_value} {kpi.unit || ''}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-600">{entry2565}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-600">{entry2566}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-600">{entry2567}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-600">{entry2568}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-600">{entry2569}</td>
                                <td className={`border border-slate-300 p-2 text-center font-bold ${leValue === 'Pass' ? 'text-emerald-600' : leValue === 'Fail' ? 'text-rose-600' : 'text-slate-700'}`}>{leValue}</td>
                                <td className="border border-slate-300 p-2 text-center text-rose-600 font-bold">{tValue}</td>
                                <td className="border border-slate-300 p-2 text-center font-semibold text-purple-700 bg-purple-50/50">{cValue}</td>
                                <td className="border border-slate-300 p-2 text-left">
                                  {kpi.action_note ? <div className="p-1.5 bg-purple-50 text-purple-800 rounded border border-purple-100 text-[11px] leading-relaxed whitespace-pre-wrap">{kpi.action_note}</div> : <span className="text-slate-400 block text-center">-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}