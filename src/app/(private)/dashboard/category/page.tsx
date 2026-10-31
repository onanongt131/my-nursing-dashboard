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

  const formatGoal = (kpi: any) => {
    const op = kpi.operator && kpi.operator.trim() !== '' ? `${kpi.operator} ` : '';
    const val = kpi.target_value ?? '';
    const unit = kpi.unit ? ` ${kpi.unit}` : '';
    return `${op}${val}${unit}`;
  };

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
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${formatGoal(kpi)}</td>
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
    <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden">
      {/* แถบหัวข้อและปุ่มพิมพ์ด้านบนสุด */}
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold leading-snug tracking-tight text-slate-800 sm:text-xl">
            <span>📊</span> ภาพรวมตัวชี้วัดตามหมวดหมู่ (NQA)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedCategory ? `กำลังแสดงข้อมูลในหมวด: ${selectedCategory}` : "สรุปผลการดำเนินงานตัวชี้วัดทุกหมวดหมู่ของกลุ่มภารกิจด้านการพยาบาล"}
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer w-full justify-center sm:w-auto shrink-0"
        >
          <span>📄</span> ดูและพิมพ์รายงานภาพรวม
        </button>
      </div>

      {/* สรุปทั้ง 4 ค่าอยู่ด้านบน เพื่อให้เหลือความกว้างสำหรับหมวด KPI */}
      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">{selectedCategory ? "ตัวชี้วัดในหมวด" : "ตัวชี้วัดทั้งหมด"}</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-slate-800">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">✓ ผ่านเป้าหมาย</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-emerald-700">{stats.passed}</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 shadow-sm">
          <div className="text-xs font-semibold text-rose-700">✕ ไม่ผ่านเป้าหมาย*</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-rose-700">{stats.failed}</div>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-teal-800">
            <span>อัตราความสำเร็จ</span><span>{stats.percent}%</span>
          </div>
          <div className="mt-3 text-3xl font-black tabular-nums text-teal-800">{stats.percent}%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-teal-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.min(stats.percent, 100)}%` }} />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">*สถานะสรุปใช้เกณฑ์เดิมของระบบ ซึ่งรวมรายการที่ไม่มีผลล่าสุดไว้ในจำนวนไม่ผ่าน</p>

      {selectedCategory && (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-sm font-semibold text-slate-700">กำลังดู: {selectedCategory}</p>
          <button onClick={() => setSelectedCategory(null)} className="shrink-0 self-start rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100">← ดูภาพรวมทุกหมวด</button>
        </div>
      )}

      {!selectedCategory ? (
        <section className="min-w-0">
          <h2 className="mb-3 text-base font-bold text-slate-800">ผลลัพธ์ตามหมวด NQA</h2>
          {/* ใช้ container queries: จำนวนคอลัมน์อิงพื้นที่จริงหลังหัก Sidebar */}
          <div className="@container w-full min-w-0">
            <div className="grid grid-cols-1 gap-4 @[660px]:grid-cols-2 @[1150px]:grid-cols-3">
              {categories.map((cat, index) => {
                const summaryData = totalCategoriesSummary[index];
                const total = summaryData.total;
                const passed = summaryData.passed;
                const failed = summaryData.failed;
                const fullName = `${cat.prefix} ${cat.name}`;
                const catPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setSelectedCategory(fullName)}
                    className={`group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 ${cat.borderColor}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="shrink-0 rounded-xl bg-slate-50 p-2 text-2xl" aria-hidden="true">{cat.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-purple-600">{cat.prefix}</span>
                        <h3 className="mt-1 break-words text-sm font-bold leading-relaxed text-slate-800 group-hover:text-purple-950">{cat.name}</h3>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><div className="text-[11px] text-slate-500">ทั้งหมด</div><div className="text-xl font-extrabold tabular-nums text-slate-700">{total}</div></div>
                        <div><div className="text-[11px] text-emerald-600">ผ่าน</div><div className="text-xl font-extrabold tabular-nums text-emerald-600">{passed}</div></div>
                        <div><div className="text-[11px] text-rose-600">ไม่ผ่าน</div><div className="text-xl font-extrabold tabular-nums text-rose-600">{failed}</div></div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600" style={{ width: `${catPercent}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b pb-4">
            <h2 className="min-w-0 break-words text-base font-bold text-slate-800">{categories.find(c => `${c.prefix} ${c.name}` === selectedCategory)?.icon} {selectedCategory}</h2>
            <button type="button" onClick={() => setSelectedCategory(null)} className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">✕ ปิดมุมมองนี้</button>
          </div>
          {/* รายละเอียดอาจมีตารางกว้าง: เลื่อนเฉพาะบริเวณรายละเอียด */}
          <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
            <CategoryClient category={selectedCategory} />
          </div>
        </section>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-[95vw] h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
              <h3 className="font-bold text-lg text-slate-800">พรีวิวรายงานตัวชี้วัด กลุ่มภารกิจด้านการพยาบาล</h3>
              <div className="flex flex-wrap gap-2">
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

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white p-3 text-xs sm:p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">สรุปผลการดำเนินงานตัวชี้วัด กลุ่มภารกิจด้านการพยาบาล</h2>
                <p className="text-sm text-slate-500 mt-1">ประจำปีงบประมาณ 2569</p>
              </div>

              <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[850px] border-collapse text-left text-xs">
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
                                <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700">{formatGoal(kpi)}</td>
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