'use client';

import { useEffect, useState } from 'react';
import { dialysisFields, dialysisMetrics, type DialysisCounts } from '@/lib/dialysisStats';

type Row = DialysisCounts & { date: string };
type Month = { dates: string[]; rows: Row[]; editable: boolean };
type Draft = Partial<Record<keyof DialysisCounts, string>>;
const format = (value: number | null, decimals: number) => value === null ? '—' : value.toFixed(decimals);

export default function DialysisMonthlyStats({ departmentId }: { departmentId: string | number }) {
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).slice(0, 7));
  const [data, setData] = useState<Month | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const url = '/api/dialysis-stats?' + new URLSearchParams({ department_id: String(departmentId), month });

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setDrafts({});
    setError('');
    setNotice('');
    fetch(url, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!controller.signal.aborted) setData(result);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, [url]);

  async function save(date: string, draft: Draft) {
    const entries = dialysisFields.map(([key]) => [key, draft[key] === undefined || draft[key] === '' ? NaN : Number(draft[key])] as const);
    if (entries.some(([, value]) => !Number.isSafeInteger(value) || value < 0)) {
      setError('กรุณากรอกทุกช่องเป็นจำนวนเต็มตั้งแต่ 0');
      return;
    }
    const row = { date, ...Object.fromEntries(entries) } as Row;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
      if (!response.ok) throw new Error((await response.json()).error);
      setData(previous => previous && { ...previous, rows: [...previous.rows.filter(item => item.date !== date), row] });
      setDrafts(previous => { const next = { ...previous }; delete next[date]; return next; });
      setNotice('บันทึกแล้ว ' + date);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const totals = data?.rows.filter(row => row.staff > 0).reduce((sum, row) => ({
    hours: sum.hours + dialysisMetrics(row).hours, staff: sum.staff + row.staff,
  }), { hours: 0, staff: 0 });

  return <section className="space-y-3 rounded-xl border bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-bold">สถิติไตเทียมรายเดือน · เฉพาะวันราชการ</h2>
      <label>เลือกเดือน <input type="month" value={month} disabled={saving} onChange={event => { if (event.target.value) setMonth(event.target.value); }} className="rounded border px-2 py-1"/></label>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-emerald-700">{notice}</p>}
    {!data && !error && <p role="status">กำลังโหลดข้อมูล…</p>}
    {data && <><p className="text-sm">NP เดือนนี้ {format(totals?.staff ? totals.hours / (totals.staff * 7) * 100 : null, 1)}%</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
        <thead><tr className="bg-slate-100"><th>วันที่</th>{dialysisFields.map(([key, label]) => <th key={key}>{label}</th>)}<th>NHPPD</th><th>NP (%)</th>{data.editable && <th>บันทึก</th>}</tr></thead>
        <tbody>{data.dates.map(date => {
          const row = data.rows.find(item => item.date === date);
          const draft = drafts[date] ?? Object.fromEntries(dialysisFields.map(([key]) => [key, row ? String(row[key]) : '']));
          const hasValues = dialysisFields.every(([key]) => draft[key] !== '' && draft[key] !== undefined);
          const metrics = hasValues ? dialysisMetrics(Object.fromEntries(dialysisFields.map(([key]) => [key, Number(draft[key])])) as DialysisCounts) : null;
          return <tr key={date} className="border-b text-center">
            <th scope="row" className="whitespace-nowrap p-1">{date}</th>
            {dialysisFields.map(([key, label]) => <td key={key} className="p-1">{data.editable
              ? <input aria-label={label + ' ' + date} type="number" min="0" step="1" disabled={saving} value={draft[key]} className="w-16 rounded border px-1 text-right"
                onChange={event => { const value = event.target.value; setDrafts(previous => ({ ...previous, [date]: { ...draft, [key]: value } })); }}/>
              : row?.[key] ?? '—'}</td>)}
            <td>{format(metrics?.nhppd ?? null, 2)}</td><td>{format(metrics?.np ?? null, 1)}</td>
            {data.editable && <td><button type="button" disabled={saving || !drafts[date]} onClick={() => void save(date, draft)} className="rounded bg-teal-700 px-2 py-1 text-white disabled:opacity-50">บันทึก</button></td>}
          </tr>;
        })}</tbody>
      </table></div></>}
  </section>;
}
