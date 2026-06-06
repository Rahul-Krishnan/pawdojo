// Pure streak calculation logic. No DB calls.
//
// Read/write divergence contract:
// The stored columns (`current_streak`, `freeze_available`) are the write-time
// baseline. They are mutated only when a session is logged, via
// calculateStreakUpdate. Between sessions they go stale: missed days are not
// reflected until the next log reconciles them. The `effective*` functions
// recompute the true value at read time from today's date and the user's
// timezone. The stored value and the effective value are EXPECTED to diverge
// between sessions; that divergence is by design, not a bug. Display surfaces
// must render the effective values, never the raw columns.

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null; // YYYY-MM-DD in user's timezone
  // Write-time baseline. Do not render directly: use effectiveFreezesRemaining,
  // which deducts saves consumed by missed days since the last logged session.
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

// The most saves a dog can ever bank. Enforced in code, not by a DB CHECK
// constraint, so every read and write path clamps against it.
const MAX_FREEZES = 2;

// freeze_available is an int column with no range constraint, so a corrupt or
// legacy row could fall outside [0, MAX_FREEZES]. Clamp before any display or
// arithmetic so an out-of-range stored value is never rendered or propagated.
function clampFreezes(freezeAvailable: number): number {
  return Math.max(0, Math.min(freezeAvailable, MAX_FREEZES));
}

