import { parseShift, type WorkShift } from './shiftParser';

export type SchedulerStaff = {
  id: number | string;
  full_name: string;
  position: string | null;
  competency_level?: string | null;
  can_be_shift_leader?: boolean | null;
  active?: boolean | null;

  // auto      = ระบบช่วยจัดเวรได้
  // fixed     = ใช้เฉพาะเวรที่กรอก/นำเข้ามา ห้าม Generate เพิ่ม
  // part_time = ใช้เฉพาะเวรที่ส่งมา ห้าม Generate เพิ่ม และไม่เติม 0
  schedule_mode?: 'auto' | 'fixed' | 'part_time' | null;
};

export type SchedulerRequirements = {
  morningRn: number;
  eveningRn: number;
  nightRn: number;
  seniorPerShift: number;
  leaderPerShift: number;

  maxConsecutiveWorkDays?: number;       // default 5
  preferredRestAfterDays?: number;       // default 3
  maxConsecutiveNightShifts?: number;    // default 2

  morningBlockMin?: number;              // default 2
  morningBlockMax?: number;              // default 3
  eveningBlockMin?: number;              // default 2
  eveningBlockMax?: number;              // default 3
  nightBlockMin?: number;                // default 1
  nightBlockMax?: number;                // default 2

  maxEveningNightDifference?: number;    // default 1

  // จำนวนสิทธิวันหยุดตามปฏิทินราชการของเดือนนั้น
  requiredOffDays?: number;              // default 0

  // ควรมีวันหยุดจริง 0 อย่างน้อยกี่วัน แม้จะมี ช/0 บ/0 ด/0
  minActualOffDays?: number;             // default 4

  allowDoubleShift?: boolean;            // default true
  allowShiftOffCredit?: boolean;         // default true

  // บุคลากรสนับสนุนขั้นต่ำต่อเวร
  morningPn?: number;
  eveningPn?: number;
  nightPn?: number;

  morningNa?: number;
  eveningNa?: number;
  nightNa?: number;

  morningSupport?: number;
  eveningSupport?: number;
  nightSupport?: number;
};

export type AutoScheduleInput = {
  staffList: SchedulerStaff[];
  daysArray: string[];

  // staffId_day -> code
  existingRoster: Record<string, string>;

  // staffId_YYYY-MM-DD
  approvedDayOffKeys: Set<string>;

  // YYYY-MM
  selectedMonth: string;

  // staffId -> เวรวันสุดท้ายเดือนก่อน
  previousDayRoster?: Record<string, string>;

  requirements: SchedulerRequirements;

  // true = ไม่ทับค่าที่กรอกไว้แล้ว
  preserveExisting?: boolean;

  // กลุ่มที่ต้องการให้ช่วยจัด
  targetGroup?: 'all' | 'nurse' | 'support';
};

export type AutoScheduleWarning = {
  day: string;
  shift: WorkShift;
  type:
    | 'RN_SHORTAGE'
    | 'SENIOR_SHORTAGE'
    | 'LEADER_SHORTAGE'
    | 'NO_ELIGIBLE_STAFF'
    | 'REST_CONSTRAINT'
    | 'DOUBLE_SHIFT_USED'
    | 'OFF_CREDIT_SHORTAGE'
    | 'ACTUAL_OFF_SHORTAGE'
    | 'PN_SHORTAGE'
    | 'NA_SHORTAGE'
    | 'SUPPORT_SHORTAGE';
  message: string;
};

export type StaffScheduleStat = {
  staffId: number | string;
  totalShifts: number;
  morning: number;
  evening: number;
  night: number;

  // หยุดจริง (0)
  actualOffDays: number;

  // เครดิตวันหยุด = 0 + ช/0 + บ/0 + ด/0
  offCreditDays: number;

  // จำนวนวันที่มีเวรควบ
  doubleShiftDays: number;

  maxConsecutiveWorkDays: number;
};

export type AutoScheduleResult = {
  roster: Record<string, string>;
  warnings: AutoScheduleWarning[];
  stats: StaffScheduleStat[];
};

type InternalStaffStat = {
  total: number;
  morning: number;
  evening: number;
  night: number;
  doubleShiftDays: number;
};

const SHIFT_ORDER: WorkShift[] = ['ด', 'บ', 'ช'];

function rosterKey(staffId: number | string, day: string) {
  return `${staffId}_${day}`;
}

function dayOffKey(
  staffId: number | string,
  selectedMonth: string,
  day: string
) {
  return `${staffId}_${selectedMonth}-${day}`;
}

function isRn(staff: SchedulerStaff) {
  return staff.position === 'RN' && staff.active !== false;
}

function isAutoScheduled(staff: SchedulerStaff) {
  // รองรับข้อมูลเดิมที่ยังไม่มี schedule_mode:
  // ถ้าไม่มีค่า ให้ถือว่าเป็น auto
  return !staff.schedule_mode || staff.schedule_mode === 'auto';
}

function normalizedPosition(staff: SchedulerStaff) {
  return String(staff.position || '').trim().toUpperCase();
}

