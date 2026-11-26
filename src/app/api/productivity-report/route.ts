import { NextRequest, NextResponse } from 'next/server';
import { currentUser, db, fail } from '@/lib/audits/chartServer';
import { monthlyProductivity, productivityCompleteness, type DailyProductivity } from '@/lib/productivityReport';

import {NP_REPORT_START, NP_REPORT_END} from '@/lib/monthlyNpRoster';

export const dynamic = 'force-dynamic';

// Aggregate report only. All approved signed-in roles may read every department.
// No patient identifiers, staffing names, or mutations are exposed here.
export async function GET(request: NextRequest) {
  try {
    if (!await currentUser()) return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ', 401);
    const value = request.nextUrl.searchParams.get('fiscal_year') || '';
    if (!/^25\d{2}$/.test(value) || Number(value) > 2570) return fail('ปีงบประมาณไม่ถูกต้อง');
    const year = Number(value);
    const client = db();
    const rows: Record<string, any>[] = [];
    // Page every source; Supabase's default row limit must not truncate a fiscal year.
    for (let offset = 0; ; offset += 1000) {
      let query = year === 2570
        ? client.from('daily_staffing').select('id,department_id,date,shift,np').gte('date', NP_REPORT_START).lt('date', NP_REPORT_END)
        : client.from('nursing_kpi_data').select('id,fiscal_year,month,department_id,nhppd_value,np_value').eq('fiscal_year', year);
      const { data, error } = await query.order('id').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if ((data || []).length < 1000) break;
    }
    const departments: Record<string, string> = {};
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('departments').select('id,Department').order('id').range(offset, offset + 999);
      if (error) throw error;
      for (const department of data || []) departments[String(department.id)] = department.Department;
      if ((data || []).length < 1000) break;
    }
    const values = year === 2570 ? productivityCompleteness(rows as DailyProductivity[], monthlyProductivity(rows as DailyProductivity[])) : rows;
    const items = values.map(row => ({
      ...row,
      np_value: row.np_value == null ? null : Number(row.np_value),
      department_name: departments[String(row.department_id)] || `หน่วยงาน ${row.department_id}`,
    }));
    return NextResponse.json({ items, source: year === 2570 ? 'monthly-statistics' : 'nursing_kpi_data' }, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    console.error('Productivity report read failed', {code: (error as {code?: string})?.code || 'configuration'});
    return fail('อ่านข้อมูล Productivity ไม่สำเร็จ กรุณาตรวจการตั้งค่า Supabase ฝั่งเซิร์ฟเวอร์และสิทธิ์อ่านตาราง', 500);
  }
}
