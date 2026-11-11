import { productivityDepartmentName, compareProductivityOrder, type ProductivityOrder, type NpCompleteness } from './productivityReport';

export const NP_EXPORT_MONTHS = [
  {value: 10, label: 'OCT', thai: 'ตุลาคม'}, {value: 11, label: 'NOV', thai: 'พฤศจิกายน'},
  {value: 12, label: 'DEC', thai: 'ธันวาคม'}, {value: 1, label: 'JAN', thai: 'มกราคม'},
  {value: 2, label: 'FEB', thai: 'กุมภาพันธ์'}, {value: 3, label: 'MAR', thai: 'มีนาคม'},
  {value: 4, label: 'APR', thai: 'เมษายน'}, {value: 5, label: 'MAY', thai: 'พฤษภาคม'},
  {value: 6, label: 'JUN', thai: 'มิถุนายน'}, {value: 7, label: 'JUL', thai: 'กรกฎาคม'},
  {value: 8, label: 'AUG', thai: 'สิงหาคม'}, {value: 9, label: 'SEP', thai: 'กันยายน'},
];

export function productivityMonthlyExport(
  data: (ProductivityOrder & {department_name?: string; month: number; np_value: number | null; completeness?: NpCompleteness})[],
  fiscalYear: string, month: number,
) {
  const info = NP_EXPORT_MONTHS.find(item => item.value === month);
  if (!info || !/^25\d{2}$/.test(fiscalYear)) throw new Error('ปีงบประมาณหรือเดือนไม่ถูกต้อง');
  const departmentOrder = new Map(data.map(entry => [productivityDepartmentName(entry.department_name || 'ไม่ระบุหน่วยงาน', fiscalYear), entry]));
  const departments = new Map<string, number | null>();
  const qualities = new Map<string, NpCompleteness>();
  for (const entry of data) {
    const name = productivityDepartmentName(entry.department_name || 'ไม่ระบุหน่วยงาน', fiscalYear);
    if (!departments.has(name)) departments.set(name, null);
    if (Number(entry.month) === month && entry.completeness) qualities.set(name, entry.completeness);
    if (Number(entry.month) === month) departments.set(name,
      typeof entry.np_value === 'number' && Number.isFinite(entry.np_value) ? entry.np_value : null);
  }
  const calendarYear = Number(fiscalYear) - (month >= 10 ? 1 : 0);
  const hasData = [...departments.values()].some(value => value !== null) || [...qualities.values()].some(quality => quality.expected > 0);
  const rows: (string | number | null)[][] = [
    ['Nursing Productivity — รายเดือน'],
    ['ปีงบประมาณ', Number(fiscalYear), 'เดือน', info.thai, 'ปี พ.ศ.', calendarYear],
    ['แหล่งข้อมูล', fiscalYear === '2570' ? 'daily_staffing: เฉลี่ย NP รายเวรเป็นรายวัน แล้วเฉลี่ยรายเดือน' : 'nursing_kpi_data'],
    ['ลำดับ', 'หน่วยงาน', `${info.label} — NP (%)`, 'ความครบถ้วน', 'เวรใช้ได้/เวรที่ต้องมี', 'ตรวจถึง', 'เวรที่ขาด', 'ค่าไม่ถูกต้อง', 'เวรซ้ำ'],
    ...[...departments].sort(([a], [b]) => compareProductivityOrder(departmentOrder.get(a), departmentOrder.get(b), a, b)).map(([name, value], index) =>
      [index + 1, name, value, qualities.get(name)?.expected ? (qualities.get(name)!.valid < qualities.get(name)!.expected ? 'ข้อมูลไม่ครบ' : 'ข้อมูลครบ') : fiscalYear === '2570' ? 'ยังไม่ถึงรอบตรวจ' : 'ไม่มีข้อมูลรายเวรสำหรับตรวจ', qualities.has(name) ? `${qualities.get(name)!.valid}/${qualities.get(name)!.expected}` : null, qualities.get(name)?.through || null, qualities.get(name)?.missing.join(', ') || '', qualities.get(name)?.invalid.join(', ') || '', qualities.get(name)?.duplicate.join(', ') || '']),
  ];
  return {rows, hasData, filename: `NP_${fiscalYear}_${info.label}.xlsx`, sheetName: `${info.label} ${calendarYear}`};
}