function isPn(staff: SchedulerStaff) {
  return normalizedPosition(staff) === 'PN' && staff.active !== false;
}

function isNa(staff: SchedulerStaff) {
  return normalizedPosition(staff) === 'NA' && staff.active !== false;
}

function isSupportEmployee(staff: SchedulerStaff) {
  const position = String(staff.position || '').trim();
  const upper = position.toUpperCase();

  return (
    staff.active !== false &&
    (
      position === 'พนง' ||
      position === 'พนง.' ||
      upper === 'SUPPORT'
    )
  );
}

function isSenior(staff: SchedulerStaff) {
  return (
    staff.competency_level === 'Expert' ||
    staff.competency_level === 'Proficient'
  );
}

function isLeader(staff: SchedulerStaff) {
  return staff.can_be_shift_leader === true;
}

function requirementForShift(
  shift: WorkShift,
  requirements: SchedulerRequirements
) {
  if (shift === 'ช') return requirements.morningRn;
  if (shift === 'บ') return requirements.eveningRn;
  return requirements.nightRn;
}

function hasWorkingShift(code: string | undefined) {
  if (!code) return false;
  return parseShift(code).length > 0;
}

function getShiftCount(code: string | undefined) {
  return parseShift(code || '').length;
}

function isPureOff(code: string | undefined) {
  return (code || '').trim().toUpperCase() === '0';
}

function hasOffCredit(code: string | undefined) {
  const value = (code || '').trim().toUpperCase();

  return (
    value === '0' ||
    value.endsWith('/0')
  );
}

function isProtectedNonWorkCode(code: string | undefined) {
  const value = (code || '').trim().toUpperCase();

  if (!value) return false;
  if (hasWorkingShift(value)) return false;

  // 0 / VAC / ปช / ลา / อื่น ๆ
  return true;
}

function getPreviousShiftCode(
  staffId: number | string,
  dayIndex: number,
  daysArray: string[],
  roster: Record<string, string>,
  previousDayRoster: Record<string, string>
) {
  if (dayIndex === 0) {
    return previousDayRoster[String(staffId)] || '';
  }

  return roster[rosterKey(staffId, daysArray[dayIndex - 1])] || '';
}

function wouldCreateNightToMorning(
  staffId: number | string,
  dayIndex: number,
  targetShift: WorkShift,
  daysArray: string[],
  roster: Record<string, string>,
  previousDayRoster: Record<string, string>
) {
  if (targetShift !== 'ช') return false;

  const previousShiftCode = getPreviousShiftCode(
    staffId,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster
  );

  return parseShift(previousShiftCode).includes('ด');
}

function countConsecutiveWorkDaysBefore(
  staffId: number | string,
  dayIndex: number,
  daysArray: string[],
  roster: Record<string, string>,
  previousDayRoster: Record<string, string>
) {
  let count = 0;

  for (let i = dayIndex - 1; i >= 0; i--) {
    const code = roster[rosterKey(staffId, daysArray[i])] || '';

    if (hasWorkingShift(code)) {
      count += 1;
    } else {
      break;
    }
  }

  if (dayIndex === 0) {
    const previousCode = previousDayRoster[String(staffId)] || '';

    if (hasWorkingShift(previousCode)) {
      count += 1;
    }
  }

  return count;
}

function countConsecutiveNightBefore(
  staffId: number | string,
  dayIndex: number,
  daysArray: string[],
  roster: Record<string, string>,
  previousDayRoster: Record<string, string>
) {
  let count = 0;

  for (let i = dayIndex - 1; i >= 0; i--) {
    const code = roster[rosterKey(staffId, daysArray[i])] || '';

    if (parseShift(code).includes('ด')) {
      count += 1;
    } else {
      break;
    }
  }

  if (dayIndex === 0) {
    const previousCode = previousDayRoster[String(staffId)] || '';

    if (parseShift(previousCode).includes('ด')) {
      count += 1;
    }
  }

  return count;
}

function countSameShiftBlockBefore(
  staffId: number | string,
  dayIndex: number,
  shift: WorkShift,
  daysArray: string[],
  roster: Record<string, string>
) {
  let count = 0;

  for (let i = dayIndex - 1; i >= 0; i--) {
    const code = roster[rosterKey(staffId, daysArray[i])] || '';

    if (parseShift(code).includes(shift)) {
      count += 1;
    } else {
      break;
    }
  }

  return count;
}

function blockMinForShift(
  shift: WorkShift,
  requirements: SchedulerRequirements
) {
  if (shift === 'ช') return requirements.morningBlockMin ?? 2;
  if (shift === 'บ') return requirements.eveningBlockMin ?? 2;
  return requirements.nightBlockMin ?? 1;
}

function blockMaxForShift(
  shift: WorkShift,
  requirements: SchedulerRequirements
) {
  if (shift === 'ช') return requirements.morningBlockMax ?? 3;
  if (shift === 'บ') return requirements.eveningBlockMax ?? 3;
  return requirements.nightBlockMax ?? 2;
}

