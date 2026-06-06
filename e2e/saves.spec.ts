import { test, expect } from "playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_EMAIL, TEST_PASSWORD } from "./helpers";

// Visual regression test for RK-6: the "Saves Remaining" count must deplete
// one save per missed day at read time, even though the stored
// dog_streaks.freeze_available value is stale (it is only reconciled when a
// session is logged). A static snapshot of "1 save remaining" cannot prove a
// decrement: a stored 1 and a computed-down-from-2 look identical on screen.
// This test instead holds freeze_available fixed at 2 and changes only the last
// activity date. With activity today (no missed day) the dashboard must render
// "2 saves remaining"; rewound two days (one missed day) the SAME stored 2 must
// render "1 save remaining". That difference proves the count is computed at
// read time, not read raw. The original row is restored afterward.

type StreakRow = {
  dog_id: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  freeze_available: number;
};

let admin: SupabaseClient;
let dogId: string;
let timezone: string;
let originalRow: StreakRow | null = null;

function daysAgoFor(tz: string, days: number): string {
  const todayLocal = new Date().toLocaleDateString("en-CA", {
    timeZone: tz,
  });
  const past = new Date(todayLocal + "T00:00:00Z");
  past.setUTCDate(past.getUTCDate() - days);
  return past.toISOString().slice(0, 10);
}

function seedRow(lastStreakDate: string): StreakRow {
  return {
    dog_id: dogId,
    current_streak: 5,
    longest_streak: Math.max(originalRow?.longest_streak ?? 0, 5),
    last_streak_date: lastStreakDate,
    freeze_available: 2,
  };
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
  timezone = profile?.timezone ?? "UTC";

  // Snapshot the existing row so it can be restored after the test.
  const { data: existing } = await admin
    .from("dog_streaks")
    .select("*")
    .eq("dog_id", dogId)
    .maybeSingle();
  originalRow = existing;
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

test.describe("saves deplete visually across a missed day (RK-6)", () => {
  test("the same stored two saves render as 2 today and 1 after a missed day", async ({
    page,
  }) => {
    await login(page);

    // The streak card is the button labelled "day focus".
    const streakCard = page.locator('button:has-text("day focus")');
    await expect(streakCard).toBeVisible();

    // Phase 1 - activity today, zero missed days. Stored freeze_available is 2,
    // and with no missed day the full inventory must show: "2 saves remaining".
    await admin.from("dog_streaks").upsert(seedRow(daysAgoFor(timezone, 0)));
    await page.reload();
    await expect(streakCard).toContainText("2 saves remaining");

    // Phase 2 - rewind the last activity to two days ago (one missed day)
    // WITHOUT touching freeze_available: the stored column is still 2. A
    // read-time computation must now render one fewer. If the page read the raw
    // column it would still say "2 saves remaining"; the fix makes it "1 save
    // remaining". The streak itself survives the single covered day, so the big
    // number stays non-zero.
    await admin.from("dog_streaks").upsert(seedRow(daysAgoFor(timezone, 2)));
    await page.reload();
    await expect(streakCard.locator("span").first()).toHaveText("5");
    await expect(streakCard).toContainText("1 save remaining");
    await expect(streakCard).not.toContainText("2 saves remaining");

    await page.screenshot({
      path: "e2e/screenshots/saves-decrement-dashboard.png",
    });
  });
});
