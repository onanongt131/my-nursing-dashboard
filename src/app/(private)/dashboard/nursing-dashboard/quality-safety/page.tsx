'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ivPercent, type IvReportRow } from '@/lib/ivCareReport';

type Month = { cases: number | null; days: number | null; riskDays: number | null; pending: boolean };
type Row = { id: number; name: string; months: Month[] };
type Status = 'green' | 'yellow' | 'red' | 'none';
type Kpi = 'Fall' | 'Pressure Injury' | 'IV Care';

const MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
const MONTH_NUM = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// เป้าหมาย (ค่าเดิมของหน้านี้) · Fall / Pressure Injury ต่อ 1,000 วันนอน · IV Care อัตราแทงเข็มสำเร็จครั้งแรก (เกณฑ์เดียวกับรายงาน IV Care)
const TARGET: Record<Kpi, { value: number; higherBetter: boolean; unit: string; label: string }> = {
  Fall: { value: 0.5, higherBetter: false, unit: 'ครั้ง/1,000 วันนอน', label: '≤ 0.50' },
  'Pressure Injury': { value: 0.2, higherBetter: false, unit: 'ครั้ง/1,000 วันนอน', label: '≤ 0.20' },
  'IV Care': { value: 80, higherBetter: true, unit: '%', label: '≥ 80%' },
};
const statusOf = (kpi: Kpi, v: number | null): Status => {
  if (v === null) return 'none';
  const t = TARGET[kpi];
  return (t.higherBetter ? v >= t.value : v <= t.value) ? 'green' : 'red';
};

const rate = (list: Month[]) => {
  const valid = list.filter((m) => Number(m.days) > 0);
  const days = valid.reduce((t, m) => t + Number(m.days), 0);
  return days > 0 ? (valid.reduce((t, m) => t + (m.cases ?? 0), 0) / days) * 1000 : null;
};
const fmt = (v: number | null, d = 2) => (v === null ? '—' : v.toFixed(d));

function useJson<T>(url: string) {
  const [state, setState] = useState<{ url: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch(url, { cache: 'no-store', signal: c.signal })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'อ่านข้อมูลไม่สำเร็จ'); setState({ url, data: d }); })
      .catch((e) => { if (!c.signal.aborted) setState({ url, error: e.message }); });
    return () => c.abort();
  }, [url]);
  return state?.url === url ? state : null;
}

function Dot({ status, title }: { status: Status; title?: string }) {
  const cls = status === 'green' ? 'bg-emerald-500' : status === 'yellow' ? 'bg-amber-400' : status === 'red' ? 'bg-rose-500' : 'bg-gray-300';
  return <span className={`inline-block h-3.5 w-3.5 rounded-full shadow-sm ${cls}`} title={title ?? (status === 'none' ? 'ยังไม่มีข้อมูล' : undefined)} />;
}

