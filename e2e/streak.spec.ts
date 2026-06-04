import { test, expect } from "playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Visual regression test for RK-5: the streak must read as 0 once a day is
// missed, even though the stored dog_streaks.current_streak value is stale
// (it is only recomputed when a session is logged). This seeds the test
// account's streak into a missed-day state, renders the real dashboard, and
// asserts the displayed streak is 0. The original row is restored afterward.

const TEST_EMAIL = "rk2211@gmail.com";
const TEST_PASSWORD = "iamnotafool99";

type StreakRow = {
  dog_id: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  freeze_available: number;
};

let admin: SupabaseClient;
let dogId: string;
let originalRow: StreakRow | null = null;

function staleDateFor(timezone: string): string {
  // A date 5 days before "today" in the user's timezone. With freeze_available
  // at 0 this is well past the reset threshold, so the streak must read as 0.
  const todayLocal = new Date().toLocaleDateString("en-CA", {
    timeZone: timezone,
  });
  const past = new Date(todayLocal + "T00:00:00Z");
  past.setUTCDate(past.getUTCDate() - 5);
  return past.toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  // Playwright runs in its own process and does not load .env.local; the app
  // does. Load it here so the service-role admin client can connect.
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(
    ".env.local"
  );

  admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Resolve the test user, their active dog, and that dog's streak row,
  // mirroring how the dashboard picks the active dog.
  const { data: list } = await admin.auth.admin.listUsers();
  const user = list.users.find((u) => u.email === TEST_EMAIL);
  if (!user) throw new Error(`Test user ${TEST_EMAIL} not found`);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("active_dog_id, timezone")
    .eq("id", user.id)
    .single();

  const { data: dogs } = await admin
    .from("dogs")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at");
  if (!dogs || dogs.length === 0) throw new Error("Test user has no dogs");

  dogId = profile?.active_dog_id ?? dogs[0].id;
  const timezone = profile?.timezone ?? "UTC";

  // Snapshot the existing row so it can be restored after the test.
  const { data: existing } = await admin
    .from("dog_streaks")
    .select("*")
    .eq("dog_id", dogId)
    .maybeSingle();
  originalRow = existing;

  // Seed a non-zero stored streak whose last activity was 5 days ago with no
  // freezes left: the bug would render the stale 7, the fix renders 0.
  const stale: StreakRow = {
    dog_id: dogId,
    current_streak: 7,
    longest_streak: Math.max(originalRow?.longest_streak ?? 0, 7),
    last_streak_date: staleDateFor(timezone),
    freeze_available: 0,
  };
  await admin.from("dog_streaks").upsert(stale);
});

test.afterAll(async () => {
  // Restore the account to exactly its prior state.
  if (originalRow) {
    await admin.from("dog_streaks").upsert(originalRow);
  } else {
    await admin.from("dog_streaks").delete().eq("dog_id", dogId);
  }
});

async function login(page: import("playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("streak resets visually after a missed day (RK-5)", () => {
  test("dashboard shows 0 when the last activity was days ago", async ({
    page,
  }) => {
    await login(page);

    // The streak card is the button labelled "day focus". Its big number is
    // the current streak. Stored value is a stale 7; it must render as 0.
    const streakCard = page.locator('button:has-text("day focus")');
    await expect(streakCard).toBeVisible();
    await expect(streakCard.locator("span").first()).toHaveText("0");
    // No saves were available, so the "saves remaining" line must be absent.
    await expect(streakCard).not.toContainText("save");

    await page.screenshot({
      path: "e2e/screenshots/streak-reset-dashboard.png",
    });
  });

  test("progress focus modal shows current focus of 0 days", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/progress");

    // The visible progress card shows Best Focus (longest). Current focus
    // lives in the modal; open it and assert it reads 0 days.
    await page.locator('button:has-text("Best Focus")').click();
    const currentFocusRow = page.locator('div:has(> p:text("Current Focus"))');
    await expect(currentFocusRow).toContainText("0");
  });
});
