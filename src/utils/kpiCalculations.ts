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