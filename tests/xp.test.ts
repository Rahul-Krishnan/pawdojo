import { describe, it, expect } from "vitest";
import { calculateXPAward, calculateLevel, xpForLevel, getBelt, getNextBelt } from "@/lib/gamification/xp";

describe("calculateXPAward", () => {
  it("awards base XP for lesson completion", () => {
    const result = calculateXPAward(
      { action: "lesson_complete", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "lesson1"
    );
    expect(result.baseAmount).toBe(10);
    expect(result.cappedAmount).toBe(10);
  });

  it("awards base XP for session log", () => {
    const result = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session1"
    );
    expect(result.baseAmount).toBe(20);
    expect(result.cappedAmount).toBe(20);
  });

  it("adds first-of-day bonus", () => {
    const result = calculateXPAward(
      { action: "lesson_complete", dailySessionXpSoFar: 0, isFirstOfDay: true },
      "user1",
      "lesson1"
    );
    expect(result.bonus).toBe(5);
    expect(result.cappedAmount).toBe(15);
  });

  it("caps session XP at daily limit", () => {
    const result = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 190, isFirstOfDay: false },
      "user1",
      "session10"
    );
    expect(result.baseAmount).toBe(20);
    expect(result.cappedAmount).toBe(10); // only 10 remaining in cap
  });

  it("awards 0 when daily session cap is reached", () => {
    const result = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 200, isFirstOfDay: false },
      "user1",
      "session11"
    );
    expect(result.cappedAmount).toBe(0);
  });

  it("does not cap lesson completion XP", () => {
    const result = calculateXPAward(
      { action: "lesson_complete", dailySessionXpSoFar: 500, isFirstOfDay: false },
      "user1",
      "lesson99"
    );
    expect(result.cappedAmount).toBe(10); // no cap on lessons
  });

  it("generates unique idempotency key", () => {
    const result = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session1"
    );
    expect(result.idempotencyKey).toBe("user1:session_log:session1");
  });
});

describe("calculateLevel", () => {
  it("returns 0 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it("returns 1 at 100 XP", () => {
    expect(calculateLevel(100)).toBe(1);
  });

  it("returns 3 at 900 XP", () => {
    expect(calculateLevel(900)).toBe(3);
  });

  it("returns 10 at 10000 XP", () => {
    expect(calculateLevel(10000)).toBe(10);
  });
});

describe("xpForLevel", () => {
  it("level 1 requires 100 XP", () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it("level 5 requires 2500 XP", () => {
    expect(xpForLevel(5)).toBe(2500);
  });
});

describe("getBelt", () => {
  it("returns White Belt at level 0", () => {
    expect(getBelt(0).name).toBe("White Belt");
  });

  it("returns White Belt at level 1", () => {
    expect(getBelt(1).name).toBe("White Belt");
  });

  it("returns Yellow Belt at level 2", () => {
    expect(getBelt(2).name).toBe("Yellow Belt");
  });

  it("returns Green Belt at level 6", () => {
    expect(getBelt(6).name).toBe("Green Belt");
  });

  it("returns Black Belt at level 20", () => {
    expect(getBelt(20).name).toBe("Black Belt");
  });

  it("returns Black Belt at level 50 (beyond max)", () => {
    expect(getBelt(50).name).toBe("Black Belt");
  });
});

describe("getNextBelt", () => {
  it("returns Yellow Belt as next after level 0", () => {
    expect(getNextBelt(0)?.name).toBe("Yellow Belt");
  });

  it("returns null at max belt level", () => {
    expect(getNextBelt(20)).toBeNull();
  });

  it("returns Green Belt as next for level 5", () => {
    expect(getNextBelt(5)?.name).toBe("Green Belt");
  });
});
