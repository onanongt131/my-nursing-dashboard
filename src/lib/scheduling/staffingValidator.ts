import type { WorkShift } from "./shiftParser";

export type StaffMember = {
  id: number;
  full_name: string;
  position: string;
  competency_level:
    | string
    | null;
  can_be_shift_leader:
    | boolean
    | null;
};

export type StaffingValidationResult = {
  valid: boolean;

  shiftCode: WorkShift;

  rnCount: number;
  requiredRn: number;

  seniorCount: number;
  requiredSenior: number;

  leaderCount: number;
  requiredLeader: number;

  errors: string[];
};

const MINIMUM_RN: Record<
  WorkShift,
  number
> = {
  ช: 7,
  บ: 6,
  ด: 5,
};

const SENIOR_LEVELS = [
  "Expert",
  "Proficient",
];

export function validateShiftStaffing(
  staffInShift: StaffMember[],
  shiftCode: WorkShift
): StaffingValidationResult {
  const requiredRn =
    MINIMUM_RN[shiftCode];

  const requiredSenior = 2;
  const requiredLeader = 2;

  // RN ทั้งหมด
  const rn = staffInShift.filter(
    (staff) =>
      staff.position === "RN"
  );

  // Expert + Proficient
  const senior = rn.filter((staff) =>
    staff.competency_level
      ? SENIOR_LEVELS.includes(
          staff.competency_level
        )
      : false
  );

  // RN ที่สามารถเป็นหัวหน้าเวรได้
  const leaders = rn.filter(
    (staff) =>
      staff.can_be_shift_leader ===
      true
  );

  const errors: string[] = [];

  if (rn.length < requiredRn) {
    errors.push(
      `RN ไม่เพียงพอ: ${rn.length}/${requiredRn} คน`
    );
  }

  if (
    senior.length <
    requiredSenior
  ) {
    errors.push(
      `Expert/Proficient ไม่เพียงพอ: ${senior.length}/${requiredSenior} คน`
    );
  }

  if (
    leaders.length <
    requiredLeader
  ) {
    errors.push(
      `หัวหน้าเวรไม่เพียงพอ: ${leaders.length}/${requiredLeader} คน`
    );
  }

  return {
    valid: errors.length === 0,

    shiftCode,

    rnCount: rn.length,
    requiredRn,

    seniorCount: senior.length,
    requiredSenior,

    leaderCount: leaders.length,
    requiredLeader,

    errors,
  };
}