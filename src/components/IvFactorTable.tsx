'use client';

import { IV_FACTOR_GROUPS } from '@/lib/ivCareFactors';

type Cause = { code?: string; label: string };
type Item = { code?: string; label: string; detail?: string; causes?: Cause[] };
type Group = { code?: string; label: string; items?: Item[] };
export type IvIncident = {
  id?: string | number;
  department_id: string | number;
  record_date: string;
  complication: string;
  grade: number;
  status: string;
  contributing_factors?: { groups?: Group[] } | null;
  factor_drug?: string;
  factor_fluid?: string;
  factor_patient?: string;
  factor_personnel?: string;
};

const GROUPS = IV_FACTOR_GROUPS.map((g) => ({ code: g.code as string, label: g.label as string }));
const LEGACY: [keyof IvIncident, string][] = [['factor_drug', 'ยา'], ['factor_fluid', 'สารน้ำ'], ['factor_patient', 'ผู้ป่วย'], ['factor_personnel', 'บุคลากร']];
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** ตารางปัจจัยที่ส่งผลให้เกิดภาวะแทรกซ้อน IV (สรุปความถี่ + รายกรณี) */
export default function IvFactorTable({ incidents, year, complication, name }: { incidents: IvIncident[]; year: number; complication: string | null; name: (id: string | number) => string }) {
  const from = `${year - 544}-10-01`, to = `${year - 543}-10-01`;
  const cases = incidents
    .filter((r) => r.record_date >= from && r.record_date < to && (!complication || r.complication === complication))
    .sort((a, b) => a.record_date.localeCompare(b.record_date));
  const groupsOf = (r: IvIncident) => r.contributing_factors?.groups ?? [];
  const codeOf = (g: Group) => g.code ?? GROUPS.find((x) => x.label === g.label)?.code ?? g.label;
  const legacyOf = (r: IvIncident) => LEGACY.map(([k, label]) => ({ label, v: text(r[k]) })).filter((x) => x.v);

  // ความถี่: นับจำนวนเหตุการณ์ที่มีปัจจัยนั้น ๆ
  const freq = new Map<string, { group: string; groupCode: string; label: string; count: number; causes: Map<string, number> }>();
  for (const r of cases) {
    for (const g of groupsOf(r)) for (const it of g.items ?? []) {
      const gc = codeOf(g);
      const key = `${gc}|${it.label}`;
      const row = freq.get(key) ?? { group: g.label, groupCode: gc, label: it.label, count: 0, causes: new Map() };
      row.count += 1;
      for (const c of it.causes ?? []) row.causes.set(c.label, (row.causes.get(c.label) ?? 0) + 1);
      freq.set(key, row);
    }
  }
  const order = (code: string) => { const i = GROUPS.findIndex((g) => g.code === code); return i < 0 ? 99 : i; };
  const freqRows = [...freq.values()].sort((a, b) => order(a.groupCode) - order(b.groupCode) || b.count - a.count);
  const withFactors = cases.filter((r) => groupsOf(r).length || legacyOf(r).length).length;
  const groupCounts = GROUPS.map((g) => cases.filter((r) => groupsOf(r).some((x) => codeOf(x) === g.code)).length);
  const legacyCount = cases.filter((r) => legacyOf(r).length).length;
  const title = complication ?? 'ภาวะแทรกซ้อนทั้งหมด';

  return (
    <div className="space-y-3">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">ปัจจัยที่ส่งผล · {title} <span className="font-normal text-slate-400">({cases.length} เหตุการณ์ · ระบุปัจจัย {withFactors})</span></h3>
          <p className="text-xs text-slate-500">นับจำนวนเหตุการณ์ที่เลือกปัจจัยนั้น (1 เหตุการณ์เลือกได้หลายปัจจัย) · ทุกระดับ · รวมรายการรออนุมัติ</p>
        </div>
        {!freqRows.length ? <p className="p-6 text-sm text-slate-500">ยังไม่มีการระบุปัจจัยในปีงบประมาณ {year}</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr>
              <th className="border border-slate-200 px-3 py-2 text-left">กลุ่มปัจจัย</th>
              <th className="border border-slate-200 px-3 py-2 text-left">ปัจจัย</th>
              <th className="w-24 border border-slate-200 px-3 py-2 text-right">จำนวน</th>
              <th className="w-24 border border-slate-200 px-3 py-2 text-right">ร้อยละ</th>
              <th className="border border-slate-200 px-3 py-2 text-left">สาเหตุที่พบบ่อย</th>
            </tr></thead>
            <tbody>{freqRows.map((r, i) => {
              const first = i === 0 || freqRows[i - 1].groupCode !== r.groupCode;
              const span = freqRows.filter((x) => x.groupCode === r.groupCode).length;
              const pct = cases.length ? (r.count / cases.length) * 100 : 0;
              const top = [...r.causes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
              return <tr key={r.groupCode + r.label} className="align-top">
                {first && <th rowSpan={span} className="border border-slate-200 bg-teal-50/50 px-3 py-2 text-left font-semibold text-teal-900">{r.group}</th>}
                <td className="border border-slate-200 px-3 py-2">{r.label}</td>
                <td className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums text-slate-800">{r.count}</td>
                <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                  {pct.toFixed(2)}%
                  <div className="mt-1 h-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                </td>
                <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600">{top.length ? top.map(([c, n]) => `${c} (${n})`).join(' · ') : '—'}</td>
              </tr>;
            })}</tbody>
          </table></div>}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">ปัจจัยที่ส่งผลรายกรณี · {title} <span className="font-normal text-slate-400">({cases.length} ราย)</span></h3>
          <p className="text-xs text-slate-500">รายละเอียดปัจจัยและสาเหตุแสดงใต้เครื่องหมาย ✓ ของแต่ละกลุ่ม</p>
        </div>
        {!cases.length ? <p className="p-6 text-sm text-slate-500">ไม่มีเหตุการณ์ในปีงบประมาณ {year}</p> :
          <div className="max-h-[70vh] overflow-auto"><table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-600">
              <tr>
                <th rowSpan={2} className="w-48 border border-slate-200 px-3 py-2 text-center">เคส</th>
                <th rowSpan={2} className="w-48 border border-slate-200 px-3 py-2 text-center">ปัจจัยที่ระบุ</th>
                <th colSpan={GROUPS.length + 1} className="border border-slate-200 px-3 py-2 text-center">กลุ่มปัจจัยที่พบ</th>
              </tr>
              <tr>
                {GROUPS.map((g, k) => <th key={g.code} className="min-w-[150px] border border-slate-200 px-2 py-2 text-center font-semibold">{g.label}<span className="block text-[10px] font-normal text-slate-400">{groupCounts[k]} ราย</span></th>)}
                <th className="min-w-[150px] border border-slate-200 px-2 py-2 text-center font-semibold">บันทึกแบบเดิม<span className="block text-[10px] font-normal text-slate-400">{legacyCount} ราย</span></th>
              </tr>
            </thead>
            <tbody>{cases.map((r, i) => {
              const id = String(r.id ?? i), gs = groupsOf(r), legacy = legacyOf(r);
              const items = gs.flatMap((g) => (g.items ?? []).map((it) => ({ g: g.label, it })));
              return <tr key={id} className="align-top">
                <td className="border border-slate-200 px-3 py-2 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900">{name(r.department_id)}</div>
                  <div>{r.record_date}</div>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{r.complication} ระดับ {r.grade}</span>
                  {r.status === 'pending' && <span className="ml-1 mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">รออนุมัติ</span>}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-slate-700">
                  {!items.length && !legacy.length ? <span className="text-slate-400">ไม่ได้ระบุปัจจัย</span>
                    : [...items.map(({ it }) => it.label), ...legacy.map((l) => l.label)].join(' · ')}
                </td>
                {GROUPS.map((g) => {
                  const hit = gs.find((x) => codeOf(x) === g.code);
                  return <td key={g.code} className="border border-slate-200 px-2 py-2 text-center">
                    {hit ? <>
                      <span className="text-base font-bold text-teal-600">✓</span>
                      <ul className="mt-1 space-y-1 text-left text-xs text-slate-600">
                        {(hit.items ?? []).map((it, k) => {
                          const d = [...(it.causes ?? []).map((c) => c.label), text(it.detail)].filter(Boolean).join(' · ');
                          return <li key={k}><b className="text-slate-800">{it.label}</b>{d && <>: {d}</>}</li>;
                        })}
                      </ul>
                    </> : <span className="text-slate-300">—</span>}
                  </td>;
                })}
                <td className="border border-slate-200 px-2 py-2 text-center">
                  {legacy.length ? <>
                    <span className="text-base font-bold text-teal-600">✓</span>
                    <ul className="mt-1 space-y-1 text-left text-xs text-slate-600">{legacy.map((l) => <li key={l.label}><b className="text-slate-800">{l.label}</b>: {l.v}</li>)}</ul>
                  </> : <span className="text-slate-300">—</span>}
                </td>
              </tr>;
            })}</tbody>
          </table></div>}
      </section>
    </div>
  );
}
