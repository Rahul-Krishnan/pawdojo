/**
 * Server-action INTEGRATION tests (RK-10).
 *
 * These tests drive the real server actions through the FULL server path:
 *   action -> gamification pipeline -> Supabase RPC / DB writes -> revalidation.
 * Unlike the unit suites (RK-8, pure logic) and the Playwright e2e suite (RK-9,
 * browser), this suite asserts the resulting DATABASE STATE produced by the
 * action, including idempotent replay, daily-cap, streak, achievement, and
 * per-dog isolation behaviour.
 *
 * ── DECISION + RATIONALE (recorded per RK-10) ───────────────────────────────
 * The issue prefers a real local Supabase (`supabase start`). However:
 *   1. The Supabase CLI is NOT installed in this dev environment, and
 *   2. CI (npm ci + eslint + vitest --run) has NO Supabase and never will.
 * A test that hard-requires a live DB would turn `npm test` red everywhere it
 * runs without a stack, which is unacceptable (CI must stay green).
 *
 * Therefore the ENTIRE suite is guarded by `describe.skipIf` on an env probe:
 *   - It RUNS only when SUPABASE_TEST_URL is set (a local/throwaway Supabase).
 *   - It SKIPS CLEANLY otherwise (CI, fresh worktree, no CLI) — zero failures.
 * There is no hard dependency on the supabase CLI in the default test run.
 *
 * ── HOW TO RUN (one command, when a local stack is available) ────────────────
 *   supabase start
 *   # then point the suite at the local stack and run vitest:
 *   SUPABASE_TEST_URL="http://127.0.0.1:54321" \
 *   SUPABASE_TEST_SERVICE_ROLE_KEY="<service_role key from `supabase start`>" \
 *     npm test
 *
 * The DB must have the migrations in supabase/migrations/ applied and the
 * achievement_definitions / skills+lessons rows present (supabase db reset
 * applies migrations + seed.sql). This suite additionally seeds its own
 * disposable skill + lessons and creates throwaway auth users, then cleans
 * them up in afterAll, so it does not depend on or mutate seed fixtures.
 */

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const TEST_URL = process.env.SUPABASE_TEST_URL;
const TEST_SERVICE_KEY =
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasStack = Boolean(TEST_URL && TEST_SERVICE_KEY);

// Point the app's own admin client (used inside the pipeline/handlers) at the
// SAME test DB. createAdminClient() reads NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY at call time, so setting them here is sufficient.
if (hasStack) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_SERVICE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "anon-not-used";
}

// ── Next.js runtime mocks ────────────────────────────────────────────────────
// Server actions call into the Next request runtime (cookies, revalidatePath,
// redirect) which has no meaning under plain vitest/node. We mock only that
// thin runtime boundary; everything below it (pipeline, handlers, RPCs, DB
// writes) runs for real against the test database.

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

// In-memory cookie jar so skip-lesson (which uses next/headers cookies) works.
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    getAll: () =>
      [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
  }),
}));

