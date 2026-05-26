import { describe, it, expect } from "vitest";
import { calculateXPAward, calculateLevel, xpForLevel, getBelt, getNextBelt } from "@/lib/gamification/xp";
import { calculateStreakUpdate, StreakState } from "@/lib/gamification/streaks";
import { evaluateAchievements, AchievementDef, UserStats } from "@/lib/gamification/achievements";

// --- Per-Dog XP Isolation ---

describe("per-dog XP isolation", () => {
  it("XP awarded to one dog should not affect another dog's level", () => {
    // Dog A has 900 XP (level 3)
    const dogALevel = calculateLevel(900);
    expect(dogALevel).toBe(3);

    // Dog B has 100 XP (level 1)
    const dogBLevel = calculateLevel(100);
    expect(dogBLevel).toBe(1);

    // They should be independent
    expect(dogALevel).not.toBe(dogBLevel);
  });

  it("user aggregate XP should be sum of all dogs", () => {
    const dogAXp = 900;
    const dogBXp = 100;
    const userAggregateXp = dogAXp + dogBXp;
    const userLevel = calculateLevel(userAggregateXp);
    // User level from aggregate (1000 XP) = floor(sqrt(1000/100)) = floor(3.16) = 3
    expect(userLevel).toBe(3);
    // Dog B level should still be 1, not 3
    expect(calculateLevel(dogBXp)).toBe(1);
  });

  it("daily XP cap calculation is independent per calculation", () => {
    // If Dog A used 180 of 200 cap, awarding session XP with 180 already used
    const resultNearCap = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 180, isFirstOfDay: false },
      "user1",
      "session1"
    );
    expect(resultNearCap.cappedAmount).toBe(20); // only 20 remaining

    // A fresh calculation with 0 used should give full amount
    const resultFresh = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session2"
    );
    expect(resultFresh.cappedAmount).toBe(20);
  });
});

// --- Per-Dog Streak Isolation ---

describe("per-dog streak isolation", () => {
  const tz = "America/Los_Angeles";
  function makeDate(dateStr: string): Date {
    return new Date(dateStr + "T12:00:00-07:00");
  }

  it("two dogs can have independent streak states", () => {
    const dogAStreak: StreakState = {
      currentStreak: 7,
      longestStreak: 14,
      lastStreakDate: "2026-05-24",
      freezeAvailable: 2,
    };

    const dogBStreak: StreakState = {
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: null,
      freezeAvailable: 2,
    };

    // Activity on May 25 for Dog A (consecutive)
    const resultA = calculateStreakUpdate(dogAStreak, makeDate("2026-05-25"), tz);
    expect(resultA.newState.currentStreak).toBe(8);

    // Same activity for Dog B (first ever)
    const resultB = calculateStreakUpdate(dogBStreak, makeDate("2026-05-25"), tz);
    expect(resultB.newState.currentStreak).toBe(1);
  });

  it("freeze consumption for one dog does not affect another", () => {
    const dogAStreak: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      lastStreakDate: "2026-05-23",
      freezeAvailable: 1,
    };

    // Dog A uses freeze (2-day gap)
    const resultA = calculateStreakUpdate(dogAStreak, makeDate("2026-05-25"), tz);
    expect(resultA.newState.freezeAvailable).toBe(0);
    expect(resultA.newState.currentStreak).toBe(6);

    // Dog B with same dates but full freezes should also use one
    const dogBStreak: StreakState = {
      currentStreak: 3,
      longestStreak: 3,
      lastStreakDate: "2026-05-23",
      freezeAvailable: 2,
    };
    const resultB = calculateStreakUpdate(dogBStreak, makeDate("2026-05-25"), tz);
    expect(resultB.newState.freezeAvailable).toBe(1);
    expect(resultB.newState.currentStreak).toBe(4);
  });
});

// --- Per-Dog Achievement Evaluation ---

