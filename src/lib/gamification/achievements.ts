// Pure achievement evaluation logic. No DB calls.

export type AchievementDef = {
  id: string;
  key: string;
  name: string;
  description: string;
  conditionType: string;
  conditionValue: Record<string, unknown>;
  xpReward: number;
};

export type UserStats = {
  currentStreak: number;
  totalSessions: number;
  totalXp: number;
  completedLessonsBySkill: Record<string, number>; // skill_key -> count
  totalLessonsPerSkill: Record<string, number>; // skill_key -> total
  hasSessionRating5: boolean;
  basicSkillKeys: string[];
};

export type AchievementState = {
  achievementDefId: string;
  progress: number;
  isUnlocked: boolean;
};

export type EvaluationResult = {
  newlyUnlocked: string[]; // achievement def IDs
  progressUpdates: { achievementDefId: string; progress: number }[];
};

export function evaluateAchievements(
  definitions: AchievementDef[],
  stats: UserStats,
  currentState: AchievementState[]
): EvaluationResult {
  const unlockedSet = new Set(
    currentState.filter((state) => state.isUnlocked).map((state) => state.achievementDefId)
  );

  const newlyUnlocked: string[] = [];
  const progressUpdates: { achievementDefId: string; progress: number }[] = [];

  for (const def of definitions) {
    if (unlockedSet.has(def.id)) continue;

    const { progress, met } = checkCondition(def, stats);

    if (met) {
      newlyUnlocked.push(def.id);
      progressUpdates.push({ achievementDefId: def.id, progress: 1 });
    } else if (progress > 0) {
      progressUpdates.push({ achievementDefId: def.id, progress });
    }
  }

  return { newlyUnlocked, progressUpdates };
}

function checkCondition(
  def: AchievementDef,
  stats: UserStats
): { progress: number; met: boolean } {
  const threshold = (def.conditionValue as { threshold?: number }).threshold ?? 0;
  const skillKey = (def.conditionValue as { skill_key?: string }).skill_key;

  switch (def.conditionType) {
    case "streak_days": {
      const progress = threshold > 0 ? stats.currentStreak / threshold : 0;
      return { progress: Math.min(progress, 1), met: stats.currentStreak >= threshold };
    }
    case "total_sessions": {
      const progress = threshold > 0 ? stats.totalSessions / threshold : 0;
      return { progress: Math.min(progress, 1), met: stats.totalSessions >= threshold };
    }
    case "total_completions": {
      const totalCompletions = Object.values(stats.completedLessonsBySkill).reduce(
        (sum, count) => sum + count,
        0
      );
      const progress = threshold > 0 ? totalCompletions / threshold : 0;
      return { progress: Math.min(progress, 1), met: totalCompletions >= threshold };
    }
    case "xp_total": {
      const progress = threshold > 0 ? stats.totalXp / threshold : 0;
      return { progress: Math.min(progress, 1), met: stats.totalXp >= threshold };
    }
    case "skill_complete": {
      if (!skillKey) return { progress: 0, met: false };
      const done = stats.completedLessonsBySkill[skillKey] ?? 0;
      const total = stats.totalLessonsPerSkill[skillKey] ?? 1;
      return { progress: done / total, met: done >= total };
    }
    case "all_basics_complete": {
      const allDone = stats.basicSkillKeys.every((key) => {
        const done = stats.completedLessonsBySkill[key] ?? 0;
        const total = stats.totalLessonsPerSkill[key] ?? 1;
        return done >= total;
      });
      const totalBasicsLessons = stats.basicSkillKeys.reduce(
        (sum, key) => sum + (stats.totalLessonsPerSkill[key] ?? 0),
        0
      );
      const doneBasicsLessons = stats.basicSkillKeys.reduce(
        (sum, key) => sum + (stats.completedLessonsBySkill[key] ?? 0),
        0
      );
      const progress = totalBasicsLessons > 0 ? doneBasicsLessons / totalBasicsLessons : 0;
      return { progress, met: allDone };
    }
    case "perfect_session": {
      return { progress: stats.hasSessionRating5 ? 1 : 0, met: stats.hasSessionRating5 };
    }
    default:
      return { progress: 0, met: false };
  }
}
