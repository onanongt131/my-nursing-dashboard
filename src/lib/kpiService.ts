import { createClient } from '@/utils/supabase/client';

interface KpiEntryPayload {
  kpi_id: number;
  department_id: number; // เพิ่มบรรทัดนี้
  year: number;
  month: string;
  value: number;
  numerator?: number | null;
  denominator?: number | null;
}

const supabase = createClient();

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
        department_id: payload.department_id,
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

export interface ProductivityEntry {
    department_group?: string;
    group_order?: number;
    department_order?: number;
  id: number;
  fiscal_year: number;
  month: number;
  department_id: number;
  nhppd_value: number;
  np_value: number;
  department_name?: string;
  completeness?: import('./productivityReport').NpCompleteness;
}

export const getProductivityData = async (year: string) => {
  const response = await fetch('/api/productivity-report?' + new URLSearchParams({ fiscal_year: year }), {
    cache: 'no-store', credentials: 'same-origin',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(body?.items)) {
    throw new Error(body?.error || 'อ่านข้อมูล Productivity ไม่สำเร็จ');
  }
  return body.items;

};

export const upsertProductivityData = async (newDataArray: any[]) => {
  const { data, error } = await supabase
    .from('nursing_kpi_data')
    .upsert(newDataArray, {
      // ระบุคอลัมน์ที่เป็น Unique เพื่อบอก Supabase ว่าถ้าปี/เดือน/หน่วยงานตรงกัน ให้ "อัปเดต"
      onConflict: 'fiscal_year, month, department_id' 
    });

  if (error) {
    console.error("Upsert Error:", error);
    throw error;
  }
  return data;
};

