import { saveKpiEntry } from '../lib/kpiService'; // ตรวจสอบ Path ให้ถูกต้องตามโครงสร้างโปรเจกต์ของคุณ

export const useKpiSubmission = () => {
  const submitEntry = async (kpiId: string, formData: any) => { // ปรับรับค่าเป็น formData
    try {
      // ไม่ต้องประกาศ payload ข้างนอกแล้ว เพราะเราส่งมาให้ครบจาก AddEntryForm แล้ว
      // ให้ส่ง formData ไปยัง saveKpiEntry ตรงๆ ได้เลย
      return await saveKpiEntry(formData);
    } catch (error) {
      console.error("Error submitting KPI:", error);
      throw error;
    }
  };
  return { submitEntry };
};