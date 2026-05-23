// Pure XP calculation logic. No DB calls.

export type XPAction = "lesson_complete" | "session_log" | "rating_submit";

const XP_VALUES: Record<XPAction, number> = {
  lesson_complete: 10,
  session_log: 20,
  rating_submit: 5,
};

const DAILY_SESSION_XP_CAP = 200;
const FIRST_OF_DAY_BONUS = 5;

export type XPAwardInput = {
  action: XPAction;
  dailySessionXpSoFar: number;
  isFirstOfDay: boolean;
};

export type XPAwardResult = {
  baseAmount: number;
  bonus: number;
  totalAwarded: number;
  cappedAmount: number; // what was actually awarded after daily cap
  idempotencyKey: string;
};

export function calculateXPAward(
  input: XPAwardInput,
  userId: string,
  actionRef: string
): XPAwardResult {
  const baseAmount = XP_VALUES[input.action];
  const bonus = input.isFirstOfDay ? FIRST_OF_DAY_BONUS : 0;
  const totalBeforeCap = baseAmount + bonus;

  let cappedAmount = totalBeforeCap;

  // Apply daily cap only to session_log actions
  if (input.action === "session_log") {
    const remainingCap = Math.max(
      0,
      DAILY_SESSION_XP_CAP - input.dailySessionXpSoFar
    );
    cappedAmount = Math.min(totalBeforeCap, remainingCap);
  }

  const idempotencyKey = `${userId}:${input.action}:${actionRef}`;

  return {
    baseAmount,
    bonus,
    totalAwarded: totalBeforeCap,
    cappedAmount,
    idempotencyKey,
  };
}

export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}