export default function QualitySafetyDashboardPage() {
  const [year, setYear] = useState(2570);
  const [selectedTrendKpi, setSelectedTrendKpi] = useState<Kpi>('Fall');
  const fall = useJson<{ items: Row[] }>(`/api/safety-monthly-report?kind=fall&year=${year}`);
  const pressure = useJson<{ items: Row[] }>(`/api/safety-monthly-report?kind=pressure&year=${year}`);
  const iv = useJson<{ items: IvReportRow[]; departments: { id: number | string; Department: string }[] }>('/api/iv-care-report');

  const data = useMemo(() => {
    const fallRows = fall?.data?.items ?? [], pressRows = pressure?.data?.items ?? [];
    const ivRows = (iv?.data?.items ?? []).filter((r) => Number(r.fiscal_year) === year);
    const monthly: Record<Kpi, (number | null)[]> = {
      Fall: MONTH_NUM.map((_, i) => rate(fallRows.map((r) => r.months[i]).filter(Boolean))),
      'Pressure Injury': MONTH_NUM.map((_, i) => rate(pressRows.map((r) => r.months[i]).filter(Boolean))),
      'IV Care': MONTH_NUM.map((m) => ivPercent(ivRows.filter((r) => Number(r.month) === m), 'success', 'overall')),
    };
    const overall: Record<Kpi, number | null> = {
      Fall: rate(fallRows.flatMap((r) => r.months)),
      'Pressure Injury': rate(pressRows.flatMap((r) => r.months)),
      'IV Care': ivRows.length ? ivPercent(ivRows, 'success', 'overall') : null,
    };
    // Heatmap: รายหอจากรายงาน Fall / Pressure sore (ทั้งปีงบประมาณ)
    const wards = new Map<string, { name: string; fall: number | null; pi: number | null }>();
    for (const r of fallRows) wards.set(r.name, { name: r.name, fall: rate(r.months), pi: null });
    for (const r of pressRows) wards.set(r.name, { ...(wards.get(r.name) ?? { name: r.name, fall: null, pi: null }), pi: rate(r.months) });
    const heat = [...wards.values()].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    const attention = heat.flatMap((w) => [
      statusOf('Fall', w.fall) === 'red' ? { ward: w.name, kpi: 'Fall' as Kpi, value: w.fall! } : null,
      statusOf('Pressure Injury', w.pi) === 'red' ? { ward: w.name, kpi: 'Pressure Injury' as Kpi, value: w.pi! } : null,
    ]).filter((x): x is { ward: string; kpi: Kpi; value: number } => x !== null)
      .sort((a, b) => b.value / TARGET[b.kpi].value - a.value / TARGET[a.kpi].value);
    return { monthly, overall, heat, attention };
  }, [fall, pressure, iv, year]);

  const loading = !fall || !pressure || !iv;
  const errors = [fall?.error && `Fall: ${fall.error}`, pressure?.error && `Pressure sore: ${pressure.error}`, iv?.error && `IV Care: ${iv.error}`].filter(Boolean);

  const cards: { name: string; kpi?: Kpi; value: string; status: Status }[] = [
    { name: 'Fall', kpi: 'Fall', value: loading ? '…' : `${fmt(data.overall.Fall)} ครั้ง/พันวันนอน`, status: statusOf('Fall', data.overall.Fall) },
    { name: 'Pressure Injury', kpi: 'Pressure Injury', value: loading ? '…' : `${fmt(data.overall['Pressure Injury'])} ครั้ง/พันวันนอน`, status: statusOf('Pressure Injury', data.overall['Pressure Injury']) },
    { name: 'Medication Error', value: 'ยังไม่มีข้อมูล', status: 'none' },
    { name: 'IV Care', kpi: 'IV Care', value: loading ? '…' : data.overall['IV Care'] === null ? '—' : `${fmt(data.overall['IV Care'], 1)}%`, status: statusOf('IV Care', data.overall['IV Care']) },
    { name: 'Unplanned CPR', value: 'ยังไม่มีข้อมูล', status: 'none' },
    { name: 'Aspiration', value: 'ยังไม่มีข้อมูล', status: 'none' },
  ];
  const trendKpis: { key: string; kpi?: Kpi }[] = [{ key: 'Fall', kpi: 'Fall' }, { key: 'Pressure Injury', kpi: 'Pressure Injury' }, { key: 'IV Care', kpi: 'IV Care' }, { key: 'Medication Error' }, { key: 'Unplanned CPR' }];
  const t = TARGET[selectedTrendKpi], values = data.monthly[selectedTrendKpi];
  const scale = Math.max(t.value * 1.5, ...values.filter((v): v is number => v !== null)) || 1;

  return (
    <div className="min-h-screen bg-gray-50/50 px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Nursing Safety Command Center</span>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900">วิเคราะห์จุดเสี่ยงและอุบัติการณ์ความปลอดภัย</h2>
            <p className="mt-1 text-sm text-gray-600">จากข้อมูลที่หน่วยงานบันทึกและอนุมัติแล้ว · ปีงบประมาณ {year} · ตัวชี้วัดสีเทา = ยังไม่มีข้อมูลในระบบ</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">ปีงบประมาณ
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-900">
              {[2570, 2569].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>

        {errors.length > 0 && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.join(' · ')}</p>}

        {/* Safety Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <div key={c.name} className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm ${c.kpi ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${c.kpi ? 'text-gray-700' : 'text-gray-400'}`}>{c.name}</span>
                <Dot status={c.status} />
              </div>
              <p className={`mt-3 text-xs font-semibold ${c.kpi ? 'text-gray-600' : 'text-gray-400'}`}>{c.value}</p>
              {c.kpi && <p className="mt-1 text-[10px] text-gray-400">เป้า {TARGET[c.kpi].label}</p>}
            </div>
          ))}
        </div>

        {/* Trend */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-bold text-gray-800">แนวโน้มอุบัติการณ์รายเดือน ปีงบประมาณ {year}</h3>
              <p className="text-xs text-gray-500">เลือกตัวชี้วัดเพื่อวิเคราะห์ทิศทางความเสี่ยงเปรียบเทียบกับค่าเป้าหมาย</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendKpis.map((k) => (
                <button key={k.key} type="button" disabled={!k.kpi} onClick={() => k.kpi && setSelectedTrendKpi(k.kpi)} title={k.kpi ? undefined : 'ยังไม่มีข้อมูลในระบบ'}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${!k.kpi ? 'cursor-not-allowed bg-gray-100 text-gray-300' : selectedTrendKpi === k.kpi ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {k.key}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-4 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>ตัวชี้วัด: <strong className="text-gray-800">{selectedTrendKpi}</strong> ({t.unit})</span>
              <span>ค่าเป้าหมาย (Target): <strong className="text-emerald-700">{t.label}</strong></span>
            </div>
            <div className="grid grid-cols-6 gap-2 text-center sm:grid-cols-12">
              {MONTHS.map((m, i) => {
                const v = values[i], st = statusOf(selectedTrendKpi, v);
                return (
                  <div key={m} className="flex h-28 flex-col items-center justify-between rounded-lg border border-gray-100 bg-white p-2 shadow-2xs">
                    <span className="text-[10px] text-gray-400">{m}</span>
                    <div className="relative flex h-16 w-full items-end justify-center overflow-hidden rounded bg-gray-100">
                      {v !== null && <div className={`w-full rounded-t ${st === 'red' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ height: `${Math.max(3, Math.min((v / scale) * 100, 100))}%` }} />}
                    </div>
                    <span className={`text-[11px] font-bold ${v === null ? 'text-gray-300' : st === 'red' ? 'text-rose-600' : 'text-emerald-700'}`}>{v === null ? '—' : fmt(v, selectedTrendKpi === 'IV Care' ? 1 : 2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Unit Heatmap */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="mb-1 text-base font-bold text-gray-800">Unit Heatmap (ตรวจจับความเสี่ยงรายหน่วยงาน)</h3>
            <p className="mb-4 text-xs text-gray-500">ทั้งปีงบประมาณ {year} · เขียว = อยู่ในเป้า · แดง = เกินเป้า · เทา = ยังไม่มีข้อมูล</p>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                    <th className="pb-3">หน่วยงาน</th>
                    <th className="pb-3 text-center">Fall</th>
                    <th className="pb-3 text-center">PI</th>
                    <th className="pb-3 text-center text-gray-300">Med Error</th>
                    <th className="pb-3 text-center text-gray-300">NEWS/EWS</th>
                    <th className="pb-3 text-center text-gray-300">CNPG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {loading ? <tr><td colSpan={6} className="py-6 text-center text-gray-400">กำลังโหลดข้อมูล…</td></tr>
                    : !data.heat.length ? <tr><td colSpan={6} className="py-6 text-center text-gray-400">ไม่มีข้อมูล</td></tr>
                    : data.heat.map((w) => (
                      <tr key={w.name} className="hover:bg-gray-50/50">
                        <td className="py-3 font-medium text-gray-700">{w.name}</td>
                        <td className="py-3 text-center"><Dot status={statusOf('Fall', w.fall)} title={w.fall === null ? undefined : `${fmt(w.fall)} ครั้ง/พันวันนอน`} /></td>
                        <td className="py-3 text-center"><Dot status={statusOf('Pressure Injury', w.pi)} title={w.pi === null ? undefined : `${fmt(w.pi)} ครั้ง/พันวันนอน`} /></td>
                        <td className="py-3 text-center"><Dot status="none" /></td>
                        <td className="py-3 text-center"><Dot status="none" /></td>
                        <td className="py-3 text-center"><Dot status="none" /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Risks */}
          <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">Top Risks / Attention</h3>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">เกินเป้า</span>
            </div>
            <p className="mb-4 text-xs text-gray-500">หน่วยงานที่อัตรา Fall / Pressure Injury ทั้งปีเกินเป้า เรียงจากเกินมากที่สุด</p>
            {loading ? <p className="text-xs text-gray-400">กำลังโหลดข้อมูล…</p>
              : !data.attention.length ? <p className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">ไม่มีหน่วยงานที่เกินเป้า</p>
              : <ol className="space-y-2 text-xs">{data.attention.slice(0, 6).map((a, i) => (
                <li key={a.ward + a.kpi} className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2">
                  <span className="w-4 text-right text-rose-400">{i + 1}</span>
                  <span className="min-w-0 flex-1"><strong className="text-gray-800">{a.ward}</strong><span className="block text-gray-500">{a.kpi}</span></span>
                  <strong className="tabular-nums text-rose-600">{fmt(a.value)}</strong>
                </li>
              ))}</ol>}
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-400">RCA / Corrective Action / ผู้รับผิดชอบ / Due date — ยังไม่มีข้อมูลในระบบ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
