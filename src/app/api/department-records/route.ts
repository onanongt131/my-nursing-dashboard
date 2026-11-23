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

// ตรวจว่า "ส่งข้อมูลเดือนที่ระบุแล้วหรือยัง" บนเซิร์ฟเวอร์ ตรรกะเดียวกับ hasSubmittedPreviousMonth() เดิมฝั่งหน้าเว็บ
// แต่ส่งกลับแค่ true/false แทนการส่งทุกแถวของ 11 ตารางไปให้เบราว์เซอร์
const MONTH_COLUMNS = ['audit_month', 'month', 'incident_date', 'admit_date'] as const;

function rowMonth(row: Record<string, any>): string {
  const raw = row.audit_month || row.month || (typeof row.incident_date === 'string' ? row.incident_date.substring(0, 7) : '') ||
    (typeof row.admit_date === 'string' ? row.admit_date.substring(0, 7) : '') || '';
  return typeof raw === 'string' ? raw : String(raw || '');
}

async function hasSubmitted(table: typeof tables[number], departmentId: number, month: string, thaiMonth: string) {
  // อ่าน 1 แถวเพื่อดูว่าตารางนี้มีคอลัมน์เดือนแบบไหน แล้วค่อย select เฉพาะคอลัมน์นั้น (ไม่ดึง '*')
  const probe = await db().from(table).select('*').eq('department_id', departmentId).limit(1);
  if (probe.error) throw probe.error;
  if (!probe.data?.length) return false;
  const columns = MONTH_COLUMNS.filter(c => c in probe.data[0]);
  if (!columns.length) return false;
  // เรียงจากแถวใหม่สุด เจอแล้วหยุดทันที ส่วนใหญ่จบในหน้าแรก
  for (let offset = 0; offset <= 1000000; offset += pageSize) {
    const { data, error } = await db().from(table).select(columns.join(','))
      .eq('department_id', departmentId).order('id', { ascending: false }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as unknown as Record<string, any>[];
    if (rows.some(r => { const m = rowMonth(r); return m.includes(month) || m.includes(thaiMonth); })) return true;
    if (rows.length < pageSize) return false;
  }
  return false;
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
      !['', 'context', 'pending-count', 'pending-batch', 'monthly-status'].includes(mode) ||
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

    if (mode === 'pending-count') {
      // Aggregate in PostgreSQL: one small response, no patient rows transferred.
      // The RPC must be installed using the included SQL migration first.
      const { data, error } = await db().rpc('nso_pending_review_counts', {
        p_department_id: departmentId,
      });
      if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
        return fail('อ่านยอดรายการรออนุมัติไม่สำเร็จ กรุณาตรวจสอบ SQL RPC', 503);
      }
      const payload = data as { total?: unknown; counts?: unknown };
      if (!Number.isSafeInteger(payload.total) || Number(payload.total) < 0 ||
          !Array.isArray(payload.counts)) {
        return fail('รูปแบบยอดรออนุมัติไม่ถูกต้อง', 503);
      }
      return Response.json({ total: payload.total, counts: payload.counts }, { headers: noStore });
    }

    if (mode === 'monthly-status') {
      // month = เดือนที่แล้วตามเวลาเครื่องผู้ใช้ (YYYY-MM ค.ศ.) ส่งมาจากหน้าเว็บเพื่อให้ผลเหมือนเดิม
      const month = q.get('month') || '';
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail('เดือนไม่ถูกต้อง');
      const thaiMonth = `${Number(month.slice(0, 4)) + 543}${month.slice(4)}`;
      const results = await Promise.all(tables.map(async t => {
        try { return { table: t, submitted: await hasSubmitted(t, departmentId, month, thaiMonth), error: '' }; }
        catch { return { table: t, submitted: null, error: `อ่านสถานะจาก ${t} ไม่สำเร็จ` }; }
      }));
      return Response.json({ results }, { headers: noStore });
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
