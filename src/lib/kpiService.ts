import { supabase } from '@/lib/supabaseClient';

// กำหนด Type ของข้อมูลเพื่อความเป็นระเบียบ (TypeScript)
interface KpiEntryPayload {
  kpi_id: number;
  year: number;
  month: string;
  value: number;
  numerator?: number | null;
  denominator?: number | null;
}

/**
 * ฟังก์ชันบันทึกข้อมูลตัวชี้วัด
 * ได้รับการปรับปรุงให้รองรับทั้งแบบจำนวน (Count) และร้อยละ (Percent)
 */
export const saveKpiEntry = async (payload: KpiEntryPayload) => {
  // 1. ตรวจสอบข้อมูลเบื้องต้นก่อนส่ง (Basic Validation)
  if (!payload.kpi_id || !payload.year || !payload.month) {
    throw new Error('ข้อมูลไม่ครบถ้วน: กรุณาระบุ KPI ID, ปี และเดือน');
  }

  // 2. ส่งข้อมูลไปยัง Supabase
  const { data, error } = await supabase
    .from('kpi_entries')
    .insert([
      {
        kpi_id: payload.kpi_id,
        year: payload.year,
        month: payload.month,
        value: payload.value,
        numerator: payload.numerator,
        denominator: payload.denominator,
      }
    ])
    .select(); // เพิ่ม .select() เพื่อให้ได้ข้อมูลที่บันทึกกลับมาตรวจสอบ

  // 3. จัดการ Error
  if (error) {
    console.error("Supabase Error:", error);
    throw new Error(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);
  }

  return data;
};