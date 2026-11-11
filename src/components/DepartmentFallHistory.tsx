import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import CopyableKpiChart from './CopyableKpiChart';

export type FallYear = {year: number; days: number; cases: number; rate: number | null};

const formatRate = (value: unknown) => typeof value === 'number' ? value.toFixed(2) : '—';

export default function DepartmentFallHistory({rows, view}: {rows: FallYear[] | null; view: 'chart' | 'table'}) {
  const showChart = view === 'chart' && rows?.some(row => row.rate !== null);
  return <section data-kpi-chart className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2">
      <h3 className="font-bold text-teal-900">Fall · พลัดตกหกล้ม</h3>
      {showChart && <CopyableKpiChart title="Fall · พลัดตกหกล้ม (ต่อ 1,000 วันนอน)"/>}
    </div>
    <p className="mb-3 text-xs text-slate-500">อัตราต่อ 1,000 วันนอน · เฉพาะข้อมูลที่อนุมัติแล้ว</p>
    {rows === null ? <p role="status" className="py-8 text-center text-sm text-slate-500">โหลดข้อมูล Fall ไม่สำเร็จ</p>
      : showChart ? <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{top: 24, right: 12, left: -12, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="year" tick={{fontSize: 12}}/>
            <YAxis tick={{fontSize: 12}}/>
            <Tooltip formatter={formatRate}/>
            <Bar dataKey="rate" name="อัตราพลัดตกหกล้ม" fill="#0f766e" maxBarSize={42}
              label={{position: 'top', formatter: (value: unknown) => typeof value === 'number' ? formatRate(value) : '', fontSize: 11}}/>
          </BarChart>
        </ResponsiveContainer>
      </div> : view === 'chart' ? <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีข้อมูลอัตราพลัดตกหกล้ม</p>
      : <table className="w-full text-xs tabular-nums">
        <thead className="bg-slate-50">
          <tr>{['ปีงบฯ', 'จำนวนครั้ง', 'วันนอน', 'อัตรา'].map(label =>
            <th key={label} scope="col" className="px-2 py-2 text-right first:text-left">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => <tr key={row.year}>
            <th scope="row" className="px-2 py-2 text-left">{row.year}</th>
            <td className="px-2 py-2 text-right">{row.rate === null ? '—' : row.cases.toLocaleString('th-TH')}</td>
            <td className="px-2 py-2 text-right">{row.days ? row.days.toLocaleString('th-TH') : '—'}</td>
            <td className="px-2 py-2 text-right">{formatRate(row.rate)}</td>
          </tr>)}
        </tbody>
      </table>}
  </section>;
}
