/** ตรวจรายการหน่วยงานที่ดูแลเพิ่ม: ตัวเลขบวก ไม่ซ้ำ ไม่รวมหน่วยงานหลัก ไม่เกิน 10 หน่วยงาน • ไม่ถูกต้องคืน null */
export function cleanExtraDepartments(value: unknown, primary: unknown): number[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const list = value.map(Number);
  if (list.some(n => !Number.isSafeInteger(n) || n <= 0)) return null;
  return [...new Set(list)].filter(n => n !== Number(primary));
}