// Auth boundary. logSession/createDog/switchDog/deleteDog/skipLesson all call
// `await createClient()` then `supabase.auth.getUser()` for the caller identity,
// and a few read paths (dog ownership, lesson lookup). The service-role test
// client bypasses RLS, which is exactly how the real `createAdminClient`
// behaves on the server, so we back the mocked server client with it and pin
// the authenticated user per test via `setCurrentUser`.
let currentUserId: string | null = null;
function setCurrentUser(id: string | null) {
  currentUserId = id;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const { createClient: createSb } = await import("@supabase/supabase-js");
    const sb = createSb(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    // Override auth.getUser to return the test-pinned identity.
    return new Proxy(sb, {
      get(target, prop, receiver) {
        if (prop === "auth") {
          return {
            getUser: async () => ({
              data: { user: currentUserId ? { id: currentUserId } : null },
              error: null,
            }),
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  },
}));

// Imports AFTER mocks are registered (vi.mock is hoisted, but the dynamic env
// must be set first; static imports of the actions are fine here).
import { logSession } from "@/app/actions/log-session";
import { createDog } from "@/app/actions/create-dog";
import { switchDog } from "@/app/actions/switch-dog";
import { deleteDog } from "@/app/actions/delete-dog";
import { skipLesson } from "@/app/actions/skip-lesson";

// ── Test fixtures ────────────────────────────────────────────────────────────
let admin: SupabaseClient;
const createdUserIds: string[] = [];
let skillId: string;
let lessonIds: string[] = [];

async function makeUser(): Promise<string> {
  const email = `rk10-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message}`);
  }
  createdUserIds.push(data.user.id);
  // The on_auth_user_created trigger seeds user_profiles + user_streaks.
  // Pin a deterministic timezone so day-boundary math is stable.
  await admin
    .from("user_profiles")
    .update({ timezone: "UTC" })
    .eq("id", data.user.id);
  return data.user.id;
}

async function makeDog(userId: string, name: string): Promise<string> {
  const { data, error } = await admin
    .from("dogs")
    .insert({ user_id: userId, name })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insert dog failed: ${error?.message}`);
  return data.id;
}

async function setActiveDog(userId: string, dogId: string) {
  await admin
    .from("user_profiles")
    .update({ active_dog_id: dogId })
    .eq("id", userId);
}

async function dogXp(dogId: string): Promise<number> {
  const { data } = await admin
    .from("dogs")
    .select("total_xp")
    .eq("id", dogId)
    .single();
  return data?.total_xp ?? 0;
}

async function sessionXpRows(userId: string): Promise<number> {
  const { count } = await admin
    .from("xp_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action_type", "session_log");
  return count ?? 0;
}

const logForm = (overrides: Partial<Parameters<typeof logSession>[0]> = {}) => ({
  lessonId: lessonIds[0],
  skillId,
  rating: 4,
  reps: 5,
  durationMin: 10,
  notes: "",
  ...overrides,
});

describe.skipIf(!hasStack)("RK-10 server-action integration", () => {
  beforeAll(async () => {
    admin = createClient(TEST_URL!, TEST_SERVICE_KEY!, {
      auth: { persistSession: false },
    });

    // Seed a disposable skill + a couple of lessons we own and clean up.
    const skillKey = `rk10-skill-${randomUUID().slice(0, 8)}`;
    const { data: skill, error: skillErr } = await admin
      .from("skills")
      .insert({
        key: skillKey,
        name: "RK10 Test Skill",
        category: "basics",
        sort_order: 9999,
      })
      .select("id")
      .single();
    if (skillErr || !skill) {
      throw new Error(`seed skill failed: ${skillErr?.message}`);
    }
    skillId = skill.id;

    const { data: lessons, error: lessonErr } = await admin
      .from("lessons")
      .insert([
        { skill_id: skillId, title: "RK10 L1", lesson_order: 1, path_order: 9001 },
        { skill_id: skillId, title: "RK10 L2", lesson_order: 2, path_order: 9002 },
      ])
      .select("id");
    if (lessonErr || !lessons) {
      throw new Error(`seed lessons failed: ${lessonErr?.message}`);
    }
    lessonIds = lessons.map((l) => l.id);
  });

  afterAll(async () => {
    // Lessons/skill cascade is FK-guarded; delete dependent rows first.
    if (skillId) {
      await admin.from("lessons").delete().eq("skill_id", skillId);
      await admin.from("skills").delete().eq("id", skillId);
    }
    // Deleting the auth user cascades to profiles, dogs, sessions, xp, etc.
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  // ── log-session: full pipeline -> DB state ─────────────────────────────────
  describe("logSession drives the full gamification pipeline", () => {
    it("awards session XP, updates streak, and persists DB state on first log", async () => {
      const userId = await makeUser();
      const dogId = await makeDog(userId, "Rex");
      await setActiveDog(userId, dogId);
      setCurrentUser(userId);

      const result = await logSession(logForm());

      expect(result).toMatchObject({ success: true });
      // session_log (20) + first-of-day bonus (5) + lesson_complete (10) = 35
      expect(result.xpAwarded).toBe(35);
      expect(result.streakUpdated).toBe(true);

      // DB STATE: dog XP credited to match the awarded amount.
      expect(await dogXp(dogId)).toBe(35);

      // DB STATE: a training session row exists for this dog.
      const { count: sessionCount } = await admin
        .from("training_sessions")
        .select("id", { count: "exact", head: true })
        .eq("dog_id", dogId);
      expect(sessionCount).toBe(1);

      // DB STATE: streak advanced to 1 with today's date.
      const { data: streak } = await admin
        .from("dog_streaks")
        .select("current_streak, last_streak_date")
        .eq("dog_id", dogId)
        .single();
      expect(streak?.current_streak).toBe(1);

      // DB STATE: lesson completion recorded (first time, not a retake).
      const { count: completionCount } = await admin
        .from("lesson_completions")
        .select("id", { count: "exact", head: true })
        .eq("dog_id", dogId)
        .eq("lesson_id", lessonIds[0]);
      expect(completionCount).toBe(1);

      // Revalidation fired for the affected routes.
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("is idempotent on replay: re-running the SAME session ref does not double-credit XP", async () => {
      const userId = await makeUser();
      const dogId = await makeDog(userId, "Idem");
      await setActiveDog(userId, dogId);
      setCurrentUser(userId);

      const first = await logSession(logForm());
      expect(first.xpAwarded).toBe(35);
      const xpAfterFirst = await dogXp(dogId);
      const sessionXpAfterFirst = await sessionXpRows(userId);

      // Directly replay the gamification pipeline for the SAME session id to
      // exercise award_session_xp's ON CONFLICT DO NOTHING idempotency without
      // tripping the 2s soft rate-limit in the action wrapper.
      const { data: lastSession } = await admin
        .from("training_sessions")
        .select("id")
        .eq("dog_id", dogId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .single();

      const { runGamificationPipeline } = await import(
        "@/lib/gamification/pipeline"
      );
      const replay = await runGamificationPipeline({
        userId,
        dogId,
        sessionId: lastSession!.id,
        lessonId: lessonIds[0],
        skillId,
        rating: 4,
      });

      // Replay must award 0 session XP (idempotency key collision) and must NOT
      // create a new session_log xp_transactions row or re-credit the dog.
      expect(replay.xpAwarded).toBe(0);
      expect(await dogXp(dogId)).toBe(xpAfterFirst);
      expect(await sessionXpRows(userId)).toBe(sessionXpAfterFirst);
    });

    it("enforces the daily session-XP cap atomically across many logs", async () => {
      const userId = await makeUser();
      const dogId = await makeDog(userId, "Cappy");
      await setActiveDog(userId, dogId);
      setCurrentUser(userId);

      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);

      const { DAILY_SESSION_XP_CAP } = await import("@/lib/gamification/xp");

      // Drive award_session_xp directly for 20 distinct sessions of 20 XP each
      // (= 400 requested) and assert the persisted session XP never exceeds the
      // 200/day cap. This is the authoritative server-side cap path.
      let requested = 0;
      for (let i = 0; i < 20; i++) {
        const ref = randomUUID();
        await admin.rpc("award_session_xp", {
          p_user_id: userId,
          p_action_ref: ref,
          p_idempotency_key: `${userId}:session_log:${ref}`,
          p_amount: 20,
          p_day_start: dayStart.toISOString(),
          p_cap: DAILY_SESSION_XP_CAP,
        });
        requested += 20;
      }
      expect(requested).toBeGreaterThan(DAILY_SESSION_XP_CAP);

      const { data: rows } = await admin
        .from("xp_transactions")
        .select("xp_amount")
        .eq("user_id", userId)
        .eq("action_type", "session_log");
      const totalSessionXp = (rows ?? []).reduce(
        (sum, r) => sum + r.xp_amount,
        0
      );
      expect(totalSessionXp).toBe(DAILY_SESSION_XP_CAP);
    });

    it("evaluates achievements: a 5/5 session unlocks the perfect-rating achievement", async () => {
      const userId = await makeUser();
      const dogId = await makeDog(userId, "Ace");
      await setActiveDog(userId, dogId);
      setCurrentUser(userId);

      const result = await logSession(logForm({ rating: 5 }));
      expect(result.success).toBe(true);

      // DB STATE: the perfect_rating achievement def is unlocked for this user.
      const { data: def } = await admin
        .from("achievement_definitions")
        .select("id")
        .eq("key", "perfect_rating")
        .single();

      // Fail loudly if the def is missing/renamed (seed.sql is a documented
      // precondition for this suite) instead of silently skipping assertions.
      expect(def).toBeTruthy();

      const { data: ua } = await admin
        .from("user_achievements")
        .select("unlocked_at")
        .eq("user_id", userId)
        .eq("achievement_def_id", def!.id)
        .maybeSingle();
      expect(ua?.unlocked_at).toBeTruthy();
    });
  });

  // ── create / switch / delete dog: per-dog isolation ────────────────────────
  describe("dog lifecycle keeps per-dog stats and streaks isolated", () => {
    it("createDog inserts the dog and sets it active (redirects to dashboard)", async () => {
      const userId = await makeUser();
      setCurrentUser(userId);

      await expect(
        createDog({ name: "Fresh", breed: null, birthday: null })
      ).rejects.toThrow(/NEXT_REDIRECT/);

      const { data: profile } = await admin
        .from("user_profiles")
        .select("active_dog_id")
        .eq("id", userId)
        .single();
      expect(profile?.active_dog_id).toBeTruthy();

      const { data: dog } = await admin
        .from("dogs")
        .select("name")
        .eq("id", profile!.active_dog_id)
        .single();
      expect(dog?.name).toBe("Fresh");
    });

    it("XP and streak earned by the active dog do not leak to the other dog", async () => {
      const userId = await makeUser();
      const dogA = await makeDog(userId, "DogA");
      const dogB = await makeDog(userId, "DogB");

      // Log a session for dog A.
      await setActiveDog(userId, dogA);
      setCurrentUser(userId);
      const r = await logSession(logForm());
      expect(r.success).toBe(true);

      // Dog A has XP and a streak; dog B has neither.
      expect(await dogXp(dogA)).toBeGreaterThan(0);
      expect(await dogXp(dogB)).toBe(0);

      const { data: streakA } = await admin
        .from("dog_streaks")
        .select("current_streak")
        .eq("dog_id", dogA)
        .single();
      expect(streakA?.current_streak).toBe(1);

      const { data: streakB } = await admin
        .from("dog_streaks")
        .select("current_streak")
        .eq("dog_id", dogB)
        .maybeSingle();
      // Dog B never had a session: no streak row, or a zeroed one.
      expect(streakB?.current_streak ?? 0).toBe(0);

      // Sessions are scoped to dog A only.
      const { count: bSessions } = await admin
        .from("training_sessions")
        .select("id", { count: "exact", head: true })
        .eq("dog_id", dogB);
      expect(bSessions).toBe(0);
    });

    it("switchDog repoints the active dog without touching either dog's stats", async () => {
      const userId = await makeUser();
      const dogA = await makeDog(userId, "SwA");
      const dogB = await makeDog(userId, "SwB");
      await setActiveDog(userId, dogA);
      setCurrentUser(userId);

      const xpABefore = await dogXp(dogA);
      const xpBBefore = await dogXp(dogB);

      const result = await switchDog(dogB);
      expect(result).toMatchObject({ success: true });

      const { data: profile } = await admin
        .from("user_profiles")
        .select("active_dog_id")
        .eq("id", userId)
        .single();
      expect(profile?.active_dog_id).toBe(dogB);

      // Switching is a pointer change only; stats are untouched.
      expect(await dogXp(dogA)).toBe(xpABefore);
      expect(await dogXp(dogB)).toBe(xpBBefore);
    });

    it("deleteDog removes only that dog's data and reassigns active dog", async () => {
      const userId = await makeUser();
      const dogA = await makeDog(userId, "KeepA");
      const dogB = await makeDog(userId, "DropB");

      // Give dog B some activity, then delete it.
      await setActiveDog(userId, dogB);
      setCurrentUser(userId);
      await logSession(logForm());
      expect(await dogXp(dogB)).toBeGreaterThan(0);

      const result = await deleteDog(dogB);
      expect(result).toMatchObject({ success: true });

      // Dog B and its dependent rows are gone (FK cascade).
      const { data: goneDog } = await admin
        .from("dogs")
        .select("id")
        .eq("id", dogB)
        .maybeSingle();
      expect(goneDog).toBeNull();

      const { count: bSessions } = await admin
        .from("training_sessions")
        .select("id", { count: "exact", head: true })
        .eq("dog_id", dogB);
      expect(bSessions).toBe(0);

      // Active dog reassigned to the surviving dog.
      const { data: profile } = await admin
        .from("user_profiles")
        .select("active_dog_id")
        .eq("id", userId)
        .single();
      expect(profile?.active_dog_id).toBe(dogA);

      // Dog A is untouched.
      const { data: stillA } = await admin
        .from("dogs")
        .select("id")
        .eq("id", dogA)
        .single();
      expect(stillA?.id).toBe(dogA);
    });

    it("deleteDog refuses to delete the user's only dog", async () => {
      const userId = await makeUser();
      const onlyDog = await makeDog(userId, "Solo");
      await setActiveDog(userId, onlyDog);
      setCurrentUser(userId);

      const result = await deleteDog(onlyDog);
      expect(result).toMatchObject({ error: expect.stringMatching(/only dog/i) });

      // Still present.
      const { data: dog } = await admin
        .from("dogs")
        .select("id")
        .eq("id", onlyDog)
        .single();
      expect(dog?.id).toBe(onlyDog);
    });
  });

  // ── skip-lesson: advances path, no XP/streak side effects ──────────────────
  describe("skipLesson advances the path with no gamification side effects", () => {
    it("records the skip without awarding XP, sessions, or streak changes", async () => {
      const userId = await makeUser();
      const dogId = await makeDog(userId, "Skipper");
      await setActiveDog(userId, dogId);
      setCurrentUser(userId);
      cookieJar.clear();

      const xpBefore = await dogXp(dogId);
      const sessionXpBefore = await sessionXpRows(userId);

      const result = await skipLesson(lessonIds[1]);
      expect(result).toMatchObject({ success: true });

      // No XP credited, no session_log transactions, no dog XP change.
      expect(await dogXp(dogId)).toBe(xpBefore);
      expect(await sessionXpRows(userId)).toBe(sessionXpBefore);

      // No training session was created by a skip.
      const { count: sessionCount } = await admin
        .from("training_sessions")
        .select("id", { count: "exact", head: true })
        .eq("dog_id", dogId);
      expect(sessionCount).toBe(0);

      // No streak row was created/advanced by a skip.
      const { data: streak } = await admin
        .from("dog_streaks")
        .select("current_streak")
        .eq("dog_id", dogId)
        .maybeSingle();
      expect(streak?.current_streak ?? 0).toBe(0);

      // The skip IS recorded (path state): the lesson id is in the skip cookie.
      const cookieValue = [...cookieJar.values()].join(",");
      expect(cookieValue).toContain(lessonIds[1]);
    });
  });
});
