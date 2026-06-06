import { describe, it, expect } from "vitest";
import {
  calculateStreakUpdate,
  effectiveCurrentStreak,
  effectiveCurrentStreakFromRow,
  effectiveFreezesRemaining,
  effectiveFreezesRemainingFromRow,
  StreakState,
} from "@/lib/gamification/streaks";

const tz = "America/Los_Angeles";

function makeDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00-07:00");
}

function freshState(overrides: Partial<StreakState> = {}): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: null,
    freezeAvailable: 2,
    ...overrides,
  };
}

describe("calculateStreakUpdate", () => {
  it("starts a new streak on first activity", () => {
    const result = calculateStreakUpdate(
      freshState(),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(1);
    expect(result.newState.lastStreakDate).toBe("2026-05-20");
    expect(result.events).toHaveLength(1);
    expect(result.events[0].eventType).toBe("activity");
  });

  it("increments streak on consecutive day", () => {
    const result = calculateStreakUpdate(
      freshState({ currentStreak: 3, lastStreakDate: "2026-05-19" }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(4);
  });

  it("is a no-op on same day", () => {
    const state = freshState({
      currentStreak: 3,
      lastStreakDate: "2026-05-20",
    });
    const result = calculateStreakUpdate(state, makeDate("2026-05-20"), tz);
    expect(result.newState).toEqual(state);
    expect(result.events).toHaveLength(0);
  });

  it("uses freeze on 2-day gap when available", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 5,
        lastStreakDate: "2026-05-18",
        freezeAvailable: 2,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(6);
    expect(result.newState.freezeAvailable).toBe(1);
    expect(result.events.some((e) => e.eventType === "freeze_used")).toBe(true);
  });

  it("resets on 2-day gap without freeze", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 5,
        lastStreakDate: "2026-05-18",
        freezeAvailable: 0,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(1);
    expect(result.events.some((e) => e.eventType === "reset")).toBe(true);
  });

  it("updates longest streak when current exceeds it", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 10,
        longestStreak: 10,
        lastStreakDate: "2026-05-19",
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.longestStreak).toBe(11);
  });

  it("preserves longest streak on reset", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 3,
        longestStreak: 15,
        lastStreakDate: "2026-05-10",
        freezeAvailable: 0,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(1);
    expect(result.newState.longestStreak).toBe(15);
  });

  it("earns a save back at 7-day streak", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 6,
        lastStreakDate: "2026-05-19",
        freezeAvailable: 1,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(7);
    expect(result.newState.freezeAvailable).toBe(2);
  });

  it("does not exceed max saves of 2", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 13,
        lastStreakDate: "2026-05-19",
        freezeAvailable: 2,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(14);
    expect(result.newState.freezeAvailable).toBe(2);
  });

  it("consumes one save per missed day on a 3-day gap and keeps the streak", () => {
    // gap 3 => 2 missed days, 2 saves available => both consumed, streak survives.
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 10,
        lastStreakDate: "2026-05-17",
        freezeAvailable: 2,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(11);
    expect(result.newState.freezeAvailable).toBe(0);
    expect(
      result.events.filter((e) => e.eventType === "freeze_used")
    ).toHaveLength(2);
  });

  it("consumes exactly one save on a 2-day gap (one missed day)", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 5,
        lastStreakDate: "2026-05-18",
        freezeAvailable: 1,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(6);
    expect(result.newState.freezeAvailable).toBe(0);
    expect(
      result.events.filter((e) => e.eventType === "freeze_used")
    ).toHaveLength(1);
  });

  it("resets when missed days exceed saves, draining saves to 0", () => {
    // gap 4 => 3 missed days, only 2 saves => not covered, streak resets.
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 10,
        lastStreakDate: "2026-05-16",
        freezeAvailable: 2,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(1);
    expect(result.newState.freezeAvailable).toBe(0);
    expect(result.events.some((e) => e.eventType === "reset")).toBe(true);
  });

  it("applies earn-back after consumption when the new streak crosses a milestone", () => {
    // currentStreak 6, gap 3 => 2 missed, 2 saves consumed (freeze 2->0),
    // newStreak 7 hits the %7 milestone => earn one back => freeze 0->1.
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 6,
        lastStreakDate: "2026-05-17",
        freezeAvailable: 2,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(7);
    expect(result.newState.freezeAvailable).toBe(1);
    expect(
      result.events.filter((e) => e.eventType === "freeze_used")
    ).toHaveLength(2);
  });
});

