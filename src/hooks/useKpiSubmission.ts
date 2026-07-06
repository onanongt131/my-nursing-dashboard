import { saveKpiEntry } from '../lib/kpiService';

export const useKpiSubmission = () => {
  const submitEntry = async (type: string, formData: any) => {
    try {
      let payload;

      // จัดเตรียมข้อมูลพื้นฐานให้ครบถ้วนตาม Schema ตาราง kpi_entries[cite: 1]
      const baseData = {
        kpi_id: formData.kpi_id,
        year: parseInt(formData.year),
        month: formData.month,
      };

      if (type === 'count') {
        payload = { 
          ...baseData, 
          value: Number(formData.value), 
          numerator: null, 
          denominator: null 
        };
      } else {
        // เพิ่มการตรวจสอบค่าป้องกันหารด้วยศูนย์
        const num = Number(formData.numerator);
        const den = Number(formData.denominator);
        const calculatedValue = den !== 0 ? (num / den) * 100 : 0;

        payload = { 
          ...baseData, 
          value: parseFloat(calculatedValue.toFixed(2)), // เก็บค่าทศนิยม 2 ตำแหน่ง
          numerator: num, 
          denominator: den 
        };
      }

      return await saveKpiEntry(payload);
    } catch (error) {
      console.error("Error submitting KPI:", error);
      throw error; // ส่งต่อ error ให้ Component จัดการ (เช่น แสดง Alert)
    }
  };

  return { submitEntry };
};