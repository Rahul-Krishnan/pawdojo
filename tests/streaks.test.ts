import { describe, it, expect } from "vitest";
import {
  calculateStreakUpdate,
  effectiveCurrentStreak,
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

  it("always resets on 3+ day gap regardless of freeze", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 10,
        lastStreakDate: "2026-05-17",
        freezeAvailable: 2,
      }),
      makeDate("2026-05-20"),
      tz
    );
    expect(result.newState.currentStreak).toBe(1);
    expect(result.newState.freezeAvailable).toBe(2); // freeze not consumed
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

  it("resets to 0 after a 3-day gap even with freezes available", () => {
    const state = freshState({
      currentStreak: 10,
      lastStreakDate: "2026-05-17",
      freezeAvailable: 2,
    });
    expect(effectiveCurrentStreak(state, makeDate("2026-05-20"), tz)).toBe(0);
  });
});