describe("effectiveCurrentStreak", () => {
  it("is 0 when there has never been any activity", () => {
    const state = freshState({ currentStreak: 0, lastStreakDate: null });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(0);
  });

  it("shows the stored streak when activity was logged today", () => {
    const state = freshState({ currentStreak: 5, lastStreakDate: "2026-05-20" });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(5);
  });

  it("shows the stored streak when the last activity was yesterday", () => {
    const state = freshState({ currentStreak: 5, lastStreakDate: "2026-05-19" });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(5);
  });

  it("resets to 0 after a missed day with no freeze available", () => {
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-18",
      freezeAvailable: 0,
    });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(0);
  });

  it("keeps the streak through a single missed day when a freeze is available", () => {
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-18",
      freezeAvailable: 2,
    });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(5);
  });

  it("breaks after a 3-day gap when only one freeze covers two missed days", () => {
    const state = freshState({
      currentStreak: 10,
      lastStreakDate: "2026-05-17",
      freezeAvailable: 1,
    });
    // Gap of 3 days = 2 missed days, but only 1 save: streak breaks.
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(0);
  });

  it("keeps the streak through two missed days when two freezes cover them", () => {
    // gap 3 => 2 missed days, 2 saves => covered, streak still reads as intact.
    const state = freshState({
      currentStreak: 10,
      lastStreakDate: "2026-05-17",
      freezeAvailable: 2,
    });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(10);
  });
});

describe("effectiveFreezesRemaining", () => {
  it("returns the stored count when there has never been any activity", () => {
    const state = freshState({ lastStreakDate: null, freezeAvailable: 2 });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(2);
  });

  it("returns the stored count when no day has been missed", () => {
    // Logged yesterday: gap 1, no missed day, saves untouched.
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-19",
      freezeAvailable: 2,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(2);
  });

  it("depletes one save for a single missed day", () => {
    // gap 2 => 1 missed day, 2 saves => 1 remaining.
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-18",
      freezeAvailable: 2,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(1);
  });

  it("depletes to 0 when missed days equal the saves available", () => {
    // gap 3 => 2 missed days, 2 saves => 0 remaining.
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-17",
      freezeAvailable: 2,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(0);
  });

  it("reads as 0 once the streak has broken (missed days exceed saves)", () => {
    // gap 3 => 2 missed days, only 1 save => streak broke, no saves left.
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-17",
      freezeAvailable: 1,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(0);
  });
});

describe("effectiveFreezesRemaining clamps out-of-range stored values", () => {
  // freeze_available is an int column with no CHECK constraint, so a corrupt or
  // legacy row could hold a value outside [0, MAX_FREEZES]. The read path must
  // never render such a value verbatim; it clamps to the valid display range.
  it("caps a stored count above the max at the max", () => {
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-20",
      freezeAvailable: 5,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(2);
  });

  it("caps an over-max stored count even when there has never been activity", () => {
    const state = freshState({ lastStreakDate: null, freezeAvailable: 9 });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(2);
  });

  it("floors a negative stored count at 0", () => {
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-20",
      freezeAvailable: -1,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(0);
  });

  it("clamps the over-max value before deducting missed days", () => {
    // Stored 5 clamps to 2, then a single missed day deducts one => 1 remaining.
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-18",
      freezeAvailable: 5,
    });
    expect(
      effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)
    ).toBe(1);
  });
});

describe("read/write divergence (RK-6 contract)", () => {
  it("shows 0 saves before a milestone session that then earns one back", () => {
    // currentStreak 6, last activity three days ago: 2 missed days, 2 saves.
    // Read-time display spends both saves covering the missed days, so the
    // dashboard shows 0 remaining right now.
    const state = freshState({
      currentStreak: 6,
      lastStreakDate: "2026-05-17",
      freezeAvailable: 2,
    });
    expect(effectiveFreezesRemaining(state, makeDate("2026-05-20"), tz)).toBe(0);

    // Logging today continues the streak to 7, which crosses the 7-day
    // milestone and earns one save back, so the persisted value is 1. It
    // diverges from the 0 shown pre-session because the earn-back is only
    // realized when the session is actually logged. That divergence is by
    // design, per the read/write contract at the top of streaks.ts.
    const update = calculateStreakUpdate(state, makeDate("2026-05-20"), tz);
    expect(update.newState.currentStreak).toBe(7);
    expect(update.newState.freezeAvailable).toBe(1);
  });
});

