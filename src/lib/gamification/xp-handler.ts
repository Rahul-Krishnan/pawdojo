import { createAdminClient } from "@/lib/supabase/admin";
import { calculateXPAward, calculateLevel } from "./xp";
import type { SessionData } from "./pipeline";

export async function handleXPAward(
  data: SessionData
): Promise<{ xpAwarded: number }> {
  const admin = createAdminClient();

  // Fetch user timezone for correct day boundary
  const { data: profileRow } = await admin
    .from("user_profiles")
    .select("timezone")
    .eq("id", data.userId)
    .single();
  const timezone = profileRow?.timezone ?? "UTC";

  // Compute UTC timestamp of midnight in the user's local timezone
  // eg for America/Los_Angeles (UTC-7), local midnight = 07:00 UTC
  const utcNow = new Date();
  const localNow = new Date(utcNow.toLocaleString("en-US", { timeZone: timezone }));
  const tzOffsetMs = localNow.getTime() - utcNow.getTime();
  const todayLocal = utcNow.toLocaleDateString("en-CA", { timeZone: timezone });
  const dateParts = todayLocal.split("-").map(Number);
  const midnightUtcRaw = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
  const todayStartUtc = new Date(midnightUtcRaw.getTime() - tzOffsetMs);

  const { data: todayXpRows } = await admin
    .from("xp_transactions")
    .select("xp_amount")
    .eq("user_id", data.userId)
    .eq("action_type", "session_log")
    .gte("awarded_at", todayStartUtc.toISOString());

  const dailySessionXpSoFar = (todayXpRows ?? []).reduce(
    (sum, row) => sum + row.xp_amount,
    0
  );

  // Check if this is the first activity today
  const { count: todayCount } = await admin
    .from("xp_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.userId)
    .gte("awarded_at", todayStartUtc.toISOString());

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
      `${data.dogId}:${data.lessonId}`
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

  // Atomic XP increment (prevents lost updates under concurrent writes)
  if (totalXpAwarded > 0) {
    await admin.rpc("increment_dog_xp", { dog_id_param: data.dogId, xp_amount: totalXpAwarded });
    await admin.rpc("increment_user_xp", { user_id_param: data.userId, xp_amount: totalXpAwarded });
  }

  return { xpAwarded: totalXpAwarded };
}
