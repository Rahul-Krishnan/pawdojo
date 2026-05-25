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

export type Belt = {
  name: string;
  color: string;       // tailwind bg class
  textColor: string;   // tailwind text class
  minLevel: number;
};

const BELTS: Belt[] = [
  { name: "White Belt",  color: "bg-gray-100",    textColor: "text-gray-500",    minLevel: 0 },
  { name: "Yellow Belt", color: "bg-yellow-300",  textColor: "text-yellow-800",  minLevel: 2 },
  { name: "Orange Belt", color: "bg-orange-400",  textColor: "text-orange-900",  minLevel: 4 },
  { name: "Green Belt",  color: "bg-green-500",   textColor: "text-green-950",   minLevel: 6 },
  { name: "Blue Belt",   color: "bg-blue-500",    textColor: "text-blue-950",    minLevel: 8 },
  { name: "Purple Belt", color: "bg-purple-500",  textColor: "text-purple-950",  minLevel: 10 },
  { name: "Brown Belt",  color: "bg-amber-700",   textColor: "text-amber-100",   minLevel: 13 },
  { name: "Red Belt",    color: "bg-red-600",     textColor: "text-red-100",     minLevel: 16 },
  { name: "Black Belt",  color: "bg-gray-900",    textColor: "text-gray-100",    minLevel: 20 },
];

export function getBelt(level: number): Belt {
  let current = BELTS[0];
  for (const belt of BELTS) {
    if (level >= belt.minLevel) current = belt;
    else break;
  }
  return current;
}

export function getNextBelt(level: number): Belt | null {
  for (const belt of BELTS) {
    if (belt.minLevel > level) return belt;
  }
  return null;
}

export { BELTS };
