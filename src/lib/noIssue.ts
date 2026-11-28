/**
 * ข้อความที่หอบันทึกไว้แต่หมายถึง "ไม่มีประเด็น" เช่น "-", "ไม่พบปัญหา", "ไม่มี"
 * ใช้ตัดสินว่าจะติ๊ก ✓ และนับเป็นประเด็นที่พบหรือไม่
 */
const NO_ISSUE = new Set(['ไม่พบปัญหา', 'ไม่มีปัญหา', 'ไม่พบ', 'ไม่มี', 'ไม่มีประเด็น', 'ไม่พบประเด็น', 'ไม่มีปัจจัย', 'ไม่พบปัจจัย', 'ไม่เกี่ยวข้อง', 'ไม่ระบุ', 'none', 'no', 'nil', 'na', 'n/a']);

export function isNoIssue(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const t = value.trim().toLowerCase().replace(/[\s.。,;:!_]+/g, '').replace(/^[-–—]+/, '');
  if (!t) return true; // ว่าง หรือมีแต่ขีด เช่น "-", "--", "—"
  return NO_ISSUE.has(t) || NO_ISSUE.has(t.replace(/[-–—]+$/, ''));
}
