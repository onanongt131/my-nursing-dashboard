import { NextRequest, NextResponse } from 'next/server';
import { currentUser, db, fail } from '@/lib/audits/chartServer';
import { monthlyProductivity, usableNp, type DailyProductivity } from '@/lib/productivityReport';

export const dynamic = 'force-dynamic';

// กลุ่มงานที่ไม่นำมาแสดง (คงตามหน้า Workforce เดิม)
const EXCLUDED_GROUPS = ['ตรวจรักษาพิเศษ', 'OPD', 'การควบคุมและการป้องกันการติดเชื้อ', 'ผ่าตัด', 'วิสัญญี', 'บริการเฉพาะ'];
type Shift = 'night' | 'morning' | 'evening';
// required_staff (อ.ว) = ROUNDUP(ROUNDUP(ชั่วโมงการพยาบาล/7) × สัดส่วน RN) · สามัญ 70%, ICU 90%
const isIcu = (name: string, group: string) => /icu|ccu|rcu|วิกฤต/i.test(name) || /วิกฤต|icu/i.test(group);
const shiftOf = (raw: unknown): Shift | null => {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('ดึก') || s.includes('night')) return 'night';
  if (s.includes('เช้า') || s.includes('morning')) return 'morning';
  if (s.includes('บ่าย') || s.includes('evening') || s.includes('afternoon')) return 'evening';
  return null;
};

// สรุปอัตรากำลังรายเดือน (ข้อมูลรวม ไม่มีชื่อผู้ป่วย/บุคลากร) จากสถิติรายเวร daily_staffing
// Productivity ใช้สูตรเดียวกับรายงาน Nursing Productivity; PCS = ค่าเฉลี่ยถ่วงน้ำหนักระดับ 1–6
export async function GET(request: NextRequest) {
  try {
    if (!await currentUser()) return fail('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุมัติ', 401);
    const month = request.nextUrl.searchParams.get('month') || '';
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return fail('เดือนไม่ถูกต้อง');
    const [y, m] = month.split('-').map(Number);
    const start = `${month}-01`, end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const client = db();

    const { data: depts, error: deptError } = await client.from('departments').select('id,Department,"group"').order('id');
    if (deptError) throw deptError;
    const units = (depts ?? [])
      .map((d: Record<string, any>) => ({ id: Number(d.id), name: String(d.Department ?? `หน่วยงาน ${d.id}`), group: String(d.group ?? '').trim() }))
      .filter((d) => d.group && d.group !== 'ไม่ระบุกลุ่มงาน' && !EXCLUDED_GROUPS.includes(d.group));
    const ids = new Set(units.map((u) => u.id));

    const rows: Record<string, any>[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('daily_staffing')
        .select('*')
        .gte('date', start).lt('date', end).order('id').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data ?? []).filter((r) => ids.has(Number(r.department_id))));
      if ((data?.length ?? 0) < 1000) break;
    }

    const monthly = new Map(monthlyProductivity(rows as DailyProductivity[]).map((r) => [Number(r.department_id), r.np_value]));
    const items = units.map((u) => {
      const own = rows.filter((r) => Number(r.department_id) === u.id);
      const shifts: Record<Shift, { sum: number; count: number }> = { night: { sum: 0, count: 0 }, morning: { sum: 0, count: 0 }, evening: { sum: 0, count: 0 } };
      let scoreSum = 0, patients = 0, missingNp = 0;
      // WISN ratio: RN ขึ้นเวรจริง ÷ อัตรากำลังที่ต้องมี (required_staff) เฉพาะเวรที่บันทึกทั้งสองค่า
      let rnSum = 0, reqSum = 0, wisnShifts = 0, mixRn = 0, mixAll = 0;
      for (const r of own) {
        const np = usableNp(r.np), sh = shiftOf(r.shift);
        if (np === null) missingNp++; else if (sh) { shifts[sh].sum += np; shifts[sh].count++; }
        const c = [r.score_1, r.score_2, r.score_3, r.score_4, r.score_5, r.score_gt_5].map((v) => Number(v) || 0);
        scoreSum += c.reduce((t, v, i) => t + v * (i + 1), 0);
        patients += c.reduce((t, v) => t + v, 0);
        const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
        const rn = num(r.rn_count), req = num(r.required_staff);
        if (rn !== null && req !== null && req > 0) { rnSum += rn; reqSum += req; wisnShifts++; }
        const others = [r.tn_count, r.pn_count, r.na_count].map(num);
        if (rn !== null && others.some((v) => v !== null)) { const total = rn + others.reduce<number>((t, v) => t + (v ?? 0), 0); if (total > 0) { mixRn += rn; mixAll += total; } }
      }
      const avg = (s: { sum: number; count: number }) => (s.count ? Number((s.sum / s.count).toFixed(2)) : null);
      const icu = isIcu(u.name, u.group);
      return {
        ...u,
        icu,
        rnTarget: icu ? 90 : 70,
        np: monthly.get(u.id) ?? null,
        shiftNp: { night: avg(shifts.night), morning: avg(shifts.morning), evening: avg(shifts.evening) },
        pcs: patients > 0 ? Number((scoreSum / patients).toFixed(2)) : null,
        pcsScoreSum: scoreSum,
        pcsPatients: patients,
        shiftsRecorded: own.length,
        rnSum, reqSum, wisnShifts,
        wisnRatio: reqSum > 0 ? Number((rnSum / reqSum).toFixed(2)) : null,
        skillMix: mixAll > 0 ? Number((mixRn / mixAll * 100).toFixed(1)) : null,
        mixRn, mixAll,
        missingNp,
      };
    });
    return NextResponse.json({ month, items }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Workforce dashboard read failed', { code: (error as { code?: string })?.code || 'unknown' });
    return fail('อ่านข้อมูลอัตรากำลังไม่สำเร็จ', 500);
  }
}
