export type ReadmitDischargeRow = {date: unknown; shift: unknown; discharge: unknown};
export function previousMonth(month: string) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 7);
}

// Physician-authorized discharges only; do not add transfers, deaths, or AMA.
export function summarizeReadmitDischarges(rows: ReadmitDischargeRow[], month: string) {
  const [year, number] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const groups = new Map<string, ReadmitDischargeRow[]>();
  for (const row of rows) {
    const shift = String(row.shift || '').trim().replace(/^เวร/, '');
    if (!['ดึก', 'เช้า', 'บ่าย'].includes(shift)) continue;
    const key = `${String(row.date).slice(0,10)} ${shift}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const missing: string[] = [], duplicate: string[] = [], invalid: string[] = [];
  let total = 0;
  for (let day = 1; day <= days; day++) for (const shift of ['ดึก', 'เช้า', 'บ่าย']) {
    const key = `${month}-${String(day).padStart(2,'0')} ${shift}`;
    const entries = groups.get(key) || [];
    if (!entries.length) { missing.push(key); continue; }
    if (entries.length !== 1) { duplicate.push(key); continue; }
    const raw = entries[0].discharge, value = Number(raw);
    if (raw == null || String(raw).trim() === '' || !Number.isSafeInteger(value) || value < 0) { invalid.push(key); continue; }
    total += value;
  }
  const complete = !missing.length && !duplicate.length && !invalid.length;
  return {month, complete, total: complete ? total : null, missing, duplicate, invalid, expected: days * 3, valid: days * 3 - missing.length - duplicate.length - invalid.length};
}
