'use client';

import { useState, type ReactNode } from 'react';

/** ข้อมูลรายแถว (หน่วยงาน หรือ ตัวชี้วัด) เรียงเดือนตามปีงบประมาณ ต.ค.–ก.ย. */
export type ExecRow = { name: string; months: (number | null)[]; annual: number | null; pending?: boolean };

export type ExecSummaryProps = {
  /** ชื่อตัวชี้วัด เช่น "อัตรา Re-admit" */
  metric: string;
  /** หน่วย เช่น "%", "ต่อ 1,000 วันนอน" */
  unit: string;
  decimals?: number;
  /** ทศนิยมของตัวเลขบนกราฟ (ค่าเริ่มต้น 1) */
  chartDecimals?: number;
  /** เกณฑ์ผ่าน (ใช้เกณฑ์เดียวกับสีในตาราง) */
  good: (v: number) => boolean;
  goodLabel: string;
  /** ค่ามาก = แย่ ใช้จัดอันดับหน่วยงานที่ต้องติดตาม */
  badness: (v: number) => number;
  /** เส้นเกณฑ์บนกราฟ */
  lines?: number[];
  overall: number | null;
  monthly: (number | null)[];
  /** กราฟแท่งคู่ (เช่น แผลกดทับ: ต่อวันนอนทั้งหมด vs ต่อวันนอนกลุ่มเสี่ยง) */
  compare?: { monthly: (number | null)[]; label: string; mainLabel: string };
  /** ปุ่มควบคุมเพิ่มเติมที่หัวกราฟ */
  chartControls?: ReactNode;
  rows: ExecRow[];
  rowLabel?: string;
  pendingCount?: number;
  note?: string;
};

const MONTHS_TH = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
const isNum = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

