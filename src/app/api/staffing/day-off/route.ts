import { canRead, currentUser, db, fail, isRecord, validDate, validDept } from '@/lib/audits/chartServer';

export const dynamic = 'force-dynamic';
const columns = 'id,department_id,staff_id,request_date,request_type,requested_shift,status,note,created_at,updated_at';
const ruleColumns = 'id,start_date,end_date,max_nurse_off_per_day,max_pn_off_per_day,max_na_off_per_day,max_employee_off_per_day,active';
const day = 86400000;
const stamp = (date: string) => Date.parse(date + 'T00:00:00Z');
const dateString = (value: number) => new Date(value).toISOString().slice(0, 10);

function group(position: string | null | undefined) {
  const normalized = position?.trim().toUpperCase();
  if (normalized === 'RN' || normalized === 'HW' || normalized === 'TN') return 'nurse';
  if (normalized === 'PN') return 'pn';
  if (normalized === 'NA') return 'na';
  return 'employee';
}

function rulesFor(client: ReturnType<typeof db>, department: number, start: string, end: string) {
  return client.from('day_off_capacity_rules').select(ruleColumns)
    .eq('department_id', department).eq('active', true).lte('start_date', end)
    .gte('end_date', start).order('start_date', { ascending: false }).order('id');
}

function requestsFor(client: ReturnType<typeof db>, department: number) {
  return client.from('staff_requests').select(columns).eq('department_id', department).eq('request_type', 'OFF');
}

async function readRequests(client: ReturnType<typeof db>, department: number, start: string, end: string) {
  const records = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await requestsFor(client, department).gte('request_date', start)
      .lte('request_date', end).order('request_date').order('id').range(offset, offset + 499);
    if (error) throw error;
    records.push(...data);
    if (data.length < 500) return records;
  }
}

