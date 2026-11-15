import { NextRequest } from 'next/server';
import { currentUser, canRead, canApprove, db, fail, unexpected } from '@/lib/audits/chartServer';

export const dynamic = 'force-dynamic';

const tables = [
  'nursing_chart_audits',
  'wp_qa_records',
  'nso_special_wp_records',
  'iv_care_complications',
  'iv_care_monthly_summaries',
  'fall_incident_records',
  'fall_monthly_summary',
  'readmit_incident_records',
  'readmit_monthly_summary',
  'ama_incident_records',
  'ama_monthly_summary',
] as const;

const noStore = { 'Cache-Control': 'no-store' };
const pageSize = 1000;

// โหลดเฉพาะสถานะ pending โดยเก็บทุกหน้า และคง fallback เดิมสำหรับตาราง summary รุ่นเก่า
async function readPendingTable(table: typeof tables[number], departmentId: number) {
  const items: any[] = [];
  try {
    for (let offset = 0; offset <= 1000000; offset += pageSize) {
      const { data, error } = await db()
        .from(table)
        .select('*')
        .eq('department_id', departmentId)
        .eq('status', 'pending')
        .order('id')
        .range(offset, offset + pageSize - 1);

      if (error) {
        // บางตาราง summary เดิมไม่มีคอลัมน์ status: รักษาพฤติกรรมเดิม
        if (
          table.endsWith('_summary') &&
          error.code === '42703' &&
          /status/i.test(error.message || '')
        ) {
          return { table, items: [], error: '', legacySummaryWithoutStatus: true };
        }
        return { table, items: null, error: `อ่านรายการรออนุมัติจาก ${table} ไม่สำเร็จ` };
      }
      if (!Array.isArray(data)) {
        return { table, items: null, error: `ข้อมูล ${table} ไม่ถูกต้อง` };
      }

      items.push(...data);
      if (data.length < pageSize) return { table, items, error: '' };
    }
    return { table, items: null, error: `ข้อมูล ${table} มากเกินขอบเขตที่รองรับ` };
  } catch {
    return { table, items: null, error: `อ่านรายการรออนุมัติจาก ${table} ไม่สำเร็จ` };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ', 401);

    const q = request.nextUrl.searchParams;
    const departmentId = Number(q.get('department_id'));
    const mode = q.get('mode') || '';
    const table = q.get('table') || '';
    const offset = Number(q.get('offset') || 0);

    if (
      !Number.isSafeInteger(departmentId) || departmentId < 1 ||
      !['', 'context', 'pending-batch'].includes(mode) ||
      (mode === '' && !tables.includes(table as typeof tables[number])) ||
      !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000
    ) return fail('คำขออ่านรายการไม่ถูกต้อง');

    if (!await canRead(user, departmentId)) return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้', 403);

    if (mode === 'context') {
      return Response.json(
        { role: user.role, departmentId: user.departmentId, canApprove: canApprove(user, departmentId) },
        { headers: noStore },
      );
    }

    if (mode === 'pending-batch') {
      // ตรวจสิทธิ์เพียงครั้งต่อหนึ่งคำขอ แต่ยังอ่านทั้ง 11 ตารางให้ข้อมูลอนุมัติครบ
      const results = await Promise.all(tables.map(t => readPendingTable(t, departmentId)));
      return Response.json({ results }, { headers: noStore });
    }

    // เส้นทางอ่านข้อมูลรายเดือนแบบเดิมไม่เปลี่ยน เพื่อไม่กระทบ Audit/IV/Fall/Readmit/AMA
    let query = db()
      .from(table)
      .select('*')
      .eq('department_id', departmentId)
      .order('id')
      .range(offset, offset + pageSize - 1);

    if (q.get('pending') === 'true') query = query.eq('status', 'pending');
    const { data, error } = await query;
    if (
      error && q.get('pending') === 'true' && table.endsWith('_summary') &&
      error.code === '42703' && /status/i.test(error.message || '')
    ) {
      return Response.json({ items: [], hasMore: false, legacySummaryWithoutStatus: true }, { headers: noStore });
    }
    if (error || !Array.isArray(data)) {
      return fail('อ่านตาราง ' + table + ' ไม่สำเร็จ ยังยืนยันยอดรายการไม่ได้', 503);
    }
    return Response.json({ items: data, hasMore: data.length === pageSize }, { headers: noStore });
  } catch (e) {
    return unexpected(e);
  }
}
