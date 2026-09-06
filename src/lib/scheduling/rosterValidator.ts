import {
  hasShift,
  isWorkingShift,
} from "./shiftParser";

export type RosterValidationError = {
  ruleCode: string;
  message: string;
  date?: string;
  previousDate?: string;
};

export function validateNightToMorning(
  previousShift: string | null | undefined,
  currentShift: string | null | undefined
): RosterValidationError | null {
  const previousHasNight = hasShift(
    previousShift,
    "ด"
  );

  const currentHasMorning = hasShift(
    currentShift,
    "ช"
  );

  if (previousHasNight && currentHasMorning) {
    return {
      ruleCode: "NIGHT_TO_MORNING",
      message:
        "ไม่อนุญาตให้ขึ้นเวรเช้า เนื่องจากมีเวรดึกจากวันก่อนหน้า",
    };
  }

  return null;
}

export function validateConsecutiveWorkDays(
  shifts: Array<{
    date: string;
    shift: string;
  }>,
  maxDays = 6
): RosterValidationError[] {
  const errors: RosterValidationError[] = [];

  let consecutiveDays = 0;

  for (const item of shifts) {
    if (isWorkingShift(item.shift)) {
      consecutiveDays++;

      if (consecutiveDays > maxDays) {
        errors.push({
          ruleCode:
            "MAX_CONSECUTIVE_WORK_DAYS",
          date: item.date,
          message:
            `ทำงานต่อเนื่องเกิน ${maxDays} วัน`,
        });
      }
    } else {
      consecutiveDays = 0;
    }
  }

  return errors;
}