function unavailable(error: unknown) {
  console.error('Day-off API failed', isRecord(error) ? error.code : undefined);
  return fail('ดำเนินการคำขอหยุดไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ', 503);
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const params = new URL(request.url).searchParams;
    const department = Number(params.get('department_id'));
    const start = params.get('start');
    const end = params.get('end');
    if (!validDept(department) || !start || !end || !validDate(start) || !validDate(end) ||
        end < start || stamp(end) - stamp(start) >= 31 * day) return fail('หน่วยงานหรือช่วงวันที่ไม่ถูกต้อง');
    if (!await canRead(user, department)) return fail('ไม่มีสิทธิ์อ่านหน่วยงานนี้', 403);

    const client = db();
    const [records, rules] = await Promise.all([
      readRequests(client, department, start, end),
      rulesFor(client, department, start, end),
    ]);
    if (rules.error) throw rules.error;
    return Response.json({ records, rules: rules.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return unavailable(error);
  }
}

async function capacityConflict(client: ReturnType<typeof db>, department: number, staffId: number, dates: string[]) {
  const start = dates[0], end = dates[dates.length - 1];
  const [rules, staff, requests] = await Promise.all([
    rulesFor(client, department, start, end),
    client.from('staff').select('id,position,active').eq('department_id', department),
    readRequests(client, department, start, end),
  ]);
  if (rules.error) throw rules.error;
  if (staff.error) throw staff.error;
  const target = staff.data.find(person => Number(person.id) === staffId && person.active === true);
  if (!target?.position) return fail('บุคลากรที่เลือกไม่อยู่ในรายชื่อที่ใช้งานของหน่วยงานนี้');
  const targetGroup = group(target.position);
  const positions = new Map(staff.data.map(person => [Number(person.id), person.position]));
  const fullDates = dates.filter(date => {
    const rule = rules.data.find(item => date >= item.start_date && date <= item.end_date);
    const maximum = rule?.[`max_${targetGroup}_off_per_day`] ?? (targetGroup === 'nurse' ? 2 : 1);
    const others = new Set(requests.filter(item => item.request_date === date &&
      Number(item.staff_id) !== staffId && (item.status === 'pending' || item.status === 'approved') &&
      group(positions.get(Number(item.staff_id))) === targetGroup).map(item => String(item.staff_id)));
    return others.size + 1 > maximum;
  });
  if (fullDates.length) return fail('วันที่ปิดรับหรือจำนวนผู้ขอหยุดเต็มแล้ว ' + fullDates.join(', '), 409);
  return null;
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return fail('คำขอไม่ถูกต้อง', 403);
    const user = await currentUser();
    if (!user) return fail('กรุณาเข้าสู่ระบบ', 401);
    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body) || !validDept(body.department_id)) return fail('ข้อมูลคำขอไม่ถูกต้อง');
    const department = body.department_id;
    const client = db();

    if (body.action === 'create') {
      if (!user.departmentId || (user.role !== 'admin' && user.departmentId !== department)) {
        return fail('ไม่มีสิทธิ์เพิ่มคำขอหยุดของหน่วยงานนี้', 403);
      }
      const { staff_id: staffId, start, end } = body;
      if (!validDept(staffId) || typeof start !== 'string' || typeof end !== 'string' ||
          !validDate(start) || !validDate(end) || end < start || stamp(end) - stamp(start) >= 366 * day) {
        return fail('บุคลากรหรือช่วงวันที่ไม่ถูกต้อง');
      }
      if (user.role === 'staff') {
        const now = new Date(Date.now() + 7 * 3600000);
        const nextMonth = dateString(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).slice(0, 7);
        if (now.getUTCDate() > 10 || !start.startsWith(nextMonth) || !end.startsWith(nextMonth)) {
          return fail('ยื่นคำขอหยุดเดือนถัดไปได้เฉพาะวันที่ 1–10 ของเดือนปัจจุบัน');
        }
      }

      const dates = Array.from({ length: (stamp(end) - stamp(start)) / day + 1 }, (_, i) => dateString(stamp(start) + i * day));
      const conflict = await capacityConflict(client, department, staffId, dates);
      if (conflict) return conflict;
      const records = dates.map(request_date => ({
        department_id: department, staff_id: staffId, request_date, request_type: 'OFF',
        requested_shift: null, status: 'pending', note: typeof body.note === 'string' ? body.note.trim() || null : null,
        updated_at: new Date().toISOString(),
      }));
      // Repeated submissions must never reset an approved request or overwrite another request type.
      const { data, error } = await client.from('staff_requests').upsert(records, {
        onConflict: 'staff_id,request_date', ignoreDuplicates: true,
      }).select('id');
      if (error) throw error;
      return Response.json({ saved: data.length, existing: records.length - data.length });
    }

    if (user.role !== 'admin' && !(user.role === 'head_department' && user.departmentId === department)) {
      return fail('ไม่มีสิทธิ์จัดการคำขอหยุดของหน่วยงานนี้', 403);
    }
    if (!validDept(body.id)) return fail('รายการคำขอไม่ถูกต้อง');
    const id = body.id;
    if (body.action === 'delete') {
      const { data, error } = await client.from('staff_requests').delete()
        .eq('department_id', department).eq('request_type', 'OFF').eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      return data ? Response.json({ saved: 1 }) : fail('ไม่พบคำขอหยุด', 404);
    }
    if (body.action !== 'status' || (body.status !== 'approved' && body.status !== 'rejected')) {
      return fail('สถานะคำขอไม่ถูกต้อง');
    }

    const { data: record, error: readError } = await requestsFor(client, department).eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!record) return fail('ไม่พบคำขอหยุด', 404);
    if (body.status === 'approved' && record.status !== 'approved') {
      const conflict = await capacityConflict(client, department, Number(record.staff_id), [record.request_date]);
      if (conflict) return conflict;
    }
    const { data, error } = await client.from('staff_requests').update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('department_id', department).eq('request_type', 'OFF').eq('id', id)
      .eq('status', record.status).select('id').maybeSingle();
    if (error) throw error;
    return data ? Response.json({ saved: 1 }) : fail('รายการถูกเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่', 409);
  } catch (error) {
    return unavailable(error);
  }
}