describe("per-dog achievement evaluation", () => {
  const defs: AchievementDef[] = [
    { id: "a1", key: "streak_3", name: "On a Roll", description: "", conditionType: "streak_days", conditionValue: { threshold: 3 }, xpReward: 50 },
    { id: "a2", key: "sessions_10", name: "Dedicated", description: "", conditionType: "total_sessions", conditionValue: { threshold: 10 }, xpReward: 100 },
    { id: "a3", key: "skill_sit", name: "Sit Expert", description: "", conditionType: "skill_complete", conditionValue: { skill_key: "sit" }, xpReward: 100 },
    { id: "a4", key: "first_lesson", name: "First Steps", description: "", conditionType: "total_completions", conditionValue: { threshold: 1 }, xpReward: 25 },
  ];

  it("achievements should evaluate against per-dog stats, not aggregate", () => {
    // Dog A: 3 streak, 5 sessions, completed 2 sit lessons
    const dogAStats: UserStats = {
      currentStreak: 3,
      totalSessions: 5,
      totalXp: 200,
      completedLessonsBySkill: { sit: 2 },
      totalLessonsPerSkill: { sit: 5 },
      hasSessionRating5: false,
      basicSkillKeys: ["sit"],
    };

    const resultA = evaluateAchievements(defs, dogAStats, []);
    expect(resultA.newlyUnlocked).toContain("a1"); // streak_3 met
    expect(resultA.newlyUnlocked).not.toContain("a2"); // only 5 sessions, need 10
    expect(resultA.newlyUnlocked).toContain("a4"); // first_lesson met (2 completions > 1)

    // Dog B: 0 streak, 8 sessions, completed 0 sit lessons
    const dogBStats: UserStats = {
      currentStreak: 0,
      totalSessions: 8,
      totalXp: 150,
      completedLessonsBySkill: {},
      totalLessonsPerSkill: { sit: 5 },
      hasSessionRating5: false,
      basicSkillKeys: ["sit"],
    };

    const resultB = evaluateAchievements(defs, dogBStats, []);
    expect(resultB.newlyUnlocked).not.toContain("a1"); // 0 streak
    expect(resultB.newlyUnlocked).not.toContain("a4"); // 0 completions
  });

  it("should not unlock skill_complete by combining completions across dogs", () => {
    // If Dog A has 3/5 sit lessons and Dog B has 2/5, the combined 5/5 should NOT unlock
    // Each dog should be evaluated independently
    const dogAStats: UserStats = {
      currentStreak: 0,
      totalSessions: 3,
      totalXp: 0,
      completedLessonsBySkill: { sit: 3 },
      totalLessonsPerSkill: { sit: 5 },
      hasSessionRating5: false,
      basicSkillKeys: ["sit"],
    };

    const resultA = evaluateAchievements(defs, dogAStats, []);
    expect(resultA.newlyUnlocked).not.toContain("a3"); // 3/5, not complete

    const dogBStats: UserStats = {
      currentStreak: 0,
      totalSessions: 2,
      totalXp: 0,
      completedLessonsBySkill: { sit: 2 },
      totalLessonsPerSkill: { sit: 5 },
      hasSessionRating5: false,
      basicSkillKeys: ["sit"],
    };

    const resultB = evaluateAchievements(defs, dogBStats, []);
    expect(resultB.newlyUnlocked).not.toContain("a3"); // 2/5, not complete
  });

  it("streak-based achievement with zero streak should show zero progress", () => {
    const stats: UserStats = {
      currentStreak: 0,
      totalSessions: 0,
      totalXp: 0,
      completedLessonsBySkill: {},
      totalLessonsPerSkill: {},
      hasSessionRating5: false,
      basicSkillKeys: [],
    };

    const result = evaluateAchievements(defs, stats, []);
    expect(result.newlyUnlocked).toHaveLength(0);
    const streakProgress = result.progressUpdates.find((u) => u.achievementDefId === "a1");
    // 0/3 = 0, so no progress update (progress > 0 check in evaluateAchievements)
    expect(streakProgress).toBeUndefined();
  });
});

// --- Belt System ---