function initializeStats(
  staffList: SchedulerStaff[],
  daysArray: string[],
  roster: Record<string, string>
) {
  const stats = new Map<string, InternalStaffStat>();

  staffList.forEach((staff) => {
    const stat: InternalStaffStat = {
      total: 0,
      morning: 0,
      evening: 0,
      night: 0,
      doubleShiftDays: 0,
    };

    daysArray.forEach((day) => {
      const code = roster[rosterKey(staff.id, day)] || '';
      const shifts = parseShift(code);

      if (shifts.length >= 2) {
        stat.doubleShiftDays += 1;
      }

      shifts.forEach((shift) => {
        stat.total += 1;
        if (shift === 'ช') stat.morning += 1;
        if (shift === 'บ') stat.evening += 1;
        if (shift === 'ด') stat.night += 1;
      });
    });

    stats.set(String(staff.id), stat);
  });

  return stats;
}

function addStat(
  staffId: number | string,
  shift: WorkShift,
  stats: Map<string, InternalStaffStat>,
  becameDoubleShift = false
) {
  const key = String(staffId);

  const current = stats.get(key) || {
    total: 0,
    morning: 0,
    evening: 0,
    night: 0,
    doubleShiftDays: 0,
  };

  current.total += 1;

  if (shift === 'ช') current.morning += 1;
  if (shift === 'บ') current.evening += 1;
  if (shift === 'ด') current.night += 1;
  if (becameDoubleShift) current.doubleShiftDays += 1;

  stats.set(key, current);
}

function getRnInShift(
  staffList: SchedulerStaff[],
  roster: Record<string, string>,
  day: string,
  shift: WorkShift
) {
  return staffList.filter((staff) => {
    if (!isRn(staff)) return false;

    const code = roster[rosterKey(staff.id, day)] || '';
    return parseShift(code).includes(shift);
  });
}

function candidateScore(args: {
  staff: SchedulerStaff;
  shift: WorkShift;
  dayIndex: number;
  daysArray: string[];
  roster: Record<string, string>;
  previousDayRoster: Record<string, string>;
  stats: Map<string, InternalStaffStat>;
  requirements: SchedulerRequirements;
  needsSenior: boolean;
  needsLeader: boolean;
}) {
  const {
    staff,
    shift,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster,
    stats,
    requirements,
    needsSenior,
    needsLeader,
  } = args;

  const stat = stats.get(String(staff.id)) || {
    total: 0,
    morning: 0,
    evening: 0,
    night: 0,
    doubleShiftDays: 0,
  };

  const consecutiveDays = countConsecutiveWorkDaysBefore(
    staff.id,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster
  );

  const sameShiftBlock = countSameShiftBlockBefore(
    staff.id,
    dayIndex,
    shift,
    daysArray,
    roster
  );

  const preferredRestAfterDays =
    requirements.preferredRestAfterDays ?? 3;

  const blockMin = blockMinForShift(shift, requirements);
  const blockMax = blockMaxForShift(shift, requirements);

  let score = stat.total * 100;

  // Balance รายเวร
  if (shift === 'ช') {
    score += stat.morning * 20;
  }

  if (shift === 'บ') {
    score += stat.evening * 25;

    const diff = stat.evening - stat.night;
    if (diff >= 1) score += diff * 150;
  }

  if (shift === 'ด') {
    score += stat.night * 30;

    const diff = stat.night - stat.evening;
    if (diff >= 1) score += diff * 150;
  }

  // พยายามจัด shift เดิมเป็น block ให้ครบขั้นต่ำก่อนเปลี่ยน
  if (sameShiftBlock > 0 && sameShiftBlock < blockMin) {
    score -= 300;
  }

  // หลังถึง block max ไม่ควรต่อ shift เดิม
  if (sameShiftBlock >= blockMax) {
    score += 900;
  }

  // พยายามพักหลังทำงานติด 3–5 วัน
  if (consecutiveDays >= preferredRestAfterDays + 1) {
    score += 1600;
  } else if (consecutiveDays >= preferredRestAfterDays) {
    score += 600;
  }

  // เติม Skill Mix
  if (needsSenior && isSenior(staff)) score -= 120;
  if (needsLeader && isLeader(staff)) score -= 120;

  if (
    needsSenior &&
    needsLeader &&
    isSenior(staff) &&
    isLeader(staff)
  ) {
    score -= 60;
  }

  return score;
}

