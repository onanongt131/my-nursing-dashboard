import { supabase } from '@/lib/supabaseClient';

interface KpiEntryPayload {
  kpi_id: number;
  year: number;
  month: string;
  value: number;
  numerator?: number | null;
  denominator?: number | null;
}

export const saveKpiEntry = async (payload: KpiEntryPayload) => {
  // 1. ด่านตรวจ: ตรวจสอบว่า supabase พร้อมใช้งานหรือไม่
  if (!supabase) {
    throw new Error('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน (Supabase client not initialized)');
  }

  // 2. ตรวจสอบข้อมูลเบื้องต้นก่อนส่ง (Basic Validation)
  if (!payload.kpi_id || !payload.year || !payload.month) {
    throw new Error('ข้อมูลไม่ครบถ้วน: กรุณาระบุ KPI ID, ปี และเดือน');
  }

  // 3. ส่งข้อมูลไปยัง Supabase
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
    .select();

  // 4. จัดการ Error
  if (error) {
    console.error("Supabase Error:", error);
    throw new Error(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);
  }

  return data;
};