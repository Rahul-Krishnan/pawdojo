import { createAdminClient } from "@/lib/supabase/admin";
import { calculateStreakUpdate, type StreakState } from "./streaks";
import type { SessionData } from "./pipeline";

export async function handleStreakUpdate(
  data: SessionData
): Promise<{ streakUpdated: boolean }> {
  const admin = createAdminClient();

  let { data: streakRow } = await admin
    .from("dog_streaks")
    .select("*")
    .eq("dog_id", data.dogId)
    .single();

  if (!streakRow) {
    const { data: newRow } = await admin
      .from("dog_streaks")
      .insert({
        dog_id: data.dogId,
        current_streak: 0,
        longest_streak: 0,
        last_streak_date: null,
        freeze_available: 2,
      })
      .select()
      .single();
    streakRow = newRow;
  }

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

  await admin
    .from("dog_streaks")
    .update({
      current_streak: newState.currentStreak,
      longest_streak: newState.longestStreak,
      last_streak_date: newState.lastStreakDate,
      freeze_available: newState.freezeAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("dog_id", data.dogId);

  for (const event of events) {
    await admin.from("streak_events").insert({
      user_id: data.userId,
      event_type: event.eventType,
      streak_value: event.streakValue,
    });
  }

  return { streakUpdated: true };
}