function canAssignSingleShift(args: {
  staff: SchedulerStaff;
  shift: WorkShift;
  day: string;
  dayIndex: number;
  daysArray: string[];
  roster: Record<string, string>;
  previousDayRoster: Record<string, string>;
  approvedDayOffKeys: Set<string>;
  selectedMonth: string;
  requirements: SchedulerRequirements;
  preserveExisting: boolean;
}) {
  const {
    staff,
    shift,
    day,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster,
    approvedDayOffKeys,
    selectedMonth,
    requirements,
    preserveExisting,
  } = args;

  const key = rosterKey(staff.id, day);
  const currentCode = roster[key] || '';

  if (
    approvedDayOffKeys.has(
      dayOffKey(staff.id, selectedMonth, day)
    )
  ) {
    return false;
  }

  if (hasWorkingShift(currentCode)) return false;

  if (
    preserveExisting &&
    currentCode.trim() !== ''
  ) {
    return false;
  }

  if (
    wouldCreateNightToMorning(
      staff.id,
      dayIndex,
      shift,
      daysArray,
      roster,
      previousDayRoster
    )
  ) {
    return false;
  }

  const consecutiveDays = countConsecutiveWorkDaysBefore(
    staff.id,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster
  );

  const maxConsecutiveWorkDays =
    requirements.maxConsecutiveWorkDays ?? 5;

  if (consecutiveDays >= maxConsecutiveWorkDays) {
    return false;
  }

  if (shift === 'ด') {
    const consecutiveNight = countConsecutiveNightBefore(
      staff.id,
      dayIndex,
      daysArray,
      roster,
      previousDayRoster
    );

    const maxNight =
      requirements.maxConsecutiveNightShifts ?? 2;

    if (consecutiveNight >= maxNight) {
      return false;
    }
  }

  return true;
}

function getAllowedDoubleCode(
  currentCode: string,
  targetShift: WorkShift
): string | null {
  const shifts = parseShift(currentCode);

  if (shifts.length !== 1) return null;

  const currentShift = shifts[0];

  if (currentShift === targetShift) return null;

  // อนุญาต ช/บ
  if (
    (currentShift === 'ช' && targetShift === 'บ') ||
    (currentShift === 'บ' && targetShift === 'ช')
  ) {
    return 'ช/บ';
  }

  // อนุญาต ช/ด
  if (
    (currentShift === 'ช' && targetShift === 'ด') ||
    (currentShift === 'ด' && targetShift === 'ช')
  ) {
    return 'ช/ด';
  }

  // บ/ด = ห้ามเด็ดขาด
  return null;
}

function calculateMaxConsecutiveWorkDays(
  staffId: number | string,
  daysArray: string[],
  roster: Record<string, string>
) {
  let current = 0;
  let max = 0;

  daysArray.forEach((day) => {
    const code = roster[rosterKey(staffId, day)] || '';

    if (hasWorkingShift(code)) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  });

  return max;
}

function addOffCredits(
  rnStaff: SchedulerStaff[],
  daysArray: string[],
  roster: Record<string, string>,
  requirements: SchedulerRequirements,
  warnings: AutoScheduleWarning[]
) {
  const requiredOffDays = requirements.requiredOffDays ?? 0;
  const minActualOffDays = requirements.minActualOffDays ?? 4;
  const allowShiftOffCredit =
    requirements.allowShiftOffCredit ?? true;

  if (requiredOffDays <= 0) return;

  rnStaff.forEach((staff) => {
    let actualOffDays = daysArray.filter((day) =>
      isPureOff(roster[rosterKey(staff.id, day)])
    ).length;

    let offCreditDays = daysArray.filter((day) =>
      hasOffCredit(roster[rosterKey(staff.id, day)])
    ).length;

    // ถ้าวันหยุดจริงน้อยกว่าขั้นต่ำ จะไม่ใช้ /0 มาชดเชยจนกว่าจะเตือนก่อน
    if (actualOffDays < minActualOffDays) {
      warnings.push({
        day: '',
        shift: 'ช',
        type: 'ACTUAL_OFF_SHORTAGE',
        message:
          `${staff.full_name}: วันหยุดจริง 0 มี ${actualOffDays}/${minActualOffDays} วัน`,
      });
    }

    if (!allowShiftOffCredit) {
      if (offCreditDays < requiredOffDays) {
        warnings.push({
          day: '',
          shift: 'ช',
          type: 'OFF_CREDIT_SHORTAGE',
          message:
            `${staff.full_name}: สิทธิวันหยุด ${offCreditDays}/${requiredOffDays} วัน`,
        });
      }
      return;
    }

    let needed = Math.max(0, requiredOffDays - offCreditDays);

    if (needed <= 0) return;

    // เลือกวันที่เป็น single shift และยังไม่มี /0
    // ให้กระจาย /0 ออก ไม่ซ้อนวันหยุดจริง
    const candidates = daysArray
      .map((day) => ({
        day,
        code: roster[rosterKey(staff.id, day)] || '',
      }))
      .filter(({ code }) => {
        const shifts = parseShift(code);
        return shifts.length === 1 && !hasOffCredit(code);
      });

    for (const item of candidates) {
      if (needed <= 0) break;

      const shifts = parseShift(item.code);

      if (shifts.length !== 1) continue;

      const shift = shifts[0];
      roster[rosterKey(staff.id, item.day)] = `${shift}/0`;

      needed -= 1;
      offCreditDays += 1;
    }

    if (offCreditDays < requiredOffDays) {
      warnings.push({
        day: '',
        shift: 'ช',
        type: 'OFF_CREDIT_SHORTAGE',
        message:
          `${staff.full_name}: สิทธิวันหยุด ${offCreditDays}/${requiredOffDays} วัน`,
      });
    }
  });
}


