// Pure streak calculation logic. No DB calls.

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null; // YYYY-MM-DD in user's timezone
  freezeAvailable: number;
};

export type StreakEvent = {
  eventType: "activity" | "freeze_used" | "reset";
  streakValue: number;
};

export type StreakUpdate = {
  newState: StreakState;
  events: StreakEvent[];
};

function toLocalDate(timestamp: Date, timezone: string): string {
  return timestamp.toLocaleDateString("en-CA", { timeZone: timezone });
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// Read-time view of the streak. The stored `currentStreak` is only recomputed
// when an activity is logged, so a missed day leaves a stale value in the DB.
// This returns the streak as it should appear right now, given today's date:
// once the streak can no longer be continued, it reads as 0. The stored value
// is corrected on the next activity by calculateStreakUpdate.
export function effectiveCurrentStreak(
  state: StreakState,
  asOf: Date,
  timezone: string
): number {
  if (state.lastStreakDate === null) {
    return 0;
  }

  const todayLocal = toLocalDate(asOf, timezone);
  const gap = daysBetween(state.lastStreakDate, todayLocal);

  // Logged today (gap 0) or yesterday (gap 1): streak is intact.
  if (gap <= 1) {
    return state.currentStreak;
  }

  // One missed day, but a freeze can still save it if they train today.
  if (gap === 2 && state.freezeAvailable > 0) {
    return state.currentStreak;
  }

  // Gap too large, or no freeze to cover the miss: streak is broken.
  return 0;
}

export function calculateStreakUpdate(
  current: StreakState,
  activityAt: Date,
  timezone: string
): StreakUpdate {
  const todayLocal = toLocalDate(activityAt, timezone);
  const events: StreakEvent[] = [];

  // Same day: already credited
  if (current.lastStreakDate === todayLocal) {
    return { newState: current, events: [] };
  }

  let newStreak: number;

  if (current.lastStreakDate === null) {
    // First ever activity
    newStreak = 1;
  } else {
    const gap = daysBetween(current.lastStreakDate, todayLocal);

    if (gap === 1) {
      // Consecutive day
      newStreak = current.currentStreak + 1;
    } else if (gap === 2 && current.freezeAvailable > 0) {
      // 2-day gap with freeze available
      events.push({
        eventType: "freeze_used",
        streakValue: current.currentStreak,
      });
      newStreak = current.currentStreak + 1;
    } else {
      // Gap too large or no freeze: reset
      if (current.currentStreak > 0) {
        events.push({
          eventType: "reset",
          streakValue: current.currentStreak,
        });
      }
      newStreak = 1;
    }
  }

  events.push({ eventType: "activity", streakValue: newStreak });

  const freezeUsed = events.some((event) => event.eventType === "freeze_used");
  const MAX_FREEZES = 2;

  let newFreezeCount = freezeUsed
    ? current.freezeAvailable - 1
    : current.freezeAvailable;

  // Earn a save back every 7 consecutive days (cap at MAX_FREEZES)
  if (newStreak > 0 && newStreak % 7 === 0 && newFreezeCount < MAX_FREEZES) {
    newFreezeCount += 1;
  }

  const newState: StreakState = {
    currentStreak: newStreak,
    longestStreak: Math.max(current.longestStreak, newStreak),
    lastStreakDate: todayLocal,
    freezeAvailable: newFreezeCount,
  };

  return { newState, events };
}
