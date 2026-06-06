import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * RK-8 gap: server-action LOGIC/validation branches in src/app/actions/.
 *
 * Scope: the early validation and branching paths a unit test can reach WITHOUT
 * a live database — auth guards, input validation, and the "lookup returned
 * nothing / ownership" branches that short-circuit before any write. The full
 * action -> DB integration (real inserts/updates, FK cascades, RPC effects) is
 * RK-10 and is explicitly OUT OF SCOPE here; those happy paths are deferred to
 * that integration suite.
 *
 * There is no Supabase mock helper in this repo (see streak-handler.test.ts for
 * precedent), so a minimal configurable fake of the server query builder lives
 * here. Each .from(table) returns canned rows keyed by table; terminal methods
 * (.single/.maybeSingle) resolve to { data, error }. Writes are no-ops because
 * every assertion below targets a branch that returns BEFORE a write, or the
 * write target (next/cache, next/navigation) is mocked separately.
 */

// --- Next.js runtime mocks ------------------------------------------------

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

const redirect = vi.fn((url: string) => {
  // next/navigation redirect throws to halt execution; emulate that so any code
  // after a redirect does not run, matching real behavior.
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

// cookies() is used by skip-lesson. Provide an in-memory store.
type CookieJar = Map<string, string>;
const cookieJar = vi.hoisted(() => ({ current: new Map() as CookieJar }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.current.has(name)
        ? { value: cookieJar.current.get(name)! }
        : undefined,
    set: (name: string, value: string) => {
      cookieJar.current.set(name, value);
    },
  }),
}));

// --- Supabase fakes -------------------------------------------------------

type Row = Record<string, unknown>;
type TableData = { single?: Row | null; list?: Row[] | null; error?: unknown };

function makeQuery(tableData: TableData | undefined) {
  const q = {
    select() {
      return q;
    },
    eq() {
      return q;
    },
    order() {
      return q;
    },
    limit() {
      return q;
    },
    insert() {
      return q;
    },
    update() {
      return q;
    },
    delete() {
      return q;
    },
    single() {
      return Promise.resolve({
        data: tableData?.single ?? null,
        error: tableData?.error ?? null,
      });
    },
    maybeSingle() {
      return Promise.resolve({
        data: tableData?.single ?? null,
        error: tableData?.error ?? null,
      });
    },
    // Some queries (deleteDog's user-dog list) are awaited directly after .eq().
    then(resolve: (v: { data: Row[] | null; error: unknown }) => unknown) {
      return Promise.resolve({
        data: tableData?.list ?? null,
        error: tableData?.error ?? null,
      }).then(resolve);
    },
  };
  return q;
}

function makeServerClient(config: {
  user: Row | null;
  tables?: Record<string, TableData>;
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: config.user }, error: null }),
    },
    from: (table: string) => makeQuery(config.tables?.[table]),
  };
}

const serverFake = vi.hoisted(() => ({ current: null as ReturnType<typeof makeServerClient> | null }));
const adminFake = vi.hoisted(() => ({ current: null as ReturnType<typeof makeServerClient> | null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => serverFake.current,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminFake.current,
}));

// The pipeline is exercised in its own tests; stub it so log-session's happy
// path (RK-10 territory) doesn't pull real handlers / admin RPCs in here.
const runGamificationPipeline = vi.fn();
vi.mock("@/lib/gamification/pipeline", () => ({
  runGamificationPipeline: (...a: unknown[]) => runGamificationPipeline(...a),
}));

const { createDog } = await import("@/app/actions/create-dog");
const { deleteDog } = await import("@/app/actions/delete-dog");
const { switchDog } = await import("@/app/actions/switch-dog");
const { updateDog, updateTimezone } = await import("@/app/actions/update-profile");
const { logSession } = await import("@/app/actions/log-session");
const { skipLesson } = await import("@/app/actions/skip-lesson");

const USER = { id: "user-1" };

beforeEach(() => {
  revalidatePath.mockClear();
  redirect.mockClear();
  runGamificationPipeline.mockReset();
  cookieJar.current = new Map();
  adminFake.current = makeServerClient({ user: USER });
});

// --- createDog ------------------------------------------------------------