type SupportRole = 'PN' | 'NA' | 'SUPPORT';

function supportRequirementForShift(
  role: SupportRole,
  shift: WorkShift,
  requirements: SchedulerRequirements
) {
  if (role === 'PN') {
    if (shift === 'ช') return requirements.morningPn ?? 0;
    if (shift === 'บ') return requirements.eveningPn ?? 0;
    return requirements.nightPn ?? 0;
  }

  if (role === 'NA') {
    if (shift === 'ช') return requirements.morningNa ?? 0;
    if (shift === 'บ') return requirements.eveningNa ?? 0;
    return requirements.nightNa ?? 0;
  }

  if (shift === 'ช') return requirements.morningSupport ?? 0;
  if (shift === 'บ') return requirements.eveningSupport ?? 0;
  return requirements.nightSupport ?? 0;
}

function supportStaffForRole(
  staffList: SchedulerStaff[],
  role: SupportRole
) {
  if (role === 'PN') return staffList.filter(isPn);
  if (role === 'NA') return staffList.filter(isNa);
  return staffList.filter(isSupportEmployee);
}

function getStaffInShift(
  staffList: SchedulerStaff[],
  roster: Record<string, string>,
  day: string,
  shift: WorkShift
) {
  return staffList.filter((staff) => {
    const code = roster[rosterKey(staff.id, day)] || '';
    return parseShift(code).includes(shift);
  });
}

function supportCandidateScore(args: {
  staff: SchedulerStaff;
  shift: WorkShift;
  dayIndex: number;
  daysArray: string[];
  roster: Record<string, string>;
  previousDayRoster: Record<string, string>;
  stats: Map<string, InternalStaffStat>;
  requirements: SchedulerRequirements;
}) {
  const {
    staff,
    shift,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster,
    stats,
    requirements,
  } = args;

  const stat = stats.get(String(staff.id)) || {
    total: 0,
    morning: 0,
    evening: 0,
    night: 0,
    doubleShiftDays: 0,
  };

  const consecutiveDays = countConsecutiveWorkDaysBefore(
    staff.id,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster
  );

  const sameShiftBlock = countSameShiftBlockBefore(
    staff.id,
    dayIndex,
    shift,
    daysArray,
    roster
  );

  const preferredRestAfterDays =
    requirements.preferredRestAfterDays ?? 3;

  const blockMin = blockMinForShift(shift, requirements);
  const blockMax = blockMaxForShift(shift, requirements);

  let score = stat.total * 100;

  if (shift === 'ช') score += stat.morning * 20;
  if (shift === 'บ') score += stat.evening * 25;
  if (shift === 'ด') score += stat.night * 30;

  if (sameShiftBlock > 0 && sameShiftBlock < blockMin) {
    score -= 250;
  }

  if (sameShiftBlock >= blockMax) {
    score += 700;
  }

  if (consecutiveDays >= preferredRestAfterDays + 1) {
    score += 1400;
  } else if (consecutiveDays >= preferredRestAfterDays) {
    score += 500;
  }

  return score;
}

function canAssignSupportSingleShift(args: {
  staff: SchedulerStaff;
  shift: WorkShift;
  day: string;
  dayIndex: number;
  daysArray: string[];
  roster: Record<string, string>;
  previousDayRoster: Record<string, string>;
  approvedDayOffKeys: Set<string>;
  selectedMonth: string;
  requirements: SchedulerRequirements;
  preserveExisting: boolean;
}) {
  const {
    staff,
    shift,
    day,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster,
    approvedDayOffKeys,
    selectedMonth,
    requirements,
    preserveExisting,
  } = args;

  const key = rosterKey(staff.id, day);
  const currentCode = roster[key] || '';

  if (
    approvedDayOffKeys.has(
      dayOffKey(staff.id, selectedMonth, day)
    )
  ) {
    return false;
  }

  if (!isAutoScheduled(staff)) return false;
  if (hasWorkingShift(currentCode)) return false;

  if (
    preserveExisting &&
    currentCode.trim() !== ''
  ) {
    return false;
  }

  if (
    wouldCreateNightToMorning(
      staff.id,
      dayIndex,
      shift,
      daysArray,
      roster,
      previousDayRoster
    )
  ) {
    return false;
  }

  const consecutiveDays = countConsecutiveWorkDaysBefore(
    staff.id,
    dayIndex,
    daysArray,
    roster,
    previousDayRoster
  );

  if (
    consecutiveDays >=
    (requirements.maxConsecutiveWorkDays ?? 5)
  ) {
    return false;
  }

  if (shift === 'ด') {
    const consecutiveNight = countConsecutiveNightBefore(
      staff.id,
      dayIndex,
      daysArray,
      roster,
      previousDayRoster
    );

    if (
      consecutiveNight >=
      (requirements.maxConsecutiveNightShifts ?? 2)
    ) {
      return false;
    }
  }

  return true;
}

