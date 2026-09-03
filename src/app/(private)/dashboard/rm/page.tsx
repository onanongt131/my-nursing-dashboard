'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddEntryForm from '@/components/AddEntryForm';

export default function RkpRmPage() {
  const supabase = createClient();
  const [parentKpis, setParentKpis] = useState<any[]>([]);
  const [singleKpis, setSingleKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);

  const years = [2565, 2566, 2567, 2568, 2569];

  // ฟังก์ชันคำนวณผลรวมรายปีตามประเภทตัวชี้วัด
  const calculateYearValue = (kpi: any, year: number) => {
    if (!kpi.kpi_entries || kpi.kpi_entries.length === 0) return null;

    const entriesForYear = kpi.kpi_entries.filter(
      (e: any) => Number(e.year || e.fiscal_year) === year
    );

    if (entriesForYear.length === 0) return null;

    const kpiType = kpi.data_type || 'count'; // รองรับประเภท count, percent, rate

    if (kpiType === 'count') {
      const total = entriesForYear.reduce((sum: number, e: any) => sum + Number(e.value || 0), 0);
      return Number(total.toFixed(2));
    } else {
      // สำหรับ percent และ rate: (ผลรวมตัวตั้ง / ผลรวมตัวหาร) * (ถ้าเป็น percent คูณ 100 ถ้าไม่ใช่คูณ 1)
      const totalNum = entriesForYear.reduce((sum: number, e: any) => sum + Number(e.numerator || e.num || 0), 0);
      const totalDen = entriesForYear.reduce((sum: number, e: any) => sum + Number(e.denominator || e.den || 1), 0);
      
      if (totalDen === 0) return 0;
      const result = (totalNum / totalDen) * (kpiType === 'percent' ? 100 : 1);
      return Number(result.toFixed(2));
    }
  };

  // ฟังก์ชันคำนวณ Trend (ปรับปรุงใหม่ให้ดูภาพรวม 3 ปีอย่างแม่นยำขึ้น)
  const calculateTrend = (kpi: any) => {
    const availableYears = years
      .map(year => ({ year, val: calculateYearValue(kpi, year) }))
      .filter(item => item.val !== null)
      .sort((a, b) => a.year - b.year);

    const lastThree = availableYears.slice(-3);

    if (lastThree.length < 2) {
      return <span className="text-xs text-gray-400">-</span>;
    }

    const latest = lastThree[lastThree.length - 1].val!; // ปีล่าสุด (2569)
    const prev = lastThree[lastThree.length - 2].val!;    // ปีก่อนหน้า (2568)
    const oldest = lastThree[0].val!;                   // ปีแรกใน 3 ปี (2567)

    const isLowerIsBetter = Number(kpi.target_value || 0) === 0;

    // เช็คทิศทางเทียบกับปีล่าสุดกับปีก่อนหน้าโดยตรงด้วย เพื่อกันกรณีปีล่าสุดดิ่งลง
    let trendLabel = "";
    let colorClass = "";

    const diffLatest = latest - prev; // เทียบปีล่าสุดกับปีก่อนหน้า
    const diffOverall = latest - oldest; // เทียบภาพรวม 3 ปี

    // ถ้าตัวชี้วัดควรเพิ่มขึ้น (เช่น ร้อยละความพึงพอใจ)
    if (!isLowerIsBetter) {
      if (diffOverall > 0 && diffLatest >= 0) {
        trendLabel = "▲ ดีขึ้น";
        colorClass = "text-emerald-600";
      } else if (diffLatest < 0) {
        trendLabel = "▼ เฝ้าระวัง"; // ปีล่าสุดตกลงจากปีก่อนหน้า
        colorClass = "text-red-500";
      } else if (diffOverall === 0 && diffLatest === 0) {
        trendLabel = "▬ คงที่";
        colorClass = "text-gray-500";
      } else {
        trendLabel = "▼ เฝ้าระวัง";
        colorClass = "text-red-500";
      }
    } else {
      // ถ้าตัวชี้วัดควรลดลง (ยิ่งน้อยยิ่งดี เช่น อัตราความผิดพลาด)
      if (diffOverall < 0 && diffLatest <= 0) {
        trendLabel = "▲ ดีขึ้น";
        colorClass = "text-emerald-600";
      } else if (diffLatest > 0) {
        trendLabel = "▼ เฝ้าระวัง"; // ปีล่าสุดสูงขึ้น (แย่ลง)
        colorClass = "text-red-500";
      } else {
        trendLabel = "▼ เฝ้าระวัง";
        colorClass = "text-red-500";
      }
    }

    return <span className={`font-bold text-xs ${colorClass}`}>{trendLabel}</span>;
  };

  const fetchRmKpis = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kpis')
      .select('*, kpi_entries(*)')
      .eq('kpi_type', 'RM');

    if (data) {
      const parentItems = data.filter((kpi: any) => !kpi.parent_id);
      const withChildren: any[] = [];
      const withoutChildren: any[] = [];

      parentItems.forEach((parent: any) => {
        const children = data.filter((kpi: any) => kpi.parent_id === parent.id);
        if (children.length > 0) {
          parent.sub_items = children;
          withChildren.push(parent);
        } else {
          withoutChildren.push(parent);
        }
      });
      setParentKpis(withChildren);
      setSingleKpis(withoutChildren);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRmKpis();
  }, []);

  if (loading) return <div className="p-8 text-center text-emerald-900 font-medium">กำลังโหลดข้อมูลตัวชี้วัด RM...</div>;

  if (selectedKpi) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedKpi(null)}
          className="text-emerald-800 hover:text-emerald-950 font-bold text-sm flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-lg shadow-xs border border-emerald-100 w-fit"
        >
          ← ย้อนกลับหน้าตาราง
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
          {/* ฝั่งซ้าย: กราฟแท่ง */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 relative">
            <div className="absolute top-4 right-4 bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-xs font-bold shadow-xs">
              GOAL = {selectedKpi.target_value ?? 0}
            </div>
            
            <h2 className="text-sm font-bold text-gray-900 mb-6 pr-24 line-clamp-2">
              {selectedKpi.name}
            </h2>

            <div className="relative pt-6 pb-2">
              <div 
                className="absolute w-full left-0 flex items-center z-10 pointer-events-none"
                style={{ bottom: `${Math.min(Math.max(Number(selectedKpi.target_value || 0), 0), 100)}%` }}
              >
                <div className="w-full border-t-2 border-dashed border-red-500"></div>
              </div>

              <div className="h-56 flex items-end justify-between gap-3 px-2 border-b border-gray-300 relative z-20">
                {years.map((year) => {
                  const val = calculateYearValue(selectedKpi, year);
                  const heightPercent = val !== null && val > 0 ? Math.min(Math.max(val, 0), 100) : 0;

                  return (
                    <div key={year} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[11px] font-extrabold text-emerald-800 mb-1.5">
                        {val !== null ? val : '-'}
                      </span>
                      <div className="w-full max-w-[36px] bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all duration-500 shadow-sm relative flex items-start justify-center"
                           style={{ height: `${heightPercent}%`, minHeight: val !== null && val > 0 ? '8px' : '4px', opacity: val !== null && val > 0 ? 1 : 0.15 }}>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 mt-2">{year}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: ฟอร์มเพิ่มข้อมูล */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 space-y-2">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              บันทึกผลการดำเนินงาน
            </h3>
            
            <div className="pt-0">
              <AddEntryForm
                kpiId={selectedKpi.id}
                type="main"
                onSuccess={() => {
                  fetchRmKpis(); 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-5 rounded-2xl shadow-md">
        <h1 className="text-xl font-extrabold tracking-wide">ตัวชี้วัดความเสี่ยงทางการพยาบาล (KPI RM)</h1>
        <p className="text-xs text-emerald-200 mt-1">ติดตามและประเมินผลการดำเนินงานตัวชี้วัดความเสี่ยงย้อนหลัง 5 ปี</p>
      </div>

      {/* ส่วนที่ 1: ตัวชี้วัดทั่วไป (ไม่มีข้อย่อย) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-emerald-900 px-1">📌 ตัวชี้วัดทั่วไป (ไม่มีข้อย่อย)</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200 font-bold">
                  <th className="p-4 w-[35%]">ตัวชี้วัด (KPI)</th>
                  <th className="p-4 text-center">GOAL</th>
                  {years.map((year) => (
                    <th key={year} className="p-4 text-center">{year}</th>
                  ))}
                  <th className="p-4 text-center">TREND (3 ปี)</th>
                  <th className="p-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {singleKpis.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-400">ไม่พบข้อมูลตัวชี้วัดที่ไม่มีข้อย่อย</td>
                  </tr>
                ) : (
                  singleKpis.map((kpi, index) => (
                    <tr key={kpi.id || index} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-4 font-semibold text-gray-900">{kpi.name}</td>
                      <td className="p-4 text-center font-bold text-emerald-800">{kpi.target_value ?? '-'}</td>
                      {years.map((year) => {
                        const yearVal = calculateYearValue(kpi, year);
                        return (
                          <td key={year} className="p-4 text-center text-gray-500">
                            {yearVal !== null ? (
                              <span className="font-bold text-emerald-700">{yearVal}</span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">ไม่มีข้อมูล</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center">
                        {calculateTrend(kpi)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedKpi(kpi)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm uppercase tracking-wider cursor-pointer"
                        >
                          เพิ่ม
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2: ตัวชี้วัดที่มีข้อย่อย */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-emerald-900 px-1">📂 ตัวชี้วัดที่มีข้อย่อย (มีหัวข้อลูก)</h2>
        {parentKpis.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center text-gray-400 border border-emerald-100 text-sm">
            ไม่พบข้อมูลตัวชี้วัดที่มีข้อย่อย
          </div>
        ) : (
          parentKpis.map((parent, pIndex) => (
            <div key={parent.id || pIndex} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
              <div className="bg-emerald-800 text-white px-6 py-3 flex justify-between items-center">
                <h3 className="font-bold text-base">{pIndex + 1}. {parent.name}</h3>
                <span className="bg-emerald-700 text-amber-300 text-xs px-3 py-1 rounded-full font-semibold border border-emerald-600">
                  หัวข้อหลัก (RM มีข้อย่อย)
                </span>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200 font-bold">
                      <th className="p-3 w-[35%]">รายการข้อย่อย</th>
                      <th className="p-3 text-center">GOAL</th>
                      {years.map((year) => (
                        <th key={year} className="p-3 text-center">{year}</th>
                      ))}
                      <th className="p-3 text-center">TREND (3 ปี)</th>
                      <th className="p-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {parent.sub_items.map((sub: any, sIndex: number) => (
                      <tr key={sub.id || sIndex} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-3 text-gray-800 font-medium">{sub.name}</td>
                        <td className="p-3 text-center font-bold text-emerald-800">{sub.target_value ?? '-'}</td>
                        {years.map((year) => {
                          const yearVal = calculateYearValue(sub, year);
                          return (
                            <td key={year} className="p-3 text-center text-gray-500">
                              {yearVal !== null ? (
                                <span className="font-bold text-emerald-700">{yearVal}</span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">ไม่มีข้อมูล</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          {calculateTrend(sub)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedKpi(sub)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm uppercase tracking-wider cursor-pointer"
                          >
                            เพิ่ม
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}