import {db} from '@/lib/audits/chartServer';

// Use the same period and department IDs as the FY2570 NP report.
export const NP_REPORT_START = '2026-10-01';
export const NP_REPORT_END = '2027-10-01';

export async function monthlyNpRoster() {
  const ids = new Set<string>();
  const client = db();
  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await client.from('daily_staffing').select('department_id')
      .gte('date', NP_REPORT_START).lt('date', NP_REPORT_END)
      .order('id').range(offset, offset + 999);
    if (error) throw error;
    for (const row of data ?? []) ids.add(String(row.department_id));
    if (!data || data.length < 1000) return ids;
  }
}
