import { describe, it, expect } from "vitest";
import { calculateXPAward, calculateLevel, xpForLevel } from "@/lib/gamification/xp";
import { calculateStreakUpdate, StreakState } from "@/lib/gamification/streaks";
import { evaluateAchievements, AchievementDef, UserStats } from "@/lib/gamification/achievements";

// --- XP Edge Cases ---

describe("XP edge cases", () => {
  it("rating_submit action awards 5 XP", () => {
    const result = calculateXPAward(
      { action: "rating_submit", dailySessionXpSoFar: 0, isFirstOfDay: false },
      "user1",
      "rating1"
    );
    expect(result.baseAmount).toBe(5);
    expect(result.cappedAmount).toBe(5);
  });

  it("rating_submit is not subject to daily session cap", () => {
    const result = calculateXPAward(
      { action: "rating_submit", dailySessionXpSoFar: 999, isFirstOfDay: false },
      "user1",
      "rating1"
    );
    expect(result.cappedAmount).toBe(5);
  });

  it("first-of-day bonus with session_log near cap", () => {
    // 195 already earned, session_log base is 20 + 5 bonus = 25, but only 5 cap remaining
    const result = calculateXPAward(
      { action: "session_log", dailySessionXpSoFar: 195, isFirstOfDay: true },
      "user1",
      "session1"
    );
    expect(result.totalAwarded).toBe(25); // 20 base + 5 bonus
    expect(result.cappedAmount).toBe(5); // only 5 remaining
  });

  it("calculateLevel handles very large XP", () => {
    expect(calculateLevel(1000000)).toBe(100);
  });

  it("calculateLevel handles XP just below level threshold", () => {
    // Level 2 is at 400 XP (2*2*100)
    expect(calculateLevel(399)).toBe(1);
    expect(calculateLevel(400)).toBe(2);
  });

  it("xpForLevel and calculateLevel are inverses", () => {
    for (let level = 0; level <= 20; level++) {
      const xp = xpForLevel(level);
      expect(calculateLevel(xp)).toBe(level);
    }
  });
});

// --- Streak Edge Cases ---

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

describe("streak edge cases", () => {
  it("handles timezone correctly near midnight", () => {
    // 11:30 PM PDT on May 20 = May 21 06:30 UTC
    const lateNight = new Date("2026-05-21T06:30:00Z");
    const result = calculateStreakUpdate(
      freshState({ currentStreak: 1, lastStreakDate: "2026-05-20" }),
      lateNight,
      "America/Los_Angeles"
    );
    // Same day in Pacific timezone, should be no-op
    expect(result.events).toHaveLength(0);
  });

  it("handles timezone correctly when crossing midnight", () => {
    // 12:30 AM Pacific on May 21 = May 21 in PDT
    const afterMidnight = new Date("2026-05-21T07:30:00Z"); // 12:30 AM PDT
    const result = calculateStreakUpdate(
      freshState({ currentStreak: 1, lastStreakDate: "2026-05-20" }),
      afterMidnight,
      "America/Los_Angeles"
    );
    expect(result.newState.currentStreak).toBe(2);
    expect(result.newState.lastStreakDate).toBe("2026-05-21");
  });

  it("does not consume freeze when there are none", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 3,
        lastStreakDate: "2026-05-18",
        freezeAvailable: 0,
      }),
      makeDate("2026-05-20"),
      "America/Los_Angeles"
    );
    expect(result.newState.currentStreak).toBe(1); // reset
    expect(result.newState.freezeAvailable).toBe(0);
  });

  it("handles very long streaks", () => {
    const result = calculateStreakUpdate(
      freshState({
        currentStreak: 365,
        longestStreak: 365,
        lastStreakDate: "2026-05-19",
      }),
      makeDate("2026-05-20"),
      "America/Los_Angeles"
    );
    expect(result.newState.currentStreak).toBe(366);
    expect(result.newState.longestStreak).toBe(366);
  });
});

// --- Achievement Edge Cases ---

const defs: AchievementDef[] = [
  {
    id: "a1",
    key: "all_basics",
    name: "Basics Master",
    description: "Complete all basics",
    conditionType: "all_basics_complete",
    conditionValue: {},
    xpReward: 200,
  },
  {
    id: "a2",
    key: "unknown_type",
    name: "Unknown",
    description: "Unknown condition",
    conditionType: "made_up_condition",
    conditionValue: {},
    xpReward: 0,
  },
];

function baseStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    currentStreak: 0,
    totalSessions: 0,
    totalXp: 0,
    completedLessonsBySkill: {},
    totalLessonsPerSkill: { sit: 2, down: 2 },
    hasSessionRating5: false,
    basicSkillKeys: ["sit", "down"],
    ...overrides,
  };
}

describe("achievement edge cases", () => {
  it("all_basics_complete requires all basic skills fully done", () => {
    const result = evaluateAchievements(
      defs,
      baseStats({ completedLessonsBySkill: { sit: 2, down: 2 } }),
      []
    );
    expect(result.newlyUnlocked).toContain("a1");
  });

  it("all_basics_complete fails when one basic skill incomplete", () => {
    const result = evaluateAchievements(
      defs,
      baseStats({ completedLessonsBySkill: { sit: 2, down: 1 } }),
      []
    );
    expect(result.newlyUnlocked).not.toContain("a1");
    const progress = result.progressUpdates.find(
      (update) => update.achievementDefId === "a1"
    );
    expect(progress?.progress).toBeCloseTo(3 / 4); // 3 of 4 total basic lessons
  });

  it("unknown condition type returns zero progress", () => {
    const result = evaluateAchievements(defs, baseStats(), []);
    expect(result.newlyUnlocked).not.toContain("a2");
    const update = result.progressUpdates.find(
      (update) => update.achievementDefId === "a2"
    );
    expect(update).toBeUndefined(); // 0 progress, so no update
  });

  it("empty definitions array returns empty results", () => {
    const result = evaluateAchievements([], baseStats(), []);
    expect(result.newlyUnlocked).toHaveLength(0);
    expect(result.progressUpdates).toHaveLength(0);
  });

  it("all achievements already unlocked returns empty", () => {
    const allUnlocked = defs.map((def) => ({
      achievementDefId: def.id,
      progress: 1,
      isUnlocked: true,
    }));
    const result = evaluateAchievements(
      defs,
      baseStats({ completedLessonsBySkill: { sit: 2, down: 2 } }),
      allUnlocked
    );
    expect(result.newlyUnlocked).toHaveLength(0);
  });
});