function toLocalDate(timestamp: Date, timezone: string): string {
  return timestamp.toLocaleDateString("en-CA", { timeZone: timezone });
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// Whole days missed since the last streak day, as of `asOf` in the user's
// timezone. Logging today (gap 0) or yesterday (gap 1) means nothing was
// missed. This is the single source of truth for the missed-day count: the
// read-time streak view, the saves-remaining view, and the write-time update
// all call it, so they can never disagree about how many days lapsed.
function missedDays(
  lastStreakDate: string,
  asOf: Date,
  timezone: string
): number {
  const gap = daysBetween(lastStreakDate, toLocalDate(asOf, timezone));
  return Math.max(0, gap - 1);
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

  const missed = missedDays(state.lastStreakDate, asOf, timezone);

  // Each missed day costs one save. The streak survives as long as the
  // available saves cover every missed day; otherwise it is broken.
  if (missed <= clampFreezes(state.freezeAvailable)) {
    return state.currentStreak;
  }

  return 0;
}

// Shape of a dog_streaks DB row, as selected by the dashboard/progress pages.
export type DogStreakRow = {
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  freeze_available: number;
};

// Convenience wrapper over effectiveCurrentStreak that maps a raw dog_streaks
// row (snake_case columns) to the effective read-time streak. Returns 0 when
// the dog has no streak row yet.
export function effectiveCurrentStreakFromRow(
  row: DogStreakRow | null,
  asOf: Date,
  timezone: string
): number {
  if (!row) return 0;
  return effectiveCurrentStreak(
    {
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastStreakDate: row.last_streak_date,
      freezeAvailable: row.freeze_available,
    },
    asOf,
    timezone
  );
}

// Read-time view of saves remaining. Like effectiveCurrentStreak, the stored
// `freezeAvailable` is only reconciled when a session is logged, so a missed
// day leaves a stale count. This deducts one save per missed day as of today.
// Once missed days exceed the saves available the streak has broken and no
// saves remain. The stored value is corrected on the next logged session by
// calculateStreakUpdate.
export function effectiveFreezesRemaining(
  state: StreakState,
  asOf: Date,
  timezone: string
): number {
  const freeze = clampFreezes(state.freezeAvailable);

  if (state.lastStreakDate === null) {
    return freeze;
  }

  const missed = missedDays(state.lastStreakDate, asOf, timezone);

  if (missed === 0) {
    return freeze;
  }

  if (missed <= freeze) {
    return freeze - missed;
  }

  // Missed days exceed saves: the streak is broken, nothing left to show.
  return 0;
}

// Convenience wrapper over effectiveFreezesRemaining that maps a raw
// dog_streaks row (snake_case columns) to the effective read-time save count.
// Returns 0 when the dog has no streak row yet.
export function effectiveFreezesRemainingFromRow(
  row: DogStreakRow | null,
  asOf: Date,
  timezone: string
): number {
  if (!row) return 0;
  return effectiveFreezesRemaining(
    {
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastStreakDate: row.last_streak_date,
      freezeAvailable: row.freeze_available,
    },
    asOf,
    timezone
  );
}

// "Streak freeze used" notification detection.
//
// A freeze (save) is consumed inside calculateStreakUpdate when training
// resumes after a single missed day, which decrements the stored
// `freeze_available` and appends a `freeze_used` row to streak_events. From the
// user's perspective the "Saves Remaining" count silently drops between two
// dashboard views, which feels like an ambush. This helper detects whether a
// freeze was consumed since the user last acknowledged the count, so a
// one-time notification can explain the depletion.
//
// The signal is the running total of `freeze_used` events. `lastSeenCount` is
// the total the user has already been notified about (persisted client-side per
// user). When the live total exceeds it, at least one new freeze was consumed.
export type FreezeUsedDetection = {
  // Whether a "Streak freeze used" notification should be shown now.
  shouldNotify: boolean;
  // How many freezes were consumed since the last acknowledged view (>= 0).
  newlyConsumed: number;
  // The count to persist as acknowledged once the notification is shown.
  // Always equals the live total, so re-renders before the user dismisses the
  // notification don't double-count.
  acknowledgedCount: number;
};

export function detectFreezeUsed(
  freezeUsedTotal: number,
  lastSeenCount: number | null
): FreezeUsedDetection {
  // Guard against malformed inputs (NaN, negatives, undefined from storage).
  const total =
    Number.isFinite(freezeUsedTotal) && freezeUsedTotal > 0
      ? Math.floor(freezeUsedTotal)
      : 0;

  // A missing marker means the user has never been tracked. Treat the current
  // total as already-seen so we never replay historical freezes as if they
  // just happened on first ever load.
  if (lastSeenCount === null || !Number.isFinite(lastSeenCount)) {
    return { shouldNotify: false, newlyConsumed: 0, acknowledgedCount: total };
  }

  const seen = Math.max(0, Math.floor(lastSeenCount));
  const newlyConsumed = Math.max(0, total - seen);

  return {
    shouldNotify: newlyConsumed > 0,
    newlyConsumed,
    acknowledgedCount: total,
  };
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
  let newFreezeCount: number;

  if (current.lastStreakDate === null) {
    // First ever activity: start the streak, keep all saves.
    newStreak = 1;
    newFreezeCount = current.freezeAvailable;
  } else {
    const missed = missedDays(current.lastStreakDate, activityAt, timezone);

    if (missed <= current.freezeAvailable) {
      // Every missed day is covered by a save (missed 0 consumes none). The
      // streak continues; consume one save per missed day, logging each.
      const consumed = missed;
      for (let i = 0; i < consumed; i++) {
        events.push({
          eventType: "freeze_used",
          streakValue: current.currentStreak,
        });
      }
      newStreak = current.currentStreak + 1;
      newFreezeCount = current.freezeAvailable - consumed;
    } else {
      // Missed days exceed available saves: the streak breaks. Saves drain by
      // the amount that could be spent before the break. Since missed > freeze
      // this evaluates to 0, but expressing it this way keeps it correct by
      // construction rather than relying on a hardcoded literal.
      if (current.currentStreak > 0) {
        events.push({
          eventType: "reset",
          streakValue: current.currentStreak,
        });
      }
      newStreak = 1;
      newFreezeCount =
        current.freezeAvailable -
        Math.min(missed, current.freezeAvailable);
    }
  }

  events.push({ eventType: "activity", streakValue: newStreak });

  // Earn a save back every 7 consecutive days (cap at MAX_FREEZES). This runs
  // after consumption, so a returning session that both spends saves and
  // crosses a milestone settles to consumed-count first, then earns one back.
  // The same-day early return above guarantees this never fires on a repeat
  // log, so newFreezeCount can never exceed MAX_FREEZES.
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
