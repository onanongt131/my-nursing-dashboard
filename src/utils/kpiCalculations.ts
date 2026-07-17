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

export const getButtonStyle = (entries: any[], frequency: 'monthly' | 'quarterly' | 'yearly') => {
  // 1. สร้างตารางแปลงเดือนให้ปลอดภัย (กรณีข้อมูลว่าง)
  const monthMap: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };

  // 2. จัดการกรณี entries เป็นค่าว่าง
  if (!entries || entries.length === 0) {
    return "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs transition-all";
  }

  const sorted = [...entries].sort((a, b) => (b.year - a.year) || (monthMap[b.month] - monthMap[a.month]));
  const latest = sorted[0];

  const currentYear = 2026;
  const currentMonth = 7;

  // 3. จัดการรายเดือน
  if (frequency === 'monthly') {
    const latestMonthNum = monthMap[latest.month] || 0;
    const diff = (currentYear - Number(latest.year)) * 12 + (currentMonth - latestMonthNum);

    if (diff <= 1) return "bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded-md text-xs transition-all";
    if (diff === 2) return "bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-xs transition-all";
    return "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs transition-all";
  }

  // 4. จัดการรายไตรมาส
  if (frequency === 'quarterly') {
    const latestQuarter = Math.ceil((monthMap[latest.month] || 0) / 3);
    const currentQuarter = Math.ceil(currentMonth / 3);
    const diffQ = (currentYear - Number(latest.year)) * 4 + (currentQuarter - latestQuarter);
    
    return diffQ <= 1 
      ? "bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded-md text-xs transition-all" 
      : "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs transition-all";
  }

  // 5. จัดการรายปี
  if (frequency === 'yearly') {
    return Number(latest.year) >= currentYear 
      ? "bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded-md text-xs transition-all" 
      : "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs transition-all";
  }

  // **สำคัญ:** ต้องมี return สุดท้ายเสมอ เพื่อป้องกัน build error
  return "bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-xs transition-all";
};