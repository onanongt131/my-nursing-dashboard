export const processDataForChart = (rawData: any[], kpiType: string) => {
  // 1. Guard Clauses: ตรวจสอบข้อมูลก่อนประมวลผล เพื่อป้องกัน Error
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  // 2. ปรับ type ให้เป็นตัวพิมพ์เล็กเสมอ เพื่อป้องกันปัญหา 'Percent' vs 'percent'
  const type = kpiType?.toLowerCase();

  // 3. จัดกลุ่มข้อมูลตามปี
  const groupedByYear = rawData.reduce((acc, item) => {
    const year = item.year;
    if (!year) return acc; // ข้ามรายการที่ไม่มีปี

    if (!acc[year]) {
      acc[year] = { sum: 0, count: 0 };
    }
    
    // รวมค่า (แปลงเป็นตัวเลขเพื่อความแม่นยำ)
    acc[year].sum += (Number(item.value) || 0);
    acc[year].count += 1;
    return acc;
  }, {} as Record<string | number, { sum: number; count: number }>);

  // 4. คำนวณค่าตามประเภท (percent = เฉลี่ย, count/อื่นๆ = ผลรวม)
  return Object.keys(groupedByYear)
    .map((year) => {
      const { sum, count } = groupedByYear[year];
      const value = (type === 'percent') ? (sum / count) : sum;
      
      return {
        year: Number(year), // เปลี่ยนปีให้เป็น Number เพื่อให้เรียงลำดับได้ถูกต้อง
        value: parseFloat(value.toFixed(2))
      };
    })
    .sort((a, b) => a.year - b.year); // เรียงลำดับปีจากน้อยไปมากอย่างปลอดภัย
};