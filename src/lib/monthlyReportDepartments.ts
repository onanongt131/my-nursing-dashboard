type Department = { id: string | number; group?: string | null; name?: string; Department?: string };

export function sortMonthlyDepartments<T extends Department>(departments: T[]): T[] {
  return [...departments].sort((a, b) =>
    (a.name ?? a.Department ?? '').localeCompare(b.name ?? b.Department ?? '', 'th')
    || String(a.id).localeCompare(String(b.id), 'th'));
}
