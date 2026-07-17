// src/utils/kpiCalculations.ts

// 1. ฟังก์ชันคำนวณค่าจากข้อมูลดิบราย Record
export const calculateEntryValue = (entry: any, kpiType: string) => {
  if (!entry) return 0;
  
  if (kpiType === 'percent') {
    return entry.denominator > 0 
      ? Number(((entry.numerator / entry.denominator) * 100).toFixed(2)) 
      : 0;
  }
  
  // สำหรับ count ให้ใช้ numerator เป็นตัวแทนของค่าที่นับได้
  return Number(entry.numerator) || 0;
};

// 2. ฟังก์ชันคำนวณค่าเฉลี่ยหรือผลรวมสำหรับ Dashboard Summary
export const calculateSummary = (entries: any[], kpiType: string) => {
  if (!entries || entries.length === 0) return 0;

  if (kpiType === 'percent') {
    const totalPercent = entries.reduce((acc, curr) => acc + calculateEntryValue(curr, 'percent'), 0);
    return (totalPercent / entries.length).toFixed(2);
  } else {
    return entries.reduce((acc, curr) => acc + (Number(curr.numerator) || 0), 0);
  }
};

// 3. ปรับปรุงฟังก์ชันเช็คสถานะให้รองรับทั้ง percent และ count
export const checkKpiStatus = (entry: any, target: number, kpiType: string) => {
  if (!entry) return false;
  const currentValue = calculateEntryValue(entry, kpiType);
  return currentValue >= target;
};

// utils/kpiCalculations.ts

// utils/kpiCalculations.ts

export const getKpiStatus = (entries: any[]) => {
  if (!entries || entries.length === 0) return 'default';

  // 1. สร้าง Map สำหรับแปลงชื่อเดือนเป็นตัวเลข
  const monthMap: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };

  // 2. เรียงลำดับ entries ให้ค่าล่าสุดอยู่บนสุดเสมอ (ปีมาก่อน, เดือนมาก่อน)
  const sortedEntries = [...entries].sort((a, b) => {
    const yearDiff = b.year - a.year;
    if (yearDiff !== 0) return yearDiff;
    return monthMap[b.month] - monthMap[a.month];
  });

  const latestEntry = sortedEntries[0];
  
  // 3. คำนวณความต่างจากปัจจุบัน (กรกฎาคม 2569 คือปี 2569 เดือน 7)
  const currentYear = 2569;
  const currentMonth = 7;
  
  const diffMonths = (currentYear - latestEntry.year) * 12 + (currentMonth - monthMap[latestEntry.month]);

  // 4. คืนค่าสถานะตามความต่าง
  if (diffMonths >= 2) return 'alert';      // เกิน 2 เดือนขึ้นไป = แดง
  if (diffMonths === 1) return 'completed'; // เดือนล่าสุดคือเดือนที่แล้ว = ม่วงอ่อน
  return 'default';                         // ถ้าเป็นเดือนปัจจุบัน = ม่วงเข้ม
};

export const getButtonStyle = (entries: any[]) => {
  if (!entries || entries.length === 0) return "bg-purple-600 hover:bg-purple-700";

  const monthMap: Record<string, number> = { 
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6 // เพิ่มตัวพิมพ์เล็กกันพลาด
  };
  
  // เรียงข้อมูล
  const sorted = [...entries].sort((a, b) => {
    // แปลง month เป็นตัวเลขก่อนเทียบ
    const monthA = monthMap[a.month] || Number(a.month) || 0;
    const monthB = monthMap[b.month] || Number(b.month) || 0;
    return (b.year - a.year) || (monthB - monthA);
  });

  const latest = sorted[0];
  
  const now = new Date();
  const currentYear = now.getFullYear() + 543;
  const currentMonth = now.getMonth() + 1;

  const latestYear = Number(latest.year);
  const latestMonthNum = monthMap[latest.month] || Number(latest.month) || 0;
  
  const diff = (currentYear - latestYear) * 12 + (currentMonth - latestMonthNum);

  // DEBUG: ดูค่าที่คำนวณได้ใน Console (F12)
  console.log("Latest:", latest.month, latestMonthNum, "Diff:", diff);

  if (diff === 1) return "bg-purple-300 hover:bg-purple-400"; // มิถุนายน (diff = 7 - 6 = 1)
  if (diff >= 2) return "bg-red-600 hover:bg-red-700";
  return "bg-purple-600 hover:bg-purple-700";
};