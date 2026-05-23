import { describe, it, expect } from "vitest";
import {
  evaluateAchievements,
  AchievementDef,
  UserStats,
  AchievementState,
} from "@/lib/gamification/achievements";

const defs: AchievementDef[] = [
  { id: "a1", key: "streak_3", conditionType: "streak_days", conditionValue: { threshold: 3 }, xpReward: 50 },
  { id: "a2", key: "sessions_10", conditionType: "total_sessions", conditionValue: { threshold: 10 }, xpReward: 100 },
  { id: "a3", key: "xp_100", conditionType: "xp_total", conditionValue: { threshold: 100 }, xpReward: 25 },
  { id: "a4", key: "skill_sit", conditionType: "skill_complete", conditionValue: { skill_key: "sit" }, xpReward: 100 },
  { id: "a5", key: "perfect", conditionType: "perfect_session", conditionValue: {}, xpReward: 50 },
  { id: "a6", key: "first_lesson", conditionType: "total_completions", conditionValue: { threshold: 1 }, xpReward: 25 },
];

function baseStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    currentStreak: 0,
    totalSessions: 0,
    totalXp: 0,
    completedLessonsBySkill: {},
    totalLessonsPerSkill: { sit: 4, down: 3, stay: 3 },
    hasSessionRating5: false,
    basicSkillKeys: ["sit", "down", "stay", "recall"],
    ...overrides,
  };
}

describe("evaluateAchievements", () => {
  it("unlocks streak_3 when streak is 3", () => {
    const result = evaluateAchievements(defs, baseStats({ currentStreak: 3 }), []);
    expect(result.newlyUnlocked).toContain("a1");
  });

  it("does not unlock streak_3 when streak is 2", () => {
    const result = evaluateAchievements(defs, baseStats({ currentStreak: 2 }), []);
    expect(result.newlyUnlocked).not.toContain("a1");
  });

  it("tracks partial progress for streak", () => {
    const result = evaluateAchievements(defs, baseStats({ currentStreak: 1 }), []);
    const update = result.progressUpdates.find((u) => u.achievementDefId === "a1");
    expect(update?.progress).toBeCloseTo(1 / 3);
  });

  it("does not re-trigger already unlocked achievements", () => {
    const alreadyUnlocked: AchievementState[] = [
      { achievementDefId: "a1", progress: 1, isUnlocked: true },
    ];
    const result = evaluateAchievements(
      defs,
      baseStats({ currentStreak: 5 }),
      alreadyUnlocked
    );
    expect(result.newlyUnlocked).not.toContain("a1");
  });

  it("unlocks multiple achievements in one evaluation", () => {
    const result = evaluateAchievements(
      defs,
      baseStats({
        currentStreak: 3,
        totalXp: 100,
        hasSessionRating5: true,
        completedLessonsBySkill: { sit: 1 },
      }),
      []
    );
    expect(result.newlyUnlocked).toContain("a1"); // streak_3
    expect(result.newlyUnlocked).toContain("a3"); // xp_100
    expect(result.newlyUnlocked).toContain("a5"); // perfect
    expect(result.newlyUnlocked).toContain("a6"); // first_lesson
  });

  it("unlocks skill_complete when all lessons done", () => {
    const result = evaluateAchievements(
      defs,
      baseStats({ completedLessonsBySkill: { sit: 4 } }),
      []
    );
    expect(result.newlyUnlocked).toContain("a4");
  });

  it("does not unlock skill_complete when partial", () => {
    const result = evaluateAchievements(
      defs,
      baseStats({ completedLessonsBySkill: { sit: 2 } }),
      []
    );
    expect(result.newlyUnlocked).not.toContain("a4");
    const update = result.progressUpdates.find((u) => u.achievementDefId === "a4");
    expect(update?.progress).toBeCloseTo(0.5);
  });
});