function scheduleSupportRole(args: {
  role: SupportRole;
  allStaff: SchedulerStaff[];
  daysArray: string[];
  roster: Record<string, string>;
  approvedDayOffKeys: Set<string>;
  selectedMonth: string;
  previousDayRoster: Record<string, string>;
  requirements: SchedulerRequirements;
  preserveExisting: boolean;
  warnings: AutoScheduleWarning[];
}) {
  const {
    role,
    allStaff,
    daysArray,
    roster,
    approvedDayOffKeys,
    selectedMonth,
    previousDayRoster,
    requirements,
    preserveExisting,
    warnings,
  } = args;

  const allRoleStaff = supportStaffForRole(allStaff, role);
  const autoRoleStaff = allRoleStaff.filter(isAutoScheduled);

  // approved OFF เป็น Hard Rule
  allRoleStaff.forEach((staff) => {
    daysArray.forEach((day) => {
      const key = rosterKey(staff.id, day);

      if (
        approvedDayOffKeys.has(
          dayOffKey(staff.id, selectedMonth, day)
        )
      ) {
        roster[key] = '0';
      } else if (!preserveExisting && isAutoScheduled(staff)) {
        roster[key] = '';
      }
    });
  });

  const stats = initializeStats(
    allRoleStaff,
    daysArray,
    roster
  );

  daysArray.forEach((day, dayIndex) => {
    SHIFT_ORDER.forEach((shift) => {
      const required = supportRequirementForShift(
        role,
        shift,
        requirements
      );

      if (required <= 0) return;

      let staffInShift = getStaffInShift(
        allRoleStaff,
        roster,
        day,
        shift
      );

      while (staffInShift.length < required) {
        const candidates = autoRoleStaff
          .filter((staff) =>
            canAssignSupportSingleShift({
              staff,
              shift,
              day,
              dayIndex,
              daysArray,
              roster,
              previousDayRoster,
              approvedDayOffKeys,
              selectedMonth,
              requirements,
              preserveExisting,
            })
          )
          .sort((a, b) => {
            const scoreA = supportCandidateScore({
              staff: a,
              shift,
              dayIndex,
              daysArray,
              roster,
              previousDayRoster,
              stats,
              requirements,
            });

            const scoreB = supportCandidateScore({
              staff: b,
              shift,
              dayIndex,
              daysArray,
              roster,
              previousDayRoster,
              stats,
              requirements,
            });

            if (scoreA !== scoreB) return scoreA - scoreB;

            return String(a.full_name).localeCompare(
              String(b.full_name),
              'th'
            );
          });

        const selected = candidates[0];
        if (!selected) break;

        roster[rosterKey(selected.id, day)] = shift;
        addStat(selected.id, shift, stats);

        staffInShift = getStaffInShift(
          allRoleStaff,
          roster,
          day,
          shift
        );
      }

      const finalStaffInShift = getStaffInShift(
        allRoleStaff,
        roster,
        day,
        shift
      );

      if (finalStaffInShift.length < required) {
        warnings.push({
          day,
          shift,
          type:
            role === 'PN'
              ? 'PN_SHORTAGE'
              : role === 'NA'
              ? 'NA_SHORTAGE'
              : 'SUPPORT_SHORTAGE',
          message:
            `วันที่ ${Number(day)} เวร${shift}: ` +
            `${role === 'SUPPORT' ? 'พนง.' : role} ` +
            `${finalStaffInShift.length}/${required} คน`,
        });
      }
    });
  });

  // เติม 0 เฉพาะ staff auto
  autoRoleStaff.forEach((staff) => {
    daysArray.forEach((day) => {
      const key = rosterKey(staff.id, day);

      if (!roster[key] || roster[key].trim() === '') {
        roster[key] = '0';
      }
    });
  });
}

