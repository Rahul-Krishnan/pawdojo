import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * RK-8 gap: gamification ORCHESTRATION — runGamificationPipeline wiring.
 *
 * The pipeline's only job is to run the three handlers IN ORDER (streak, then
 * XP, then achievements — achievements reads totals the first two write) and map
 * their results onto PipelineResult. The handlers themselves are covered in
 * streak-handler / xp-handler / achievement-handler tests, so here they are
 * stubbed; this file pins the sequencing and the result shape, which a handler
 * test cannot see.
 */

const handleStreakUpdate = vi.fn();
const handleXPAward = vi.fn();
const handleAchievementCheck = vi.fn();

vi.mock("@/lib/gamification/streak-handler", () => ({
  handleStreakUpdate: (...a: unknown[]) => handleStreakUpdate(...a),
}));
vi.mock("@/lib/gamification/xp-handler", () => ({
  handleXPAward: (...a: unknown[]) => handleXPAward(...a),
}));
vi.mock("@/lib/gamification/achievement-handler", () => ({
  handleAchievementCheck: (...a: unknown[]) => handleAchievementCheck(...a),
}));

const { runGamificationPipeline } = await import("@/lib/gamification/pipeline");

const data = {
  userId: "user-1",
  dogId: "dog-1",
  sessionId: "session-1",
  lessonId: "lesson-1",
  skillId: "skill-1",
  rating: 5,
};

beforeEach(() => {
  handleStreakUpdate.mockReset();
  handleXPAward.mockReset();
  handleAchievementCheck.mockReset();
});

describe("runGamificationPipeline", () => {
  it("maps each handler's result onto the combined PipelineResult", async () => {
    handleStreakUpdate.mockResolvedValue({ streakUpdated: true });
    handleXPAward.mockResolvedValue({ xpAwarded: 35 });
    handleAchievementCheck.mockResolvedValue({
      achievementsUnlocked: ["First Steps", "Hot Streak"],
    });

    const result = await runGamificationPipeline(data);

    expect(result).toEqual({
      streakUpdated: true,
      xpAwarded: 35,
      achievementsUnlocked: ["First Steps", "Hot Streak"],
    });
  });

  it("runs the handlers in order: streak, then XP, then achievements", async () => {
    const order: string[] = [];
    handleStreakUpdate.mockImplementation(async () => {
      order.push("streak");
      return { streakUpdated: false };
    });
    handleXPAward.mockImplementation(async () => {
      order.push("xp");
      return { xpAwarded: 0 };
    });
    handleAchievementCheck.mockImplementation(async () => {
      order.push("achievement");
      return { achievementsUnlocked: [] };
    });

    await runGamificationPipeline(data);

    expect(order).toEqual(["streak", "xp", "achievement"]);
  });

  it("passes the full session data through to each handler", async () => {
    handleStreakUpdate.mockResolvedValue({ streakUpdated: false });
    handleXPAward.mockResolvedValue({ xpAwarded: 0 });
    handleAchievementCheck.mockResolvedValue({ achievementsUnlocked: [] });

    await runGamificationPipeline(data);

    expect(handleStreakUpdate).toHaveBeenCalledWith(data);
    expect(handleXPAward).toHaveBeenCalledWith(data);
    expect(handleAchievementCheck).toHaveBeenCalledWith(data);
  });
});
