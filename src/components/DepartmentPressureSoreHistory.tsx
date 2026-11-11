import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import CopyableKpiChart from './CopyableKpiChart';

type AnnualPressureSore = {year: number; days: number; cases: number; rate: number | null};
export type PressureSoreHistory = {all?: AnnualPressureSore[]; risk?: AnnualPressureSore[]};

const years = [2567, 2568, 2569];
const groups = [
  {key: 'all', label: 'ผู้ป่วยทั้งหมด'},
  {key: 'risk', label: 'ผู้ป่วยกลุ่มเสี่ยง'},
] as const;

export default function DepartmentPressureSoreHistory({history, view}: {history: PressureSoreHistory; view: 'chart' | 'table'}) {
  const chart = years.map(year => ({
    year,
    all: history.all?.find(row => row.year === year)?.rate ?? null,
    risk: history.risk?.find(row => row.year === year)?.rate ?? null,
  }));
  const showChart = view === 'chart' && chart.some(row => row.all !== null || row.risk !== null);
  const formatRate = (value: unknown) => typeof value === 'number' ? value.toFixed(2) : '';
  return <section data-kpi-chart className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2">
      <h3 className="font-bold text-teal-900">แผลกดทับระดับ 2–4</h3>
      {showChart && <CopyableKpiChart title="แผลกดทับระดับ 2–4 (ต่อ 1,000 วันนอน)"/>}
    </div>
    <p className="mb-3 text-xs text-slate-500">ผลรายปีงบประมาณ · อัตราต่อ 1,000 วันนอนตามรายงานต้นทาง</p>
    {showChart ? <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{top: 24, right: 12, left: -12, bottom: 0}}>
          <CartesianGrid strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="year" tick={{fontSize: 12}}/>
          <YAxis tick={{fontSize: 12}}/>
          <Tooltip formatter={formatRate}/>
          <Legend/>
          <Bar dataKey="all" name="ผู้ป่วยทั้งหมด" fill="#2563eb" maxBarSize={34} label={{position: 'top', formatter: formatRate, fontSize: 11}}/>
          <Bar dataKey="risk" name="ผู้ป่วยกลุ่มเสี่ยง" fill="#0f766e" maxBarSize={34} label={{position: 'top', formatter: formatRate, fontSize: 11}}/>
        </BarChart>
      </ResponsiveContainer>
    </div> : view === 'chart' ? <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีข้อมูลอัตราแผลกดทับ</p> : <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-xs tabular-nums">
        <thead className="bg-slate-50">
          <tr>{['ปีงบฯ', 'กลุ่มผู้ป่วย', 'จำนวนแผล', 'วันนอน', 'อัตรา'].map(label =>
            <th key={label} scope="col" className="px-2 py-2 text-right first:text-left">{label}</th>
          )}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {years.flatMap(year => groups.map(({key,label}) => {
            const row = history[key]?.find(item => item.year === year);
            return <tr key={year + key}>
              <th scope="row" className="px-2 py-2 text-left">{year}</th>
              <td className="px-2 py-2 text-right">{label}</td>
              <td className="px-2 py-2 text-right">{row?.cases.toLocaleString('th-TH') ?? '—'}</td>
              <td className="px-2 py-2 text-right">{row?.days.toLocaleString('th-TH') ?? '—'}</td>
              <td className="px-2 py-2 text-right">{row?.rate?.toFixed(2) ?? '—'}</td>
            </tr>;
          }))}
        </tbody>
      </table>
    </div>}
  </section>;
}
