import { canCreate, canRead, currentUser, db, fail, isRecord, unexpected, validDate, validDept } from '@/lib/audits/chartServer';
import { isDialysisDepartment } from '@/lib/dialysisServer';
import { dialysisFields } from '@/lib/dialysisStats';
import { InputError, monthScope } from '@/lib/unitRecords/validation';

export const dynamic = 'force-dynamic';

async function handle(request: Request, write: boolean) {
  try {
    if (write && request.headers.get('origin') !== new URL(request.url).origin) return fail('แหล่งที่มาคำขอไม่ถูกต้อง', 403);
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const query = new URL(request.url).searchParams;
    const id = Number(query.get('department_id'));
    if (!validDept(id) || !(write ? canCreate(user, id) : await canRead(user, id))) return fail('ไม่มีสิทธิ์เข้าถึงหน่วยงานนี้', 403);
    if (!await isDialysisDepartment(id)) return fail('ใช้เฉพาะหน่วยไตเทียม', 403);
    const scope = monthScope(query.get('month'));
    const client = db();
    const { data: holidays, error: holidayError } = await client.from('staffing_holidays').select('holiday_date')
      .eq('active', true).or('department_id.is.null,department_id.eq.' + id)
      .gte('holiday_date', scope.start).lt('holiday_date', scope.end);
    if (holidayError) throw holidayError;
    const closed = new Set(holidays.map(row => row.holiday_date));
    const dates: string[] = [];
    for (const day = new Date(scope.start); day.toISOString().slice(0, 10) < scope.end; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10);
      if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6 && !closed.has(date)) dates.push(date);
    }
    if (write) {
      const body: unknown = await request.json().catch(() => null);
      if (!isRecord(body) || !validDate(body.date) || !dates.includes(String(body.date))) return fail('บันทึกได้เฉพาะวันราชการในเดือนที่เลือก');
      const values: Record<string, unknown> = { department_id: id, date: body.date };
      for (const [key, label] of dialysisFields) {
        const value = body[key];
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1000000) return fail('กรุณากรอก ' + label + ' เป็นจำนวนเต็มตั้งแต่ 0');
        values[key] = value;
      }
      const { error } = await client.from('dialysis_daily_stats').upsert(values, { onConflict: 'department_id,date' });
      if (error) throw error;
      return Response.json({ saved: true });
    }
    const { data, error } = await client.from('dialysis_daily_stats').select('*').eq('department_id', id)
      .gte('date', scope.start).lt('date', scope.end);
    if (error) throw error;
    return Response.json({ dates, rows: data.filter(row => dates.includes(row.date)), editable: canCreate(user, id) });
  } catch (error) {
    return error instanceof InputError ? fail(error.message) : unexpected(error);
  }
}

export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
