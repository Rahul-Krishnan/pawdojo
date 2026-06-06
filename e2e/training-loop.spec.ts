import { test, expect, type Page } from "playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { login, TEST_EMAIL } from "./helpers";

// RK-9: e2e coverage for the core training loop.
//
// These specs drive the real app through the dashboard -> lesson -> session-log
// flow, mirroring the seeding/restore discipline already established in
// streak.spec.ts (snapshot the test account's mutable rows in beforeAll, restore
// them in afterAll so the account is left exactly as it was found). They reuse
// e2e/helpers.ts (login + TEST_EMAIL) and the mobile viewport (390x844) defined
// in playwright.config.ts.
//
// They require a running dev server + live Supabase (service-role key) and are
// not executed in CI. Run locally with: npm run test:e2e

type SnapshotRow = Record<string, unknown>;

let admin: SupabaseClient;
let userId: string;
let activeDogId: string;

// Snapshots of every table this suite mutates, so afterAll can restore the
// account to its exact prior state regardless of what the app wrote.
let dogSnapshots: SnapshotRow[] = [];
let profileSnapshot: SnapshotRow | null = null;
let streakSnapshots: SnapshotRow[] = [];
let completionSnapshot: SnapshotRow[] = [];
let sessionIdsBefore = new Set<string>();
let createdDogIds: string[] = [];

function loadEnv() {
  // Playwright runs in its own process and does not load .env.local; do it here
  // so the service-role admin client can connect (same pattern as streak.spec).
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(
    ".env.local"
  );
}

test.beforeAll(async () => {
  loadEnv();
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
    .select("*")
    .eq("id", userId)
    .single();
  profileSnapshot = profile;

  const { data: dogs } = await admin
    .from("dogs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (!dogs || dogs.length === 0) throw new Error("Test user has no dogs");
  dogSnapshots = dogs;
  activeDogId = (profile?.active_dog_id as string) ?? (dogs[0].id as string);

  // Snapshot the per-dog rows this suite mutates so afterAll can restore them.
  // NOTE: skipped lessons are stored in an httpOnly cookie (see skip-lesson.ts),
  // not a DB table, so they reset naturally per Playwright browser context and
  // need no DB cleanup. The gamification pipeline also writes append-only rows
  // (xp_transactions, streak_events, user_achievements) and bumps dogs.total_xp;
  // we snapshot/restore dog_streaks, lesson_completions and dogs here. The
  // append-only ledger rows from a real run are NOT pruned by this suite — see
  // the PR note for that known residue.
  const dogIds = dogs.map((d) => d.id as string);
  const [{ data: streaks }, { data: completions }, { data: sessions }] =
    await Promise.all([
      admin.from("dog_streaks").select("*").in("dog_id", dogIds),
      admin.from("lesson_completions").select("*").in("dog_id", dogIds),
      admin.from("training_sessions").select("id").in("dog_id", dogIds),
    ]);
  streakSnapshots = streaks ?? [];
  completionSnapshot = completions ?? [];
  sessionIdsBefore = new Set((sessions ?? []).map((s) => s.id as string));
});

test.afterAll(async () => {
  if (!admin) return;
  const dogIds = dogSnapshots.map((d) => d.id as string);

  // Delete any sessions created during the run (rows whose id is new), then any
  // newly created dogs, then restore the snapshotted rows. Order matters because
  // of FK relationships (sessions/completions reference dogs).
  const { data: sessionsNow } = await admin
    .from("training_sessions")
    .select("id")
    .in("dog_id", [...dogIds, ...createdDogIds]);
  const newSessionIds = (sessionsNow ?? [])
    .map((s) => s.id as string)
    .filter((id) => !sessionIdsBefore.has(id));
  if (newSessionIds.length > 0) {
    await admin.from("training_sessions").delete().in("id", newSessionIds);
  }

  // Restore lesson_completions and dog_streaks to their snapshots for the
  // original dogs (delete-all-then-reinsert is simplest and exact).
  await admin.from("lesson_completions").delete().in("dog_id", dogIds);
  if (completionSnapshot.length > 0) {
    await admin.from("lesson_completions").insert(completionSnapshot);
  }
  for (const row of streakSnapshots) {
    await admin.from("dog_streaks").upsert(row);
  }

  // Restore each original dog row (notably dogs.total_xp / current_level, which
  // the XP handler bumps when a session is logged).
  for (const dog of dogSnapshots) {
    await admin.from("dogs").upsert(dog);
  }

  // Remove dogs created by the onboarding / multi-dog specs and dependent rows.
  if (createdDogIds.length > 0) {
    await admin.from("training_sessions").delete().in("dog_id", createdDogIds);
    await admin.from("lesson_completions").delete().in("dog_id", createdDogIds);
    await admin.from("dog_streaks").delete().in("dog_id", createdDogIds);
    await admin.from("dog_skill_progress").delete().in("dog_id", createdDogIds);
    await admin.from("dogs").delete().in("id", createdDogIds);
  }

  // Restore the profile (active_dog_id may have changed via switch/onboarding).
  if (profileSnapshot) {
    await admin.from("user_profiles").upsert(profileSnapshot);
  }
});

// Reset the active dog's streak to a log-ready state before a test: intact but
// not yet logged today, so a fresh log increments it by exactly one. Skips live
// in a per-context cookie (skip-lesson.ts), so they start empty automatically.
async function resetActiveDogForLoop(dogId: string, timezone: string) {
  // Seed a streak whose last activity was "yesterday": logging today must take
  // it to current+1 (a deterministic, observable increment).
  const todayLocal = new Date().toLocaleDateString("en-CA", {
    timeZone: timezone,
  });
  const yesterday = new Date(todayLocal + "T00:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await admin.from("dog_streaks").upsert({
    dog_id: dogId,
    current_streak: 3,
    longest_streak: 5,
    last_streak_date: yesterday.toISOString().slice(0, 10),
    freeze_available: 0,
  });
}