describe("FromRow wrappers", () => {
  it("treat a missing streak row as zero saves remaining", () => {
    expect(
      effectiveFreezesRemainingFromRow(null, makeDate("2026-05-20"), tz)
    ).toBe(0);
  });

  it("maps a real row's columns and depletes one save for a missed day", () => {
    // Guards the snake_case -> camelCase mapping at the display call-site: a
    // mis-mapped freeze_available would slip past every pure-function test.
    // gap 2 => 1 missed day, stored freeze_available 2 => 1 remaining.
    expect(
      effectiveFreezesRemainingFromRow(
        {
          current_streak: 5,
          longest_streak: 10,
          last_streak_date: "2026-05-18",
          freeze_available: 2,
        },
        makeDate("2026-05-20"),
        tz
      )
    ).toBe(1);
  });

  it("respects the timezone when mapping a row's missed days", () => {
    // Same instant and row, different timezone => different missed-day verdict,
    // proving the wrapper forwards the timezone through to the pure function.
    const instant = new Date("2026-05-22T05:00:00Z");
    const row = {
      current_streak: 5,
      longest_streak: 10,
      last_streak_date: "2026-05-20",
      freeze_available: 2,
    };
    // UTC: 2026-05-22, gap 2 => 1 missed day => 1 save remaining.
    expect(effectiveFreezesRemainingFromRow(row, instant, "UTC")).toBe(1);
    // LA: still 2026-05-21 22:00, gap 1 => no missed day => 2 saves remaining.
    expect(
      effectiveFreezesRemainingFromRow(row, instant, "America/Los_Angeles")
    ).toBe(2);
  });

  it("treats a missing row as zero for the streak wrapper", () => {
    expect(
      effectiveCurrentStreakFromRow(null, makeDate("2026-05-20"), tz)
    ).toBe(0);
  });

  it("maps a real row's columns for the effective streak", () => {
    // gap 3 => 2 missed days, 1 save => streak broken, reads as 0.
    expect(
      effectiveCurrentStreakFromRow(
        {
          current_streak: 10,
          longest_streak: 12,
          last_streak_date: "2026-05-17",
          freeze_available: 1,
        },
        makeDate("2026-05-20"),
        tz
      )
    ).toBe(0);
  });
});

describe("timezone and midnight boundaries", () => {
  it("counts an evening activity as the same local day across the UTC boundary", () => {
    // 6pm PT is already past midnight UTC (01:00 the next day), but the local
    // day is unchanged. The stored last_streak_date is today, so this is a no-op.
    const eveningPT = new Date("2026-05-20T18:00:00-07:00"); // 2026-05-21 01:00 UTC
    const state = freshState({
      currentStreak: 4,
      lastStreakDate: "2026-05-20",
    });
    const result = calculateStreakUpdate(state, eveningPT, tz);
    expect(result.events).toHaveLength(0);
    expect(result.newState.currentStreak).toBe(4);
  });

  it("increments at the start of the next local day even after UTC already rolled over", () => {
    // 12:30am PT on the 20th is 07:30 UTC on the 20th. Local day is the 20th,
    // one day after the stored 19th, so the streak increments.
    const earlyPT = new Date("2026-05-20T00:30:00-07:00"); // 2026-05-20 07:30 UTC
    const state = freshState({
      currentStreak: 4,
      lastStreakDate: "2026-05-19",
    });
    const result = calculateStreakUpdate(state, earlyPT, tz);
    expect(result.newState.currentStreak).toBe(5);
  });

  it("reads as intact late on the same local day despite the UTC date advancing", () => {
    const lateNightPT = new Date("2026-05-20T23:30:00-07:00"); // 2026-05-21 06:30 UTC
    const state = freshState({ currentStreak: 7, lastStreakDate: "2026-05-20" });
    expect(effectiveCurrentStreak(state, lateNightPT, tz)).toBe(7);
  });

  it("respects the timezone when deciding whether a day was missed", () => {
    // Same instant, same stored state, different timezone => different verdict.
    const instant = new Date("2026-05-22T05:00:00Z");
    const state = freshState({
      currentStreak: 5,
      lastStreakDate: "2026-05-20",
      freezeAvailable: 0,
    });
    // In UTC this is 2026-05-22: two days missed, no freeze, streak is broken.
    expect(effectiveCurrentStreak(state, instant, "UTC")).toBe(0);
    // In LA this is still 2026-05-21 22:00: only yesterday, streak is intact.
    expect(effectiveCurrentStreak(state, instant, "America/Los_Angeles")).toBe(5);
  });
});
