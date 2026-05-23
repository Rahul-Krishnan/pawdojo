import { createAdminClient } from "@/lib/supabase/admin";
import {
  evaluateAchievements,
  type AchievementDef,
  type AchievementState,
  type UserStats,
} from "./achievements";
import type { SessionData } from "./pipeline";

export async function handleAchievementCheck(
  data: SessionData
): Promise<{ achievementsUnlocked: string[] }> {
  const admin = createAdminClient();

  // Fetch all achievement definitions
  const { data: defs } = await admin
    .from("achievement_definitions")
    .select("*");

  if (!defs || defs.length === 0) {
    return { achievementsUnlocked: [] };
  }

  // Fetch current user achievement state
  const { data: userAchievements } = await admin
    .from("user_achievements")
    .select("*")
    .eq("user_id", data.userId);

  // Build user stats from DB
  const { data: profile } = await admin
    .from("user_profiles")
    .select("total_xp, current_streak")
    .eq("id", data.userId)
    .single();

  const { count: sessionCount } = await admin
    .from("training_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.userId);

  // Count completed lessons by skill key
  const { data: completions } = await admin
    .from("lesson_completions")
    .select("lesson_id, lessons(skill_id, skills(key))")
    .eq("user_id", data.userId);

  const completedLessonsBySkill: Record<string, number> = {};
  const countedLessons = new Set<string>();
  for (const c of completions ?? []) {
    const lesson = c.lessons as unknown as { skill_id: string; skills: { key: string } };
    if (lesson?.skills?.key && !countedLessons.has(c.lesson_id)) {
      countedLessons.add(c.lesson_id);
      completedLessonsBySkill[lesson.skills.key] =
        (completedLessonsBySkill[lesson.skills.key] ?? 0) + 1;
    }
  }

  // Count total lessons per skill key
  const { data: allLessons } = await admin
    .from("lessons")
    .select("skill_id, skills(key)");

  const totalLessonsPerSkill: Record<string, number> = {};
  for (const l of allLessons ?? []) {
    const skill = l.skills as unknown as { key: string };
    if (skill?.key) {
      totalLessonsPerSkill[skill.key] = (totalLessonsPerSkill[skill.key] ?? 0) + 1;
    }
  }

  // Check if any session has a 5-star rating
  const { count: perfectCount } = await admin
    .from("training_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.userId)
    .eq("rating", 5);

  // Fetch basic skill keys
  const { data: basicSkills } = await admin
    .from("skills")
    .select("key")
    .eq("category", "basics");

  const stats: UserStats = {
    currentStreak: profile?.current_streak ?? 0,
    totalSessions: sessionCount ?? 0,
    totalXp: profile?.total_xp ?? 0,
    completedLessonsBySkill,
    totalLessonsPerSkill,
    hasSessionRating5: (perfectCount ?? 0) > 0,
    basicSkillKeys: (basicSkills ?? []).map((s) => s.key),
  };

  const currentState: AchievementState[] = (userAchievements ?? []).map(
    (a) => ({
      achievementDefId: a.achievement_def_id,
      progress: a.progress,
      isUnlocked: a.unlocked_at !== null,
    })
  );

  const achievementDefs: AchievementDef[] = defs.map((d) => ({
    id: d.id,
    key: d.key,
    conditionType: d.condition_type,
    conditionValue: d.condition_value as Record<string, unknown>,
    xpReward: d.xp_reward,
  }));

  const result = evaluateAchievements(achievementDefs, stats, currentState);

  // Write progress updates
  for (const update of result.progressUpdates) {
    await admin.from("user_achievements").upsert(
      {
        user_id: data.userId,
        achievement_def_id: update.achievementDefId,
        progress: update.progress,
        unlocked_at:
          result.newlyUnlocked.includes(update.achievementDefId)
            ? new Date().toISOString()
            : null,
      },
      { onConflict: "user_id,achievement_def_id" }
    );
  }

  // Award XP for newly unlocked achievements
  const unlockedNames: string[] = [];
  for (const defId of result.newlyUnlocked) {
    const def = achievementDefs.find((d) => d.id === defId);
    if (def && def.xpReward > 0) {
      await admin.from("xp_transactions").insert({
        user_id: data.userId,
        action_type: "achievement_unlock",
        action_ref: defId,
        xp_amount: def.xpReward,
        idempotency_key: `${data.userId}:achievement:${defId}`,
      });

      // Update profile XP
      const { data: currentProfile } = await admin
        .from("user_profiles")
        .select("total_xp")
        .eq("id", data.userId)
        .single();

      if (currentProfile) {
        await admin
          .from("user_profiles")
          .update({
            total_xp: currentProfile.total_xp + def.xpReward,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.userId);
      }
    }
    if (def) unlockedNames.push(def.key);
  }

  return { achievementsUnlocked: unlockedNames };
}