describe("createDog validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(await createDog({ name: "Rex", breed: null, birthday: null })).toEqual({
      error: "Not authenticated",
    });
  });

  it("returns the validation error for an empty name (before any write)", async () => {
    serverFake.current = makeServerClient({ user: USER });
    expect(await createDog({ name: "", breed: null, birthday: null })).toEqual({
      error: "Dog name is required",
    });
  });

  it("returns the validation error for an over-long breed", async () => {
    serverFake.current = makeServerClient({ user: USER });
    expect(
      await createDog({ name: "Rex", breed: "b".repeat(101), birthday: null })
    ).toEqual({ error: "Breed name too long" });
  });

  it("returns a generic error when the insert fails", async () => {
    serverFake.current = makeServerClient({ user: USER });
    adminFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { single: null, error: { message: "db down" } } },
    });
    expect(
      await createDog({ name: "Rex", breed: null, birthday: null })
    ).toEqual({ error: "Something went wrong. Please try again." });
  });
});

// --- deleteDog ------------------------------------------------------------

describe("deleteDog validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(await deleteDog("dog-1")).toEqual({ error: "Not authenticated" });
  });

  it("returns No dogs found when the user has no dogs", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { list: [] } },
    });
    expect(await deleteDog("dog-1")).toEqual({ error: "No dogs found" });
  });

  it("refuses to delete the user's only dog", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { list: [{ id: "dog-1" }] } },
    });
    expect(await deleteDog("dog-1")).toEqual({
      error: "You can't delete your only dog",
    });
  });

  it("returns Dog not found when the id is not owned by the user", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { list: [{ id: "dog-1" }, { id: "dog-2" }] } },
    });
    expect(await deleteDog("dog-X")).toEqual({ error: "Dog not found" });
  });
});

// --- switchDog ------------------------------------------------------------

describe("switchDog validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(await switchDog("dog-1")).toEqual({ error: "Not authenticated" });
  });

  it("returns Dog not found when ownership lookup returns nothing", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { single: null } },
    });
    expect(await switchDog("dog-1")).toEqual({ error: "Dog not found" });
  });

  it("returns a generic error when the profile update fails", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { single: { id: "dog-1" } } },
    });
    adminFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { error: { message: "nope" } } },
    });
    const result = await switchDog("dog-1");
    expect(result).toEqual({ error: "Failed to switch. Please try again." });
  });

  it("succeeds and revalidates when ownership checks pass", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { single: { id: "dog-1" } } },
    });
    adminFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { error: null } },
    });
    expect(await switchDog("dog-1")).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

// --- updateDog / updateTimezone ------------------------------------------

describe("updateDog validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(
      await updateDog({ dogId: "d1", name: "Rex", breed: null, birthday: null })
    ).toEqual({ error: "Not authenticated" });
  });

  it("returns the validation error for an empty name", async () => {
    serverFake.current = makeServerClient({ user: USER });
    expect(
      await updateDog({ dogId: "d1", name: "", breed: null, birthday: null })
    ).toEqual({ error: "Dog name is required" });
  });

  it("returns a generic error when the update fails", async () => {
    serverFake.current = makeServerClient({ user: USER });
    adminFake.current = makeServerClient({
      user: USER,
      tables: { dogs: { error: { message: "boom" } } },
    });
    expect(
      await updateDog({ dogId: "d1", name: "Rex", breed: null, birthday: null })
    ).toEqual({ error: "Failed to update. Please try again." });
  });
});

describe("updateTimezone validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(await updateTimezone("America/New_York")).toEqual({
      error: "Not authenticated",
    });
  });

  it("rejects a malformed IANA timezone (B1 write-side guard)", async () => {
    serverFake.current = makeServerClient({ user: USER });
    expect(await updateTimezone("Not/AZone")).toEqual({
      error: "Invalid timezone",
    });
  });

  it("rejects an empty timezone string", async () => {
    serverFake.current = makeServerClient({ user: USER });
    expect(await updateTimezone("")).toEqual({ error: "Invalid timezone" });
  });

  it("accepts a valid timezone and revalidates", async () => {
    serverFake.current = makeServerClient({ user: USER });
    adminFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { error: null } },
    });
    expect(await updateTimezone("America/New_York")).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/profile");
  });
});

// --- skipLesson -----------------------------------------------------------