describe("belt progression", () => {
  it("belt assignments are correct at boundary levels", () => {
    expect(getBelt(0).name).toBe("White Belt");
    expect(getBelt(1).name).toBe("White Belt");
    expect(getBelt(2).name).toBe("Yellow Belt");
    expect(getBelt(4).name).toBe("Orange Belt");
    expect(getBelt(6).name).toBe("Green Belt");
    expect(getBelt(8).name).toBe("Blue Belt");
    expect(getBelt(10).name).toBe("Purple Belt");
    expect(getBelt(13).name).toBe("Brown Belt");
    expect(getBelt(16).name).toBe("Red Belt");
    expect(getBelt(20).name).toBe("Black Belt");
  });

  it("getNextBelt returns correct next belt", () => {
    expect(getNextBelt(0)?.name).toBe("Yellow Belt");
    expect(getNextBelt(1)?.name).toBe("Yellow Belt");
    expect(getNextBelt(2)?.name).toBe("Orange Belt");
    expect(getNextBelt(19)?.name).toBe("Black Belt");
    expect(getNextBelt(20)).toBeNull();
    expect(getNextBelt(50)).toBeNull();
  });

  it("XP to level to belt round-trips correctly", () => {
    // 400 XP = level 2 = Yellow Belt
    expect(calculateLevel(400)).toBe(2);
    expect(getBelt(2).name).toBe("Yellow Belt");
    expect(xpForLevel(2)).toBe(400);

    // 3600 XP = level 6 = Green Belt
    expect(calculateLevel(3600)).toBe(6);
    expect(getBelt(6).name).toBe("Green Belt");
  });

  it("two dogs at different XP have different belts", () => {
    const dogABelt = getBelt(calculateLevel(5000)); // level 7 = Green Belt
    const dogBBelt = getBelt(calculateLevel(100));  // level 1 = White Belt
    expect(dogABelt.name).toBe("Green Belt");
    expect(dogBBelt.name).toBe("White Belt");
  });
});

// --- Streak Freeze Earn-Back ---

describe("streak freeze earn-back", () => {
  const tz = "America/Los_Angeles";
  function makeDate(dateStr: string): Date {
    return new Date(dateStr + "T12:00:00-07:00");
  }

  it("earns a freeze back at day 7", () => {
    const state: StreakState = {
      currentStreak: 6,
      longestStreak: 6,
      lastStreakDate: "2026-05-24",
      freezeAvailable: 0,
    };
    const result = calculateStreakUpdate(state, makeDate("2026-05-25"), tz);
    expect(result.newState.currentStreak).toBe(7);
    expect(result.newState.freezeAvailable).toBe(1);
  });

  it("earns a freeze back at day 14", () => {
    const state: StreakState = {
      currentStreak: 13,
      longestStreak: 13,
      lastStreakDate: "2026-05-24",
      freezeAvailable: 1,
    };
    const result = calculateStreakUpdate(state, makeDate("2026-05-25"), tz);
    expect(result.newState.currentStreak).toBe(14);
    expect(result.newState.freezeAvailable).toBe(2);
  });

  it("does not exceed max freezes of 2", () => {
    const state: StreakState = {
      currentStreak: 20,
      longestStreak: 20,
      lastStreakDate: "2026-05-24",
      freezeAvailable: 2,
    };
    const result = calculateStreakUpdate(state, makeDate("2026-05-25"), tz);
    expect(result.newState.currentStreak).toBe(21);
    expect(result.newState.freezeAvailable).toBe(2); // still 2, not 3. 21 % 7 = 0 but already at cap
  });

  it("does not earn freeze on non-multiple-of-7 days", () => {
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      lastStreakDate: "2026-05-24",
      freezeAvailable: 0,
    };
    const result = calculateStreakUpdate(state, makeDate("2026-05-25"), tz);
    expect(result.newState.currentStreak).toBe(6);
    expect(result.newState.freezeAvailable).toBe(0); // 6 is not divisible by 7
  });

  it("earns freeze even after using one (at correct day)", () => {
    // Start at day 6 with 1 freeze, skip a day (use freeze), land on day 7
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      lastStreakDate: "2026-05-23", // 2-day gap to May 25
      freezeAvailable: 1,
    };
    const result = calculateStreakUpdate(state, makeDate("2026-05-25"), tz);
    expect(result.newState.currentStreak).toBe(6); // freeze used, streak continues
    expect(result.events.some((ev) => ev.eventType === "freeze_used")).toBe(true);
    // Freeze consumed (1 -> 0), but 6 % 7 != 0 so no earn-back
    expect(result.newState.freezeAvailable).toBe(0);
  });
});

// --- XP Idempotency ---

describe("XP idempotency keys", () => {
  it("same user+action+ref produces same key", () => {
    const result1 = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session-abc"
    );
    const result2 = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session-abc"
    );
    expect(result1.idempotencyKey).toBe(result2.idempotencyKey);
  });

  it("different refs produce different keys", () => {
    const result1 = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session-abc"
    );
    const result2 = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session-xyz"
    );
    expect(result1.idempotencyKey).not.toBe(result2.idempotencyKey);
  });

  it("different users produce different keys for same session", () => {
    const result1 = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "session-abc"
    );
    const result2 = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user2",
      "session-abc"
    );
    expect(result1.idempotencyKey).not.toBe(result2.idempotencyKey);
  });
});
