import { createAdminClient } from "@/lib/supabase/admin";
import { calculateXPAward, calculateLevel } from "./xp";
import type { SessionData } from "./pipeline";

export async function handleXPAward(
  data: SessionData
): Promise<{ xpAwarded: number }> {
  const admin = createAdminClient();

  // Get today's session XP to check daily cap
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayXpRows } = await admin
    .from("xp_transactions")
    .select("xp_amount")
    .eq("user_id", data.userId)
    .eq("action_type", "session_log")
    .gte("awarded_at", todayStart.toISOString());

  const dailySessionXpSoFar = (todayXpRows ?? []).reduce(
    (sum, row) => sum + row.xp_amount,
    0
  );

  // Check if this is the first activity today
  const { count: todayCount } = await admin
    .from("xp_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.userId)
    .gte("awarded_at", todayStart.toISOString());

  const isFirstOfDay = (todayCount ?? 0) === 0;

  // Calculate XP for both session_log and lesson_complete
  let totalXpAwarded = 0;

  // Award XP for session log
  const sessionResult = calculateXPAward(
    { action: "session_log", dailySessionXpSoFar, isFirstOfDay },
    data.userId,
    data.sessionId
  );

  if (sessionResult.cappedAmount > 0) {
    const { error } = await admin.from("xp_transactions").insert({
      user_id: data.userId,
      action_type: "session_log",
      action_ref: data.sessionId,
      xp_amount: sessionResult.cappedAmount,
      idempotency_key: sessionResult.idempotencyKey,
    });
    if (!error) {
      totalXpAwarded += sessionResult.cappedAmount;
    }
  }

  // Award XP for lesson completion (if a lesson was completed)
  if (data.lessonId) {
    const lessonResult = calculateXPAward(
      {
        action: "lesson_complete",
        dailySessionXpSoFar: dailySessionXpSoFar + sessionResult.cappedAmount,
        isFirstOfDay: false,
      },
      data.userId,
      data.lessonId
    );

    const { error } = await admin.from("xp_transactions").insert({
      user_id: data.userId,
      action_type: "lesson_complete",
      action_ref: data.lessonId,
      xp_amount: lessonResult.cappedAmount,
      idempotency_key: lessonResult.idempotencyKey,
    });
    if (!error) {
      totalXpAwarded += lessonResult.cappedAmount;
    }
  }

  // Update dog with new totals (per-dog XP)
  if (totalXpAwarded > 0) {
    const { data: dogRow } = await admin
      .from("dogs")
      .select("total_xp")
      .eq("id", data.dogId)
      .single();

    const newTotalXp = (dogRow?.total_xp ?? 0) + totalXpAwarded;
    const newLevel = calculateLevel(newTotalXp);

    await admin
      .from("dogs")
      .update({
        total_xp: newTotalXp,
        current_level: Math.max(newLevel, 1),
      })
      .eq("id", data.dogId);

    // Also update user profile aggregate (for achievements)
    const { data: profile } = await admin
      .from("user_profiles")
      .select("total_xp")
      .eq("id", data.userId)
      .single();

    await admin
      .from("user_profiles")
      .update({
        total_xp: (profile?.total_xp ?? 0) + totalXpAwarded,
        current_level: Math.max(newLevel, 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.userId);
  }

  return { xpAwarded: totalXpAwarded };
}