export function ExecutiveSummary(p: ExecSummaryProps) {
  const d = p.decimals ?? 2;
  const f = (v: number | null) => (isNum(v) ? v.toFixed(d) : '—');
  const rowLabel = p.rowLabel ?? 'หน่วยงาน';
  const withData = p.rows.filter((r) => isNum(r.annual));
  const passed = withData.filter((r) => p.good(r.annual as number));
  const failed = withData.filter((r) => !p.good(r.annual as number)).sort((a, b) => p.badness(b.annual as number) - p.badness(a.annual as number));
  const best = [...passed].sort((a, b) => p.badness(a.annual as number) - p.badness(b.annual as number));
  const noData = p.rows.length - withData.length;
  const passPct = withData.length ? (passed.length / withData.length) * 100 : null;

  const lastIdx = p.monthly.reduce<number>((acc, v, i) => (isNum(v) ? i : acc), -1);
  const prevIdx = lastIdx > 0 ? p.monthly.slice(0, lastIdx).reduce<number>((acc, v, i) => (isNum(v) ? i : acc), -1) : -1;
  const last = lastIdx >= 0 ? (p.monthly[lastIdx] as number) : null;
  const prev = prevIdx >= 0 ? (p.monthly[prevIdx] as number) : null;
  const delta = isNum(last) && isNum(prev) ? last - prev : null;
  const better = delta === null || delta === 0 ? null : p.badness(last as number) < p.badness(prev as number);
  const overallOk = isNum(p.overall) ? p.good(p.overall) : null;

  const findings: ReactNode[] = [];
  if (isNum(p.overall)) findings.push(<>ภาพรวมทั้งปี <b>{f(p.overall)} {p.unit}</b> — {overallOk ? <span className="text-emerald-700">อยู่ในเกณฑ์</span> : <span className="text-rose-700">ยังไม่อยู่ในเกณฑ์</span>} ({p.goodLabel})</>);
  else findings.push(<>ยังไม่มีข้อมูลเพียงพอสำหรับคำนวณภาพรวมทั้งปี</>);
  if (isNum(last)) findings.push(<>เดือนล่าสุดที่มีข้อมูล <b>{MONTHS_TH[lastIdx]}</b> = <b>{f(last)}</b>{delta !== null && <> {delta === 0 ? 'เท่ากับ' : delta > 0 ? 'เพิ่มขึ้น' : 'ลดลง'}{delta !== 0 && <> {Math.abs(delta).toFixed(d)}</>} จาก {MONTHS_TH[prevIdx]}{better !== null && <> (<span className={better ? 'text-emerald-700' : 'text-rose-700'}>{better ? 'ดีขึ้น' : 'แย่ลง'}</span>)</>}</>}</>);
  if (withData.length) findings.push(<>{rowLabel}อยู่ในเกณฑ์ <b>{passed.length}</b> จาก {withData.length} ({passPct!.toFixed(0)}%)</>);
  if (failed.length) findings.push(<>{rowLabel}ที่ควรติดตาม: <b>{failed.slice(0, 3).map((r) => r.name).join(', ')}</b>{failed.length > 3 && ` และอีก ${failed.length - 3} ${rowLabel}`}</>);
  if (noData > 0) findings.push(<>ยังไม่มีข้อมูลทั้งปี <b>{noData}</b> {rowLabel}</>);
  if (p.pendingCount) findings.push(<span className="text-amber-800">มีข้อมูลรออนุมัติ {p.pendingCount} รายการ — ตัวเลขอาจเปลี่ยนเมื่ออนุมัติ</span>);

  const values = [...p.monthly, ...(p.compare?.monthly ?? [])].filter(isNum);
  const max = Math.max(1e-9, ...values, ...(p.lines ?? [])) * 1.1;

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label={`${p.metric} · ทั้งปี`} tone={overallOk === null ? 'muted' : overallOk ? 'good' : 'bad'}>
          <span className="text-3xl font-extrabold tabular-nums">{f(p.overall)}</span> <span className="text-sm">{isNum(p.overall) ? p.unit : ''}</span>
          <p className="mt-1 text-xs opacity-80">เกณฑ์: {p.goodLabel}</p>
        </Card>
        <Card label={`เดือนล่าสุด${isNum(last) ? ` (${MONTHS_TH[lastIdx]})` : ''}`}>
          <span className="text-3xl font-extrabold tabular-nums">{f(last)}</span>
          {delta !== null && delta !== 0 && <span className={`ml-2 text-sm font-semibold ${better ? 'text-emerald-700' : 'text-rose-600'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(d)}</span>}
          <p className="mt-1 text-xs text-slate-500">{isNum(prev) ? `เทียบ ${MONTHS_TH[prevIdx]} = ${f(prev)}` : 'ยังไม่มีเดือนก่อนหน้าให้เทียบ'}</p>
        </Card>
        <Card label={`${rowLabel}อยู่ในเกณฑ์`}>
          <span className="text-3xl font-extrabold tabular-nums">{passed.length}</span><span className="text-sm text-slate-500"> / {withData.length}</span>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rose-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${passPct ?? 0}%` }} /></div>
        </Card>
        <Card label="ความครบถ้วนของข้อมูล">
          <span className="text-3xl font-extrabold tabular-nums">{withData.length}</span><span className="text-sm text-slate-500"> / {p.rows.length} {rowLabel}</span>
          <p className="mt-1 text-xs text-slate-500">{noData ? `ยังไม่มีข้อมูล ${noData}` : 'มีข้อมูลครบ'}{p.pendingCount ? ` · รออนุมัติ ${p.pendingCount}` : ''}</p>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">แนวโน้มรายเดือน · {p.metric}</h3>{p.compare && <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-600" />{p.compare.mainLabel}</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-400" />{p.compare.label}</span>
            {!!p.lines?.length && <span className="flex items-center gap-1.5"><i className="inline-block w-4 border-t border-dashed border-amber-500" />เกณฑ์ {p.goodLabel}</span>}
            <span className="flex items-center gap-1.5"><b className="text-rose-600">ตัวเลขสีแดง</b> = ไม่อยู่ในเกณฑ์</span>
          </div>}{p.chartControls}</div>
          <div className="mt-3 flex h-44 items-end gap-1.5 border-b border-slate-200 relative" role="img" aria-label={`กราฟแนวโน้มรายเดือน ${p.metric}`}>
            {(p.lines ?? []).map((l) => <div key={l} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-amber-500" style={{ bottom: `${(l / max) * 100}%` }}><span className="absolute -top-4 right-0 text-[10px] font-semibold text-amber-700">{l}</span></div>)}
            {p.monthly.map((v, i) => {
              const bars = p.compare ? [v, p.compare.monthly[i]] : [v];
              return (
                <div key={i} className="flex h-full flex-1 items-end justify-center gap-0.5">
                  {bars.map((b, k) => (
                    <div key={k} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      {isNum(b) ? <>
                        <span className={`mb-0.5 text-[10px] font-semibold tabular-nums ${p.compare ? (p.good(b) ? 'text-slate-600' : 'text-rose-600') : 'text-slate-600'}`}>{b.toFixed(p.chartDecimals ?? Math.min(d, 1))}</span>
                        <div title={`${MONTHS_TH[i]}${p.compare ? ` · ${k ? p.compare.label : p.compare.mainLabel}` : ''}: ${f(b)}`} className={`w-full max-w-10 rounded-t ${p.compare ? (k ? 'bg-violet-400' : 'bg-teal-600') : p.good(b) ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ height: `${Math.max(2, (b / max) * 100)}%` }} />
                      </> : <span className="mb-1 text-[10px] text-slate-300">—</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1.5">{MONTHS_TH.map((m) => <span key={m} className="flex-1 text-center text-[10px] text-slate-500">{m}</span>)}</div>
          {!p.compare && <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />อยู่ในเกณฑ์</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-400" />ไม่อยู่ในเกณฑ์</span>{!!p.lines?.length && <span><i className="mr-1 inline-block w-3 border-t border-dashed border-amber-500 align-middle" />เส้นเกณฑ์</span>}</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">ประเด็นสำคัญ</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{findings.map((x, i) => <li key={i}>{x}</li>)}</ul>
          {p.note && <p className="mt-3 text-xs text-slate-500">{p.note}</p>}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <RankList title={`${rowLabel}ที่ควรติดตาม`} tone="bad" rows={failed} f={f} unit={p.unit} empty={`ทุก${rowLabel}ที่มีข้อมูลอยู่ในเกณฑ์`} />
        <RankList title={`${rowLabel}ผลดี`} tone="good" rows={best} f={f} unit={p.unit} empty={`ยังไม่มี${rowLabel}ที่อยู่ในเกณฑ์`} />
      </section>
    </div>
  );
}

function Card({ label, tone, children }: { label: string; tone?: 'good' | 'bad' | 'muted'; children: ReactNode }) {
  const cls = tone === 'good' ? 'border-emerald-700 bg-emerald-800 text-white' : tone === 'bad' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white text-slate-900';
  return <div className={`rounded-2xl border px-4 py-3 shadow-sm ${cls}`}><p className={`text-xs font-semibold ${tone === 'good' ? 'text-emerald-100' : 'text-slate-500'}`}>{label}</p><div className="mt-1">{children}</div></div>;
}

function RankList({ title, tone, rows, f, unit, empty }: { title: string; tone: 'good' | 'bad'; rows: ExecRow[]; f: (v: number | null) => string; unit: string; empty: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className={`text-sm font-bold ${tone === 'bad' ? 'text-rose-700' : 'text-emerald-700'}`}>{title} <span className="font-normal text-slate-400">({rows.length})</span></h3>
      {!rows.length ? <p className="mt-2 text-sm text-slate-500">{empty}</p> : <ol className="mt-2 divide-y divide-slate-100">
        {shown.map((r, i) => <li key={r.name + i} className="flex items-center gap-2 py-1.5 text-sm">
          <span className="w-5 text-right text-xs text-slate-400">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate" title={r.name}>{r.name}</span>
          {r.pending && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">รออนุมัติ</span>}
          <span className={`font-bold tabular-nums ${tone === 'bad' ? 'text-rose-600' : 'text-emerald-700'}`}>{f(r.annual)}</span>
          <span className="w-0 overflow-hidden sm:w-auto text-[10px] text-slate-400">{unit}</span>
        </li>)}
      </ol>}
      {rows.length > 5 && <button type="button" onClick={() => setAll(!all)} className="mt-2 text-xs font-semibold text-teal-700 hover:underline">{all ? 'แสดงน้อยลง' : `ดูทั้งหมด ${rows.length}`}</button>}
    </div>
  );
}

/** สลับระหว่าง "บทสรุปผู้บริหาร" (ค่าเริ่มต้น) กับ "ตารางรายหน่วยงาน" */
export function ReportViewSwitch({ summary, children, tableLabel = 'ตารางรายหน่วยงาน' }: { summary: ReactNode; children: ReactNode; tableLabel?: string }) {
  const [view, setView] = useState<'summary' | 'table'>('summary');
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="มุมมองรายงาน" className="inline-flex rounded-xl border border-teal-200 bg-white p-1 shadow-sm print:hidden">
        {([['summary', 'บทสรุปผู้บริหาร'], ['table', tableLabel]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${view === k ? 'bg-teal-700 text-white' : 'text-teal-800 hover:bg-teal-50'}`}>{label}</button>
        ))}
      </div>
      {view === 'summary' ? summary : children}
    </div>
  );
}
