import { createAdminClient } from "@/lib/supabase/admin";
import { calculateStreakUpdate, type StreakState } from "./streaks";
import type { SessionData } from "./pipeline";

export async function handleStreakUpdate(
  data: SessionData
): Promise<{ streakUpdated: boolean }> {
  const admin = createAdminClient();

  // Fetch current streak state
  const { data: streakRow } = await admin
    .from("user_streaks")
    .select("*")
    .eq("user_id", data.userId)
    .single();

  if (!streakRow) {
    return { streakUpdated: false };
  }

  // Fetch user timezone from profile
  const { data: profile } = await admin
    .from("user_profiles")
    .select("timezone")
    .eq("id", data.userId)
    .single();

  const timezone = profile?.timezone ?? "UTC";

  const currentState: StreakState = {
    currentStreak: streakRow.current_streak,
    longestStreak: streakRow.longest_streak,
    lastStreakDate: streakRow.last_streak_date,
    freezeAvailable: streakRow.freeze_available,
  };

  const { newState, events } = calculateStreakUpdate(
    currentState,
    new Date(),
    timezone
  );

  // No change (same day activity)
  if (events.length === 0) {
    return { streakUpdated: false };
  }

  // Update streak record
  await admin
    .from("user_streaks")
    .update({
      current_streak: newState.currentStreak,
      longest_streak: newState.longestStreak,
      last_streak_date: newState.lastStreakDate,
      freeze_available: newState.freezeAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", data.userId);

  // Also update denormalized field on user_profiles
  await admin
    .from("user_profiles")
    .update({
      current_streak: newState.currentStreak,
      longest_streak: newState.longestStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.userId);

  // Log streak events
  for (const event of events) {
    await admin.from("streak_events").insert({
      user_id: data.userId,
      event_type: event.eventType,
      streak_value: event.streakValue,
    });
  }

  return { streakUpdated: true };
}
