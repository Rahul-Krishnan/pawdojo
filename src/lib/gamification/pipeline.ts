import { handleStreakUpdate } from "./streak-handler";
import { handleXPAward } from "./xp-handler";
import { handleAchievementCheck } from "./achievement-handler";

export type SessionData = {
  userId: string;
  dogId: string;
  sessionId: string;
  lessonId: string | null;
  skillId: string | null;
  rating: number;
};

export type PipelineResult = {
  streakUpdated: boolean;
  xpAwarded: number;
  achievementsUnlocked: string[];
};

export async function runGamificationPipeline(
  data: SessionData
): Promise<PipelineResult> {
  // Run handlers in sequence: streak first (updates current_streak),
  // then XP (updates total_xp), then achievements (reads both).
  const streakResult = await handleStreakUpdate(data);
  const xpResult = await handleXPAward(data);
  const achievementResult = await handleAchievementCheck(data);

  return {
    streakUpdated: streakResult.streakUpdated,
    xpAwarded: xpResult.xpAwarded,
    achievementsUnlocked: achievementResult.achievementsUnlocked,
  };
}
