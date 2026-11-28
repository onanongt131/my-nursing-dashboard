'use client';

const FISCAL = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const MONTH_TH = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
/** ชื่อเดือน + ปี พ.ศ. ตามปีงบประมาณ (ต.ค.–ธ.ค. เป็นปีก่อนหน้า) */
export const monthLabel = (month: number, fiscalYear: number) => `${MONTH_TH[month]} ${month >= 10 ? fiscalYear - 1 : fiscalYear}`;

/** ตัวเลือกเดือนในปีงบประมาณ (0 = ทั้งปีงบประมาณ) */
export default function FiscalMonthSelect({ value, onChange, year }: { value: number; onChange: (m: number) => void; year: number }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-600">เลือกเดือน
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="rounded-lg border border-teal-200 bg-white px-2 py-1 text-xs text-slate-800">
        <option value={0}>ทั้งปีงบประมาณ</option>
        {FISCAL.map((m) => <option key={m} value={m}>{monthLabel(m, year)}</option>)}
      </select>
    </label>
  );
}
