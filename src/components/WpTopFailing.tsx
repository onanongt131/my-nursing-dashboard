'use client';

type Rec = { department_id: number | string; month: number; name: string; wp: number | null; reasons?: string[]; pending?: boolean };

/** 5 อันดับตัวชี้วัด WP/QA ที่ไม่ผ่านเกณฑ์ (< 90) มากที่สุดจากทุกหอ */
export default function WpTopFailing({ records, deptName, limit = 5 }: { records: Rec[]; deptName: (id: string) => string; limit?: number }) {
  const by = new Map<string, Map<string, number[]>>();
  const reasons = new Map<string, Map<string, number>>();
  const failMonths = new Map<string, number>();
  for (const r of records) {
    if (!r.name || r.wp === null || r.wp === undefined || !Number.isFinite(Number(r.wp))) continue;
    const score = Number(r.wp), dept = String(r.department_id);
    if (!by.has(r.name)) by.set(r.name, new Map());
    const m = by.get(r.name)!;
    m.set(dept, [...(m.get(dept) ?? []), score]);
    if (score < 90) {
      failMonths.set(r.name, (failMonths.get(r.name) ?? 0) + 1);
      const rm = reasons.get(r.name) ?? new Map<string, number>();
      for (const x of r.reasons ?? []) if (x?.trim()) rm.set(x.trim(), (rm.get(x.trim()) ?? 0) + 1);
      reasons.set(r.name, rm);
    }
  }
  const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const rows = [...by.entries()].map(([name, m]) => {
    const wards = [...m.entries()].map(([id, v]) => ({ id, avg: avg(v) }));
    const failing = wards.filter((w) => w.avg < 90).sort((a, b) => a.avg - b.avg);
    return { name, wards: wards.length, failing, overall: avg([...m.values()].flat()), failMonths: failMonths.get(name) ?? 0, reasons: [...(reasons.get(name) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) };
  }).filter((r) => r.failing.length > 0)
    .sort((a, b) => b.failing.length - a.failing.length || b.failMonths - a.failMonths || a.overall - b.overall)
    .slice(0, limit);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-rose-700">ตัวชี้วัดที่ไม่ผ่านเกณฑ์ {limit} อันดับแรก · ทุกหอ</h3>
        <p className="text-xs text-slate-500">เรียงตามจำนวนหอที่คะแนนเฉลี่ยทั้งปี &lt; 90 · รองลงมาจำนวนครั้ง (เดือน) ที่ไม่ผ่าน</p>
      </div>
      {!rows.length ? <p className="p-6 text-sm text-slate-500">ไม่มีตัวชี้วัดที่ไม่ผ่านเกณฑ์ในปีงบประมาณนี้</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>
            <th className="w-12 border border-slate-200 px-2 py-2 text-center">อันดับ</th>
            <th className="border border-slate-200 px-3 py-2 text-left">ตัวชี้วัด</th>
            <th className="w-28 border border-slate-200 px-2 py-2 text-center">หอที่ไม่ผ่าน</th>
            <th className="w-24 border border-slate-200 px-2 py-2 text-center">ครั้งที่ไม่ผ่าน</th>
            <th className="w-24 border border-slate-200 px-2 py-2 text-center">คะแนนเฉลี่ย</th>
            <th className="border border-slate-200 px-3 py-2 text-left">หอที่ไม่ผ่าน (คะแนนเฉลี่ย)</th>
            <th className="border border-slate-200 px-3 py-2 text-left">เหตุผลที่ไม่ได้ปฏิบัติที่พบบ่อย</th>
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.name} className="align-top">
              <td className="border border-slate-200 px-2 py-2 text-center"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">{i + 1}</span></td>
              <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{r.name}</td>
              <td className="border border-slate-200 px-2 py-2 text-center tabular-nums"><b className="text-rose-600">{r.failing.length}</b><span className="text-slate-400"> / {r.wards}</span></td>
              <td className="border border-slate-200 px-2 py-2 text-center tabular-nums">{r.failMonths}</td>
              <td className={`border border-slate-200 px-2 py-2 text-center font-bold tabular-nums ${r.overall < 90 ? 'text-rose-600' : 'text-emerald-700'}`}>{r.overall.toFixed(1)}</td>
              <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600">{r.failing.map((w) => `${deptName(w.id)} (${w.avg.toFixed(1)})`).join(' · ')}</td>
              <td className="border border-slate-200 px-3 py-2 text-xs text-slate-600">{r.reasons.length ? r.reasons.map(([x, n]) => `${x} (${n})`).join(' · ') : '—'}</td>
            </tr>
          ))}</tbody>
        </table></div>}
    </section>
  );
}