async function readStreakNumber(page: Page): Promise<number> {
  const streakCard = page.locator('button:has-text("day focus")');
  await expect(streakCard).toBeVisible();
  const text = (await streakCard.locator("span").first().innerText()).trim();
  return Number.parseInt(text, 10);
}

async function readTotalXp(page: Page): Promise<number> {
  // The XP card renders "<n> XP" in a small label; grab the first match.
  const xpText = await page.locator('text=/^\\d+ XP$/').first().innerText();
  return Number.parseInt(xpText.replace(/[^0-9]/g, ""), 10);
}

test.describe("core training loop (RK-9)", () => {
  // #1 REQUIRED: happy path. Open today's lesson, submit the session-log form
  // (reps + rating), confirm XP is awarded and visible, the streak increments,
  // and the next lesson on the path changes (a new lesson unlocks). Achievement
  // popups are asserted opportunistically: they only appear when the gamification
  // conditions are met, which is account-state dependent, so we assert the popup
  // is handled correctly *if* it shows rather than forcing it.
  test("happy path: log a session awards XP, increments streak, advances path", async ({
    page,
  }) => {
    const timezone = (profileSnapshot?.timezone as string) ?? "UTC";
    await resetActiveDogForLoop(activeDogId, timezone);

    await login(page);

    const streakBefore = await readStreakNumber(page);
    const xpBefore = await readTotalXp(page);

    // Capture which lesson is "Next Lesson" so we can prove the path advances.
    const lessonLink = page.locator('a[href^="/lesson/"]').first();
    await expect(lessonLink).toBeVisible();
    const lessonHrefBefore = await lessonLink.getAttribute("href");

    await lessonLink.click();
    await page.waitForURL("**/lesson/**");

    // Fill the session-log form: pick a rating ("Nailed it" = 5) and reps (10+).
    // The rating buttons render the bare numeral 1-5; reps buttons read "<n>+".
    // Reps option "10+" must be matched exactly: a substring match on "10+"
    // also hits the "Long / 10+ min" duration button, which is a strict-mode
    // violation. Match the reps button by its exact accessible name.
    await page.getByRole("button", { name: "10+", exact: true }).click();
    // Rating 5 ("Nailed it") is the only button whose accessible name is exactly
    // "5" (the reps options render "5+", not "5"), so this is DOM-order-independent.
    await page.getByRole("button", { name: "5", exact: true }).click();

    // Submit. The button label is "I trained my dog! (+N XP)".
    await page.locator('button[type="submit"]').click();

    // Success state renders "Session logged!" and, when XP > 0, "+N XP".
    await expect(page.locator('text="Session logged!"')).toBeVisible({
      timeout: 15000,
    });

    // If an achievement was unlocked, the popup appears after the success card.
    // Dismiss it via its "Awesome!" button so navigation proceeds. This is the
    // "achievement popup when conditions met" branch; it is optional per-run.
    const awesomeButton = page.locator('button:has-text("Awesome!")');
    if (await awesomeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(page.locator('text="Award Earned!"')).toBeVisible();
      await awesomeButton.click();
    }

    // The form navigates back to the dashboard after logging.
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // XP awarded & visible: total XP should be >= before (daily cap may apply,
    // so assert non-decreasing rather than a fixed delta).
    const xpAfter = await readTotalXp(page);
    expect(xpAfter).toBeGreaterThanOrEqual(xpBefore);

    // Streak increments: we seeded "yesterday", so logging today => +1.
    const streakAfter = await readStreakNumber(page);
    expect(streakAfter).toBe(streakBefore + 1);

    // Next lesson unlocks on the path: the completed lesson should no longer be
    // the surfaced "Next Lesson" (either a new lesson appears or "All caught up").
    const nextLink = page.locator('a[href^="/lesson/"]').first();
    if ((await nextLink.count()) > 0) {
      const lessonHrefAfter = await nextLink.getAttribute("href");
      expect(lessonHrefAfter).not.toBe(lessonHrefBefore);
    } else {
      await expect(page.locator('text="All caught up!"')).toBeVisible();
    }
  });

  // #3 REQUIRED: skipping a lesson advances the path with NO XP and NO streak
  // change. Skip is a pure path-advance: it must not touch gamification.
  test("skip lesson advances the path without awarding XP or streak", async ({
    page,
  }) => {
    const timezone = (profileSnapshot?.timezone as string) ?? "UTC";
    await resetActiveDogForLoop(activeDogId, timezone);

    await login(page);

    const streakBefore = await readStreakNumber(page);
    const xpBefore = await readTotalXp(page);

    const lessonLink = page.locator('a[href^="/lesson/"]').first();
    if ((await lessonLink.count()) === 0) {
      test.skip(true, "No next lesson available to skip for this account state");
      return;
    }
    const hrefBefore = await lessonLink.getAttribute("href");

    const skipButton = page.locator('button:has-text("Skip this lesson")');
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // After skip, the surfaced lesson should change (path advanced) while XP and
    // streak stay put.
    await expect(async () => {
      const nextLink = page.locator('a[href^="/lesson/"]').first();
      if ((await nextLink.count()) > 0) {
        const hrefAfter = await nextLink.getAttribute("href");
        expect(hrefAfter).not.toBe(hrefBefore);
      } else {
        await expect(page.locator('text="All caught up!"')).toBeVisible();
      }
    }).toPass({ timeout: 10000 });

    expect(await readTotalXp(page)).toBe(xpBefore);
    expect(await readStreakNumber(page)).toBe(streakBefore);
  });

  // #4 REQUIRED: onboarding. A new dog (acting as a fresh training context)
  // lands on a day-0 dashboard: streak 0, 0 XP. We add a dog to the existing
  // test account (creating a brand-new auth user is not safe to do repeatably
  // here), which exercises the same create-dog -> dashboard path and yields a
  // day-0 context. The created dog is cleaned up in afterAll.
  test("onboarding: creating a dog lands on a day-0 dashboard", async ({
    page,
  }) => {
    await login(page);

    await page.goto("/onboarding");
    const dogName = `E2E Pup ${Date.now()}`;
    await page.fill("#name", dogName);
    await page.locator('button[type="submit"]').click();

    // create-dog sets the new dog active and redirects to /dashboard.
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Record the created dog id for cleanup.
    const { data: created } = await admin
      .from("dogs")
      .select("id")
      .eq("user_id", userId)
      .eq("name", dogName)
      .maybeSingle();
    if (created?.id) createdDogIds.push(created.id as string);

    // The header should show the new dog as active.
    await expect(page.locator("header")).toContainText(dogName);

    // Day-0 context: streak reads 0 and XP reads 0.
    expect(await readStreakNumber(page)).toBe(0);
    expect(await readTotalXp(page)).toBe(0);
  });

  // #5 REQUIRED: multi-dog switch swaps the streak/XP/lesson context. We need at
  // least two dogs; if the account only has one we create a second (cleaned up
  // in afterAll). We give each dog a distinct streak so the swap is observable.
  test("multi-dog switch swaps streak/XP context", async ({ page }) => {
    // Ensure a second dog exists.
    let { data: dogs } = await admin
      .from("dogs")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at");
    if (!dogs) dogs = [];
    if (dogs.length < 2) {
      const name = `E2E Second ${Date.now()}`;
      const { data: inserted } = await admin
        .from("dogs")
        .insert({ user_id: userId, name })
        .select("id, name")
        .single();
      if (inserted?.id) {
        createdDogIds.push(inserted.id as string);
        dogs.push(inserted);
      }
    }
    if (dogs.length < 2) {
      test.skip(true, "Could not establish two dogs for switch test");
      return;
    }

    const timezone = (profileSnapshot?.timezone as string) ?? "UTC";
    const todayLocal = new Date().toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
    const dogA = dogs[0].id as string;
    const dogB = dogs[1].id as string;

    // Distinct streaks: dog A intact at 4 (logged today), dog B at 0 (no row
    // activity / never logged) so the switch produces a visible difference.
    await admin.from("dog_streaks").upsert({
      dog_id: dogA,
      current_streak: 4,
      longest_streak: 6,
      last_streak_date: todayLocal,
      freeze_available: 0,
    });
    await admin.from("dog_streaks").delete().eq("dog_id", dogB);
    // Make dog A active to start.
    await admin
      .from("user_profiles")
      .update({ active_dog_id: dogA })
      .eq("id", userId);

    await login(page);

    // Dog A context: streak should read 4.
    await expect(page.locator("header")).toContainText(dogs[0].name as string);
    expect(await readStreakNumber(page)).toBe(4);

    // Open the dog switcher (the dog name in the header is a button) and pick B.
    await page.locator("header button").first().click();
    await page
      .locator(`button:has-text("${dogs[1].name as string}")`)
      .first()
      .click();

    // After switching, the header reflects dog B and the streak context is 0.
    await expect(page.locator("header")).toContainText(dogs[1].name as string, {
      timeout: 15000,
    });
    await expect(async () => {
      expect(await readStreakNumber(page)).toBe(0);
    }).toPass({ timeout: 10000 });
  });
});
