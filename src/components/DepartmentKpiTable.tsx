import {useState} from 'react';

export type KpiDetail = {n: number; d: number; note?: string};
export const fiscalMonths = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function DepartmentKpiTable({title, years, getRate, getDetail}: {
  title: string;
  years: number[];
  getRate: (year: number, month?: number) => number | null | undefined;
  getDetail: (year: number, month?: number) => KpiDetail | null | undefined;
}) {
  const [selected, setSelected] = useState<{year: number; month?: number} | null>(null);
  const detail = selected && getDetail(selected.year, selected.month);
  const format = (value: number) => value.toLocaleString('th-TH', {maximumFractionDigits: 6});
  return <div className="overflow-x-auto">
    {selected && <div role="status" className="mb-2 rounded-lg border border-teal-200 bg-teal-50 p-2 text-xs text-teal-950">
      <div className="flex items-center justify-between gap-2">
        <strong>{selected.month === undefined ? 'ผลรายปี' : monthLabels[selected.month - 1]} · {selected.year}</strong>
        <button type="button" onClick={() => setSelected(null)} className="underline">ปิด</button>
      </div>
      <p>ตัวตั้ง {detail ? format(detail.n) : '—'} · ตัวหาร {detail ? format(detail.d) : '—'}</p>
    </div>}
    <table className="w-full text-xs tabular-nums" aria-label={title}>
      <thead className="bg-slate-50 text-slate-700">
        <tr><th scope="col" className="px-2 py-2 text-left">เดือน / ปีงบฯ</th>
          {years.map(year => <th key={year} scope="col" className="px-2 py-2 text-right">{year}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {[undefined, ...fiscalMonths].map(month => (
          <tr key={month ?? 'annual'} className={month === undefined ? 'bg-teal-50 font-semibold text-teal-900' : 'text-slate-700'}>
            <th scope="row" className="px-2 py-1.5 text-left font-medium">{month === undefined ? 'ผลรายปี' : monthLabels[month - 1]}</th>
            {years.map(year => {
              const rate = getRate(year, month);
              return <td key={year} className="whitespace-nowrap px-2 py-1.5 text-right">{rate == null ? '—' : <button type="button" className="rounded text-inherit underline decoration-dotted underline-offset-2 hover:text-teal-700 focus-visible:outline-teal-700" onClick={() => setSelected({year, month})} aria-label={`ดูตัวตั้งและตัวหาร ${month === undefined ? 'ผลรายปี' : monthLabels[month - 1]} ${year} ค่า ${rate.toFixed(2)}`}>{rate.toFixed(2)}</button>}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-2 text-[11px] text-slate-500">— ไม่มีข้อมูล · ปี 2570 เป็นข้อมูลสะสม</p>
  </div>;
}