export function generateAutoSchedule(
  input: AutoScheduleInput
): AutoScheduleResult {
  const {
    staffList,
    daysArray,
    existingRoster,
    approvedDayOffKeys,
    selectedMonth,
    previousDayRoster = {},
    requirements,
    preserveExisting = true,
    targetGroup = 'all',
  } = input;

  const roster: Record<string, string> = {
    ...existingRoster,
  };

  const warnings: AutoScheduleWarning[] = [];

  const shouldScheduleNurse =
    targetGroup === 'all' || targetGroup === 'nurse';

  const shouldScheduleSupport =
    targetGroup === 'all' || targetGroup === 'support';

  // RN ทั้งหมดใช้สำหรับ "นับกำลังคน"
  // รวม RN ประจำ + fixed + part-time
  const allRnStaff = staffList.filter(isRn);

  // เฉพาะ RN mode=auto เท่านั้นที่ระบบมีสิทธิ์ Generate เวรเพิ่ม
  const autoRnStaff = allRnStaff.filter(isAutoScheduled);

  // 1) ใส่คำขอหยุด approved ก่อน
  // ใช้กับ RN ทุกคน เพราะคำขอหยุดที่อนุมัติแล้วเป็น Hard Rule
  allRnStaff.forEach((staff) => {
    daysArray.forEach((day) => {
      const key = rosterKey(staff.id, day);

      if (
        approvedDayOffKeys.has(
          dayOffKey(staff.id, selectedMonth, day)
        )
      ) {
        roster[key] = '0';
      } else if (!preserveExisting && isAutoScheduled(staff)) {
        // ล้างเพื่อ Generate ใหม่เฉพาะ staff แบบ auto เท่านั้น
        // fixed / part_time ต้องคงค่าที่กรอกหรือนำเข้าไว้
        roster[key] = '';
      }
    });
  });

  const stats = initializeStats(
    allRnStaff,
    daysArray,
    roster
  );

  // 2) จัด single shift ก่อน โดยพยายามเป็น block
  daysArray.forEach((day, dayIndex) => {
    SHIFT_ORDER.forEach((shift) => {
      const requiredRn = requirementForShift(
        shift,
        requirements
      );

      let staffInShift = getRnInShift(
        allRnStaff,
        roster,
        day,
        shift
      );

      while (staffInShift.length < requiredRn) {
        const seniorCount = staffInShift.filter(isSenior).length;
        const leaderCount = staffInShift.filter(isLeader).length;

        const needsSenior =
          seniorCount < requirements.seniorPerShift;

        const needsLeader =
          leaderCount < requirements.leaderPerShift;

        const candidates = (shouldScheduleNurse ? autoRnStaff : [])
          .filter((staff) =>
            canAssignSingleShift({
              staff,
              shift,
              day,
              dayIndex,
              daysArray,
              roster,
              previousDayRoster,
              approvedDayOffKeys,
              selectedMonth,
              requirements,
              preserveExisting,
            })
          )
          .sort((a, b) => {
            const scoreA = candidateScore({
              staff: a,
              shift,
              dayIndex,
              daysArray,
              roster,
              previousDayRoster,
              stats,
              requirements,
              needsSenior,
              needsLeader,
            });

            const scoreB = candidateScore({
              staff: b,
              shift,
              dayIndex,
              daysArray,
              roster,
              previousDayRoster,
              stats,
              requirements,
              needsSenior,
              needsLeader,
            });

            if (scoreA !== scoreB) {
              return scoreA - scoreB;
            }

            return String(a.full_name).localeCompare(
              String(b.full_name),
              'th'
            );
          });

        const selected = candidates[0];

        if (!selected) break;

        roster[rosterKey(selected.id, day)] = shift;
        addStat(selected.id, shift, stats);

        staffInShift = getRnInShift(
          allRnStaff,
          roster,
          day,
          shift
        );
      }
    });
  });

  // 3) ถ้ายังขาด และอนุญาตเวรควบ -> เติมเวรควบ
  if (requirements.allowDoubleShift ?? true) {
    daysArray.forEach((day, dayIndex) => {
      SHIFT_ORDER.forEach((shift) => {
        const requiredRn = requirementForShift(
          shift,
          requirements
        );

        let staffInShift = getRnInShift(
          allRnStaff,
          roster,
          day,
          shift
        );

        while (staffInShift.length < requiredRn) {
          const seniorCount = staffInShift.filter(isSenior).length;
          const leaderCount = staffInShift.filter(isLeader).length;

          const needsSenior =
            seniorCount < requirements.seniorPerShift;

          const needsLeader =
            leaderCount < requirements.leaderPerShift;

          const candidates = (shouldScheduleNurse ? autoRnStaff : [])
            .map((staff) => {
              const key = rosterKey(staff.id, day);
              const currentCode = roster[key] || '';

              if (
                approvedDayOffKeys.has(
                  dayOffKey(staff.id, selectedMonth, day)
                )
              ) {
                return null;
              }

              if (isProtectedNonWorkCode(currentCode)) {
                return null;
              }

              if (getShiftCount(currentCode) !== 1) {
                return null;
              }

              const doubleCode =
                getAllowedDoubleCode(currentCode, shift);

              if (!doubleCode) return null;

              // ไม่ให้สร้าง ด -> ช ผ่านเวรควบ
              if (
                wouldCreateNightToMorning(
                  staff.id,
                  dayIndex,
                  shift,
                  daysArray,
                  roster,
                  previousDayRoster
                )
              ) {
                return null;
              }

              if (shift === 'ด') {
                const consecutiveNight =
                  countConsecutiveNightBefore(
                    staff.id,
                    dayIndex,
                    daysArray,
                    roster,
                    previousDayRoster
                  );

                if (
                  consecutiveNight >=
                  (requirements.maxConsecutiveNightShifts ?? 2)
                ) {
                  return null;
                }
              }

              const stat = stats.get(String(staff.id)) || {
                total: 0,
                morning: 0,
                evening: 0,
                night: 0,
                doubleShiftDays: 0,
              };

              let score =
                stat.total * 100 +
                stat.doubleShiftDays * 600;

              if (needsSenior && isSenior(staff)) score -= 100;
              if (needsLeader && isLeader(staff)) score -= 100;

              // บ/ด balance
              if (shift === 'บ') {
                score += Math.max(
                  0,
                  stat.evening - stat.night
                ) * 150;
              }

              if (shift === 'ด') {
                score += Math.max(
                  0,
                  stat.night - stat.evening
                ) * 150;
              }

              return {
                staff,
                doubleCode,
                score,
              };
            })
            .filter(
              (
                item
              ): item is {
                staff: SchedulerStaff;
                doubleCode: string;
                score: number;
              } => item !== null
            )
            .sort((a, b) => a.score - b.score);

          const selected = candidates[0];

          if (!selected) break;

          const key = rosterKey(selected.staff.id, day);
          const oldShiftCount = getShiftCount(roster[key]);

          roster[key] = selected.doubleCode;

          addStat(
            selected.staff.id,
            shift,
            stats,
            oldShiftCount === 1
          );

          warnings.push({
            day,
            shift,
            type: 'DOUBLE_SHIFT_USED',
            message:
              `วันที่ ${Number(day)} ${selected.staff.full_name}: ใช้เวรควบ ${selected.doubleCode}`,
          });

          staffInShift = getRnInShift(
            allRnStaff,
            roster,
            day,
            shift
          );
        }
      });
    });
  }

  // 4) เติม 0 เฉพาะ RN ที่ระบบจัดอัตโนมัติ
  // fixed / part_time ช่องว่างต้องคงเป็นช่องว่าง
  if (shouldScheduleNurse) {
    autoRnStaff.forEach((staff) => {
      daysArray.forEach((day) => {
        const key = rosterKey(staff.id, day);

        if (!roster[key] || roster[key].trim() === '') {
          roster[key] = '0';
        }
      });
    });

    // 5) เติมเครดิตวันหยุดด้วย ช/0 บ/0 ด/0
    // เฉพาะบุคลากรประจำที่ระบบจัดอัตโนมัติ
    addOffCredits(
      autoRnStaff,
      daysArray,
      roster,
      requirements,
      warnings
    );
  }

  // 6) Final validation summary / warnings ฝั่งพยาบาล
  if (shouldScheduleNurse) {
    daysArray.forEach((day) => {
      SHIFT_ORDER.forEach((shift) => {
      const requiredRn = requirementForShift(
        shift,
        requirements
      );

      const finalStaffInShift = getRnInShift(
        allRnStaff,
        roster,
        day,
        shift
      );

      const seniorCount =
        finalStaffInShift.filter(isSenior).length;

      const leaderCount =
        finalStaffInShift.filter(isLeader).length;

      if (finalStaffInShift.length < requiredRn) {
        warnings.push({
          day,
          shift,
          type: 'RN_SHORTAGE',
          message:
            `วันที่ ${Number(day)} เวร${shift}: RN ` +
            `${finalStaffInShift.length}/${requiredRn} คน`,
        });
      }

      if (seniorCount < requirements.seniorPerShift) {
        warnings.push({
          day,
          shift,
          type: 'SENIOR_SHORTAGE',
          message:
            `วันที่ ${Number(day)} เวร${shift}: ` +
            `Expert/Proficient ${seniorCount}/${requirements.seniorPerShift} คน`,
        });
      }

      if (leaderCount < requirements.leaderPerShift) {
        warnings.push({
          day,
          shift,
          type: 'LEADER_SHORTAGE',
          message:
            `วันที่ ${Number(day)} เวร${shift}: ` +
            `หัวหน้าเวร ${leaderCount}/${requirements.leaderPerShift} คน`,
        });
      }
      });
    });
  }

  // 7) จัด PN / NA / พนง. ตามค่าจากหน้า Setting
  if (shouldScheduleSupport) {
    (['PN', 'NA', 'SUPPORT'] as SupportRole[]).forEach((role) => {
      scheduleSupportRole({
        role,
        allStaff: staffList,
        daysArray,
        roster,
        approvedDayOffKeys,
        selectedMonth,
        previousDayRoster,
        requirements,
        preserveExisting,
        warnings,
      });
    });
  }

  const resultStats: StaffScheduleStat[] =
    allRnStaff.map((staff) => {
      const stat = stats.get(String(staff.id)) || {
        total: 0,
        morning: 0,
        evening: 0,
        night: 0,
        doubleShiftDays: 0,
      };

      const actualOffDays = daysArray.filter((day) =>
        isPureOff(roster[rosterKey(staff.id, day)])
      ).length;

      const offCreditDays = daysArray.filter((day) =>
        hasOffCredit(roster[rosterKey(staff.id, day)])
      ).length;

      return {
        staffId: staff.id,
        totalShifts: stat.total,
        morning: stat.morning,
        evening: stat.evening,
        night: stat.night,
        actualOffDays,
        offCreditDays,
        doubleShiftDays: stat.doubleShiftDays,
        maxConsecutiveWorkDays:
          calculateMaxConsecutiveWorkDays(
            staff.id,
            daysArray,
            roster
          ),
      };
    });

  return {
    roster,
    warnings,
    stats: resultStats,
  };
}
