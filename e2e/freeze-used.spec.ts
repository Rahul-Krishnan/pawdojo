import { test, expect } from "playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_EMAIL, TEST_PASSWORD } from "./helpers";

// RK-12: the "Streak save used" notification. Seeds a missed-day-with-save
// state plus a freeze_used streak_event, advances the per-user localStorage
// marker to total-1, reloads, and asserts the notification renders the
// surviving-streak copy and the EFFECTIVE saves-remaining count (the value the
// streak tile shows, per the read/write divergence contract). Captures the
// screenshot used in the PR test plan. Requires a live dev server + Supabase +
// browsers; like the other e2e specs it is not run in CI.

type StreakRow = {
  dog_id: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  freeze_available: number;
};

let admin: SupabaseClient;
let userId: string;
let dogId: string;
let timezone: string;
let originalRow: StreakRow | null = null;
let seededEventId: number | null = null;

function daysAgo(tz: string, days: number): string {
  const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const past = new Date(todayLocal + "T00:00:00Z");
  past.setUTCDate(past.getUTCDate() - days);
  return past.toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: list } = await admin.auth.admin.listUsers();
  const user = list.users.find((u) => u.email === TEST_EMAIL);
  if (!user) throw new Error(`Test user ${TEST_EMAIL} not found`);
  userId = user.id;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("active_dog_id, timezone")
    .eq("id", userId)
    .single();
  const { data: dogs } = await admin
    .from("dogs")
    .select("id")
    .eq("user_id", userId)
    .order("created_at");
  if (!dogs || dogs.length === 0) throw new Error("Test user has no dogs");
  dogId = (profile?.active_dog_id as string) ?? (dogs[0].id as string);
  timezone = (profile?.timezone as string) ?? "UTC";

  const { data: existing } = await admin
    .from("dog_streaks")
    .select("*")
    .eq("dog_id", dogId)
    .maybeSingle();
  originalRow = existing as StreakRow | null;

  // Missed-day-with-save state: a 6-day streak whose last activity was one
  // missed day ago, with two stored saves. Read-time depletion consumes one for
  // the missed day, so the effective saves-remaining the modal shows is 1 while
  // the streak survives at 6 (mirrors RK-6 read-time logic).
  await admin.from("dog_streaks").upsert({
    dog_id: dogId,
    current_streak: 6,
    longest_streak: Math.max(originalRow?.longest_streak ?? 0, 6),
    last_streak_date: daysAgo(timezone, 2),
    freeze_available: 2,
  });

  // A consumed-save event so the dashboard's freeze_used running total is >= 1.
  const { data: inserted } = await admin
    .from("streak_events")
    .insert({ user_id: userId, event_type: "freeze_used", streak_value: 6 })
    .select("id")
    .single();
  seededEventId = (inserted?.id as number) ?? null;
});

test.afterAll(async () => {
  if (seededEventId !== null) {
    await admin.from("streak_events").delete().eq("id", seededEventId);
  }
  if (originalRow) {
    await admin.from("dog_streaks").upsert(originalRow);
  } else {
    await admin.from("dog_streaks").delete().eq("dog_id", dogId);
  }
});

test.describe('"Streak save used" notification (RK-12)', () => {
  test("renders after a save is consumed and shows the effective saves remaining", async ({
    page,
  }) => {
    // The gate advances the per-user seen-marker to the live total on the first
    // dashboard render, so prime it one behind the live freeze_used total BEFORE
    // logging in. That makes the first dashboard render fire the
    // once-per-consumption notification exactly as it would after a real save.
    const { count } = await admin
      .from("streak_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "freeze_used");
    const freezeTotal = count ?? 1;

    await page.goto("/login");
    await page.evaluate(
      ([uid, seen]) => {
        localStorage.setItem(
          `pawdojo-freeze-seen-${uid}`,
          JSON.stringify(seen)
        );
      },
      [userId, Math.max(0, freezeTotal - 1)] as [string, number]
    );
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await expect(
      page.getByText("A save protected your streak")
    ).toBeVisible();
    await expect(page.getByText("Streak save used")).toBeVisible();
    // The modal echoes the effective saves-remaining count (the same value the
    // streak tile shows, per the read/write divergence fix). Scope to the modal
    // dialog so it doesn't collide with the tile's identical text.
    const dialog = page.locator("div").filter({ hasText: "Streak save used" }).last();
    await expect(dialog.getByText("1 save remaining")).toBeVisible();
    await expect(page.getByRole("button", { name: "Got it" })).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/freeze-used-notification.png",
    });
  });
});
