export type DailyProductivity = { department_id: number | string; date: string; np: number | string | null };

/** Same calculation as DepartmentDailyStatsTab: mean shifts per day, then mean days per month. */
export function monthlyProductivity(rows: DailyProductivity[]) {
  const groups = new Map<string, { department_id: number | string; month: number; days: Map<string, {sum: number; count: number}> }>();
  for (const row of rows) {
    const key = `${row.department_id}:${row.date.slice(0, 7)}`;
    let month = groups.get(key);
    if (!month) {
      month = { department_id: row.department_id, month: Number(row.date.slice(5, 7)), days: new Map() };
      groups.set(key, month);
    }
    const day = month.days.get(row.date) || {sum: 0, count: 0};
    // Keep the monthly statistics screen's treatment of empty NP as zero.
    day.sum += Number(row.np || 0);
    day.count++;
    month.days.set(row.date, day);
  }
  return [...groups.values()].map(group => ({
    department_id: group.department_id,
    month: group.month,
    fiscal_year: 2570,
    np_value: Number(([...group.days.values()].reduce((sum, day) => sum + day.sum / day.count, 0) / group.days.size).toFixed(2)),
  }));
}

export function productivityDepartmentName(name: string, year: string) {
  if (year !== '2567' && year !== '2568') return name;
  const names: Record<string, string> = {
    'อายุรกรรม 4': 'อายุรกรรมชาย 1', 'อายุรกรรม 2': 'อายุรกรรมชาย 2',
    'อายุรกรรม 5': 'อายุรกรรมหญิง', 'อายุรกรรม 6': 'ร่มไทร',
  };
  return names[name] || name;
}

export type NpCompleteness = {
  expected: number; valid: number; missing: string[]; invalid: string[]; duplicate: string[];
  through: string | null;
};

/** Audit completed calendar days in Bangkok; today's unfinished shifts are not overdue. */
export function productivityCompleteness(
  rows: (DailyProductivity & {shift?: string})[],
  items: {department_id: number | string; month: number; np_value: number | null; fiscal_year?: number}[],
  now = new Date(),
) {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const index = new Map<string, typeof rows>();
  const shiftName = (value: string) => value.includes('ดึก') ? 'ดึก' : value.includes('เช้า') ? 'เช้า' : value.includes('บ่าย') ? 'บ่าย' : '';
  for (const row of rows) {
    const key = `${row.department_id}|${row.date}|${shiftName(row.shift || '')}`;
    index.set(key, [...(index.get(key) || []), row]);
  }
  const result = [...items];
  const departments = [...new Set(items.map(item => item.department_id))];
  for (const department_id of departments) for (const month of [10,11,12,1,2,3,4,5,6,7,8,9]) {
    const start = `${month >= 10 ? 2026 : 2027}-${String(month).padStart(2,'0')}-01`;
    if (start < today && !result.some(item => String(item.department_id) === String(department_id) && item.month === month))
      result.push({department_id,month,fiscal_year:2570,np_value:null});
  }
  return result.map(item => {
    const year = item.month >= 10 ? 2026 : 2027;
    const count = new Date(Date.UTC(year, item.month, 0)).getUTCDate();
    const completeness: NpCompleteness = {expected:0,valid:0,missing:[],invalid:[],duplicate:[],through:null};
    for (let day=1;day<=count;day++) {
      const date = `${year}-${String(item.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      if (date >= today) break;
      completeness.through = date;
      for (const shift of ['ดึก','เช้า','บ่าย']) {
        completeness.expected++;
        const found = index.get(`${item.department_id}|${date}|${shift}`) || [];
        const label = `${date} ${shift}`;
        if (!found.length) completeness.missing.push(label);
        else if (found.length > 1) completeness.duplicate.push(label);
        else if (found[0].np == null || String(found[0].np).trim() === '' || !Number.isFinite(Number(found[0].np)) || Number(found[0].np) < 0) completeness.invalid.push(label);
        else completeness.valid++;
      }
    }
    return {...item, completeness};
  });
}

/** Sort wards alphabetically within groups; U/critical-care units follow all regular wards. */
export type ProductivityOrder = {group_order?: number; department_order?: number; department_group?: string};
export function compareProductivityOrder(a: ProductivityOrder | undefined, b: ProductivityOrder | undefined, aName: string, bName: string) {
  const isU = (entry: ProductivityOrder | undefined, name: string) =>
    /^(?:กลุ่ม(?:งาน)?\s*)?U$/i.test((entry?.department_group || '').trim())
    || /(?:\b[A-Z]*U\b|\bunit\b)/i.test(name);
  const last = Number.MAX_SAFE_INTEGER;
  return Number(isU(a, aName)) - Number(isU(b, bName))
    || ((a?.group_order ?? last) - (b?.group_order ?? last))
    || aName.localeCompare(bName, 'th', {numeric: true});
}
