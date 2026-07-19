import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@/utils/supabase/server'; // หรือ client ขึ้นอยู่กับการใช้งาน

interface KpiEntryPayload {
  kpi_id: number;
  department_id: number; // เพิ่มบรรทัดนี้
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
  id: number;
  fiscal_year: number;
  month: number;
  department_id: number;
  nhppd_value: number;
  np_value: number;
  department_name?: string; // เพิ่มบรรทัดนี้
}

export const getProductivityData = async (year: string) => {
  if (!supabase) {
    throw new Error('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน');
  }

  // เพิ่ม .headers({ 'Cache-Control': 'no-cache' }) เพื่อสั่ง Supabase ว่าอย่าใช้ข้อมูลเก่า
  const { data: kpiData, error: kpiError } = await supabase
    .from('nursing_kpi_data')
    .select('*', { count: 'exact', head: false }) // ระบุว่าไม่ต้องใช้ Cache
    .eq('fiscal_year', parseInt(year))
    .order('department_id', { ascending: true })
    .order('month', { ascending: true });

  if (kpiError) {
    console.error("Supabase Error (KPI):", kpiError);
    throw new Error(`ดึงข้อมูล KPI ไม่สำเร็จ: ${kpiError.message}`);
  }

  // 2. ดึงชื่อหน่วยงานทั้งหมดมาเก็บไว้ (เพื่อให้แสดงผลได้)
  const { data: deptData, error: deptError } = await supabase
    .from('departments')
    .select('id, Department'); // ดึง id และชื่อคอลัมน์ Department ให้ตรงกับฐานข้อมูล

  if (deptError) {
    console.error("Supabase Error (Dept):", deptError);
    // ไม่ throw error ที่นี่ เพื่อให้หน้าเว็บยังทำงานได้แม้ดึงชื่อหน่วยงานไม่ได้
  }

  // 3. เชื่อมข้อมูล (Client-side Join)
  const combinedData = kpiData?.map((kpi) => {
    // หาชื่อหน่วยงานจาก id ที่ตรงกัน
    const dept = deptData?.find((d) => d.id === kpi.department_id);
    return {
      ...kpi,
      department_name: dept ? dept.Department : 'ไม่ระบุหน่วยงาน'
    };
  });

  return combinedData;
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

