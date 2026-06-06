import { createAdminClient } from "@/lib/supabase/admin";
import { calculateXPAward, DAILY_SESSION_XP_CAP } from "./xp";
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
  const storedTimezone = profileRow?.timezone ?? "UTC";

  // eg for America/Los_Angeles (UTC-7), local midnight = 07:00 UTC. The write
  // side validates the timezone, but a value that predates that guard could
  // still throw a RangeError here. Fall back to UTC rather than break XP
  // awarding for that user on every session log (B1).
  const utcNow = new Date();
  let todayStartUtc: Date;
  try {
    const localNow = new Date(
      utcNow.toLocaleString("en-US", { timeZone: storedTimezone })
    );
    const tzOffsetMs = localNow.getTime() - utcNow.getTime();
    const todayLocal = utcNow.toLocaleDateString("en-CA", {
      timeZone: storedTimezone,
    });
    const dateParts = todayLocal.split("-").map(Number);
    const midnightUtcRaw = new Date(
      Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])
    );
    todayStartUtc = new Date(midnightUtcRaw.getTime() - tzOffsetMs);
  } catch {
    const todayLocal = utcNow.toISOString().slice(0, 10);
    const dateParts = todayLocal.split("-").map(Number);
    todayStartUtc = new Date(
      Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])
    );
  }

  // Scope the first-of-day check to session logs (S1). Counting all
  // xp_transactions let a lesson_complete earlier in the day suppress the
  // first-of-day session bonus.
  const { count: todayCount } = await admin
    .from("xp_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.userId)
    .eq("action_type", "session_log")
    .gte("awarded_at", todayStartUtc.toISOString());

  const isFirstOfDay = (todayCount ?? 0) === 0;

  let totalXpAwarded = 0;

  // Session XP is awarded by award_session_xp (migration 009), which sums the
  // day's prior session XP, applies the cap, and inserts inside a single
  // advisory-locked transaction. This closes the race where two concurrent
  // session logs each read the same sum and both insert past the daily cap.
  // dailySessionXpSoFar is 0 here only to obtain the uncapped amount and the
  // idempotency key; the authoritative cap lives in the RPC.
  const sessionResult = calculateXPAward(
    { action: "session_log", dailySessionXpSoFar: 0, isFirstOfDay },
    data.userId,
    data.sessionId
  );

  const { data: awardedSessionXp, error: sessionXpError } = await admin.rpc(
    "award_session_xp",
    {
      p_user_id: data.userId,
      p_action_ref: data.sessionId,
      p_idempotency_key: sessionResult.idempotencyKey,
      p_amount: sessionResult.totalAwarded,
      p_day_start: todayStartUtc.toISOString(),
      p_cap: DAILY_SESSION_XP_CAP,
    }
  );
  // Mirror the lesson-insert error handling below: only credit the award when
  // the RPC succeeded. A returned 0 is NOT an error: award_session_xp returns 0
  // by design on idempotent replay (migration 009, ON CONFLICT DO NOTHING), so
  // we key off the error field, never off the value.
  if (sessionXpError) {
    console.error("award_session_xp failed", sessionXpError);
  } else {
    totalXpAwarded += awardedSessionXp ?? 0;
  }

  if (data.lessonId) {
    const lessonResult = calculateXPAward(
      {
        action: "lesson_complete",
        dailySessionXpSoFar: 0,
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

  // Atomic XP increment (prevents lost updates under concurrent writes). Check
  // each RPC's error like the award above: a silent failure here would drop the
  // dog/user XP totals out of sync with the recorded transactions.
  if (totalXpAwarded > 0) {
    const { error: dogXpError } = await admin.rpc("increment_dog_xp", {
      dog_id_param: data.dogId,
      xp_amount: totalXpAwarded,
    });
    if (dogXpError) {
      console.error("increment_dog_xp failed", dogXpError);
    }
    const { error: userXpError } = await admin.rpc("increment_user_xp", {
      user_id_param: data.userId,
      xp_amount: totalXpAwarded,
    });
    if (userXpError) {
      console.error("increment_user_xp failed", userXpError);
    }
  }

  return { xpAwarded: totalXpAwarded };
}
