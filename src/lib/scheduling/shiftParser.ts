export type WorkShift = "ช" | "บ" | "ด";

export const WORK_SHIFTS: WorkShift[] = ["ช", "บ", "ด"];

const NON_WORK_CODES = [
  "",
  "0",
  "VAC",
  "ลา",
  "ลาป่วย",
  "อบรม",
  "ไปราชการ",
];

export function parseShift(
  shift: string | null | undefined
): WorkShift[] {
  if (!shift) return [];

  const value = shift.trim();

  if (NON_WORK_CODES.includes(value)) {
    return [];
  }

  return value
    .split("/")
    .map((item) => item.trim())
    .filter(
      (item): item is WorkShift =>
        WORK_SHIFTS.includes(item as WorkShift)
    );
}

export function hasShift(
  shift: string | null | undefined,
  target: WorkShift
): boolean {
  return parseShift(shift).includes(target);
}

export function isWorkingShift(
  shift: string | null | undefined
): boolean {
  return parseShift(shift).length > 0;
}