describe("skipLesson validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(await skipLesson("lesson-1")).toEqual({ error: "Not authenticated" });
  });

  it("returns No active dog when the profile has none", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { single: { active_dog_id: null } } },
    });
    expect(await skipLesson("lesson-1")).toEqual({ error: "No active dog" });
  });

  it("persists the skipped lesson in a cookie and succeeds", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { single: { active_dog_id: "dog-abcdef12" } } },
    });
    expect(await skipLesson("lesson-1")).toEqual({ success: true });
    // Cookie key is derived from the first 8 chars of the dog id.
    const key = "pawdojo-skipped-dog-abcd";
    expect(cookieJar.current.get(key)).toBe("lesson-1");
  });

  it("does not duplicate a lesson id already present in the cookie", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { single: { active_dog_id: "dog-abcdef12" } } },
    });
    const key = "pawdojo-skipped-dog-abcd";
    cookieJar.current.set(key, "lesson-1");
    await skipLesson("lesson-1");
    expect(cookieJar.current.get(key)).toBe("lesson-1");
  });

  it("appends a new lesson id to existing skipped lessons", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { user_profiles: { single: { active_dog_id: "dog-abcdef12" } } },
    });
    const key = "pawdojo-skipped-dog-abcd";
    cookieJar.current.set(key, "lesson-1");
    await skipLesson("lesson-2");
    expect(cookieJar.current.get(key)).toBe("lesson-1,lesson-2");
  });
});

// --- logSession (validation branches only; DB happy path is RK-10) --------

const validForm = {
  lessonId: "lesson-1",
  skillId: "skill-1",
  rating: 4,
  reps: 10,
  durationMin: 5,
  notes: "good boy",
};

describe("logSession validation/branching", () => {
  it("returns Not authenticated when there is no user", async () => {
    serverFake.current = makeServerClient({ user: null });
    expect(await logSession(validForm)).toEqual({ error: "Not authenticated" });
  });

  it("returns Missing lesson or skill when ids are blank", async () => {
    serverFake.current = makeServerClient({ user: USER });
    expect(
      await logSession({ ...validForm, lessonId: "", skillId: "" })
    ).toEqual({ error: "Missing lesson or skill" });
  });

  it("returns Lesson not found when the lesson lookup is empty", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { lessons: { single: null } },
    });
    expect(await logSession(validForm)).toEqual({ error: "Lesson not found" });
  });

  it("rejects a lesson that belongs to a different skill", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: {
        lessons: { single: { id: "lesson-1", skill_id: "other-skill" } },
      },
    });
    expect(await logSession(validForm)).toEqual({
      error: "Lesson does not belong to this skill",
    });
  });

  it("rejects an out-of-range rating", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { lessons: { single: { id: "lesson-1", skill_id: "skill-1" } } },
    });
    expect(await logSession({ ...validForm, rating: 6 })).toEqual({
      error: "Rating must be between 1 and 5",
    });
    expect(await logSession({ ...validForm, rating: 0 })).toEqual({
      error: "Rating must be between 1 and 5",
    });
  });

  it("rejects a negative reps value", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { lessons: { single: { id: "lesson-1", skill_id: "skill-1" } } },
    });
    expect(await logSession({ ...validForm, reps: -1 })).toEqual({
      error: "Invalid reps value",
    });
  });

  it("rejects a negative duration value", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { lessons: { single: { id: "lesson-1", skill_id: "skill-1" } } },
    });
    expect(await logSession({ ...validForm, durationMin: -5 })).toEqual({
      error: "Invalid duration value",
    });
  });

  it("rejects notes longer than 1000 characters", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: { lessons: { single: { id: "lesson-1", skill_id: "skill-1" } } },
    });
    expect(
      await logSession({ ...validForm, notes: "x".repeat(1001) })
    ).toEqual({ error: "Notes too long (max 1000 characters)" });
  });

  it("returns No dog found when neither active dog nor a first dog exists", async () => {
    serverFake.current = makeServerClient({
      user: USER,
      tables: {
        lessons: { single: { id: "lesson-1", skill_id: "skill-1" } },
        user_profiles: { single: { active_dog_id: null } },
        dogs: { single: null },
      },
    });
    expect(await logSession(validForm)).toEqual({ error: "No dog found" });
    // No write path reached, so the pipeline must not have run.
    expect(runGamificationPipeline).not.toHaveBeenCalled();
  });
});
