export const isDialysis = (name: unknown) => /ไตเทียม|dialysis|ฟอกเลือด/i.test(String(name ?? ''));
export const dialysisFields = [
  ['patients', 'ผู้ป่วยเวรเช้า'], ['hd', 'HD'], ['dlc', 'DLC'],
  ['perm_cath', 'Perm Cath'], ['opd', 'OPD visit'],
  ['consults', 'การให้คำปรึกษา'], ['staff', 'อัตรากำลัง (คน)'],
] as const;
export type DialysisCounts = Record<typeof dialysisFields[number][0], number>;
export function dialysisMetrics(row: DialysisCounts) {
  const hours = (row.hd * 350 + row.dlc * 50 + row.perm_cath * 100 + row.opd * 20 + row.consults * 75) / 100;
  return { hours, nhppd: row.patients > 0 ? hours / row.patients : null, np: row.staff > 0 ? hours / (row.staff * 7) * 100 : null };
}
