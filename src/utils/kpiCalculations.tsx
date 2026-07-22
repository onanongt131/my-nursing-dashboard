// src/utils/kpiCalculations.ts
import { ReactNode } from 'react';

export type KpiType = 'percent' | 'rate' | 'count';

// --- 1. กลุ่มคำนวณค่าพื้นฐาน ---
export const calculateEntryValue = (entry: any, kpiType: KpiType): number => {
  if (!entry) return 0;

  // 1. ถ้าเป็น Percent หรือ Rate ที่มีสูตร (มี numerator/denominator) ให้คำนวณตามสูตร
  if (kpiType === 'percent' && entry.numerator != null && entry.denominator > 0) {
    return Number(((entry.numerator / entry.denominator) * 100).toFixed(2));
  }
  if (kpiType === 'rate' && entry.numerator != null && entry.denominator > 0) {
    return Number(((entry.numerator / entry.denominator) * 1000).toFixed(2));
  }

  // 2. ถ้าไม่มีค่า numerator หรือเป็นประเภท count ให้ดึงจาก column 'value' เป็นลำดับแรก
  // หาก column 'value' ไม่มี (เป็น null/undefined) ให้ไปใช้ numerator
  const finalValue = entry.value != null ? entry.value : entry.numerator;
  
  return Number(finalValue) || 0;
};

export const calculateYearlyAverage = (entries: any[], year: number, type: KpiType): string => {
  const yearlyEntries = entries.filter(e => e.year === year);
  if (yearlyEntries.length === 0) return "-";
  const sum = yearlyEntries.reduce((acc, curr) => acc + calculateEntryValue(curr, type), 0);
  const avg = sum / yearlyEntries.length;
  return avg.toFixed(2);
};
  

// --- 2. กลุ่มจัดการสถานะและการแสดงผล ---
export const checkStatus = (value: number, target: number, operator: string, isHigherBetter: boolean = true): boolean => {
  // หากเป็นตัวชี้วัดที่ค่าต่ำคือดี (เช่น อุบัติการณ์) ให้กลับผลลัพธ์
  const passed = (() => {
    switch (operator) {
      case '>': return value > target;
      case '>=': return value >= target;
      case '<': return value < target;
      case '<=': return value <= target;
      default: return value >= target;
    }
  })();
  
  return isHigherBetter ? passed : !passed;
};

// ฟังก์ชัน Trend ที่ปรับปรุงตามความต้องการของคุณ
export const getYearlyTrend = (entries: any[], kpiType: KpiType, currentYear: number = 2569): ReactNode => {
  const prevYear = currentYear - 1;
  const avgCurrent = calculateYearlyAverage(entries, currentYear, kpiType);
  const avgPrev = calculateYearlyAverage(entries, prevYear, kpiType);

  if (avgCurrent === "-" || avgPrev === "-") return "-";

  const valCurrent = parseFloat(avgCurrent);
  const valPrev = parseFloat(avgPrev);

  if (valCurrent > valPrev) return <span className="text-green-500 font-bold text-sm">▲</span>;
  if (valCurrent < valPrev) return <span className="text-red-500 font-bold text-sm">▼</span>;
  return <span className="text-blue-500 font-bold text-xl">○</span>;
};

// --- 3. กลุ่มจัดการสถานะปุ่ม (Alert/Status) ---
const monthMap: Record<string, number> = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
  'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
};

export const getButtonStyle = (entries: any[], frequency: 'monthly' | 'quarterly' | 'yearly'): string => {
  if (!entries || entries.length === 0) return "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm";
  
  const sorted = [...entries].sort((a, b) => (b.year - a.year) || (monthMap[b.month] - monthMap[a.month]));
  const latest = sorted[0];
  const currentYear = 2569;
  const currentMonth = 7;

  if (frequency === 'monthly') {
    const diff = (currentYear - Number(latest.year)) * 12 + (currentMonth - (monthMap[latest.month] || 1));
    if (diff <= 1) return "bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm";
    if (diff === 2) return "bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm";
    return "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm";
  }

  if (frequency === 'quarterly') {
    const diffQ = (currentYear - Number(latest.year)) * 4 + (Math.ceil(currentMonth / 3) - Math.ceil((monthMap[latest.month] || 1) / 3));
    return diffQ <= 1 ? "bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm" : "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm";
  }

  return Number(latest.year) >= currentYear 
    ? "bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm" 
    : "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition-all shadow-sm";
};
