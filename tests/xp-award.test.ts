import { vi, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * L1 regression guard: the daily session XP cap must be enforced atomically.
 *
 * The previous design read the running daily session-XP sum in app code,
 * applied the cap in JS, then inserted a fresh xp_transactions row. Two
 * concurrent session logs could both read the same sum, both decide they were
 * under the 200/day cap, and both insert, so a user could exceed the cap by
 * logging sessions in parallel.
 *
 * Migration 009 introduces a SECURITY DEFINER `award_session_xp` RPC that takes
 * a per-user advisory lock FIRST, then sums, caps, and inserts inside one
 * transaction so concurrent calls serialize. The handler now delegates the cap
 * to that RPC instead of computing it in JS.
 *
 * Two properties are guarded here without a live database:
 *   1. The migration SQL has the lock-first ordering, cap math, idempotent
 *      insert, pinned search_path, and least-privilege grants.
 *   2. handleXPAward calls award_session_xp (cap is no longer applied in JS).
 *
 * The live concurrency proof (fire N parallel session logs against a real
 * Supabase instance and assert the summed session XP never exceeds 200) must be
 * run manually and recorded in the PR test plan; no local Postgres is available.
 */

const MIGRATION_009 = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "009_atomic_session_xp.sql"
);

describe("migration 009 award_session_xp hardening (L1)", () => {
  const sql = readFileSync(MIGRATION_009, "utf8");
  const lower = sql.toLowerCase();

  it("defines award_session_xp as SECURITY DEFINER", () => {
    expect(lower).toMatch(/create\s+or\s+replace\s+function\s+public\.award_session_xp/);
    expect(lower).toContain("security definer");
  });

  it("takes the per-user advisory lock BEFORE summing prior session XP", () => {
    const lockIdx = lower.indexOf("pg_advisory_xact_lock");
    const sumIdx = lower.indexOf("sum(");
    expect(lockIdx, "advisory lock must be present").toBeGreaterThan(-1);
    expect(sumIdx, "running-sum query must be present").toBeGreaterThan(-1);
    expect(lockIdx, "lock must precede the sum (lock-first)").toBeLessThan(sumIdx);
  });

  it("applies the cap with LEAST/GREATEST against the passed cap", () => {
    expect(lower).toContain("least(");
    expect(lower).toContain("greatest(");
  });

  it("inserts idempotently with ON CONFLICT DO NOTHING", () => {
    expect(lower).toMatch(/on\s+conflict[\s\S]*do\s+nothing/);
  });

  it("pins search_path", () => {
    expect(lower).toMatch(/set\s+search_path/);
  });

  it("revokes EXECUTE from PUBLIC and grants only to service_role", () => {
    expect(lower).toMatch(/revoke\s+execute\s+on\s+function\s+public\.award_session_xp[\s\S]*from\s+public/);
    expect(lower).toMatch(/grant\s+execute\s+on\s+function\s+public\.award_session_xp[\s\S]*to\s+service_role/);
  });
});

// --- Handler wiring: cap is delegated to the RPC, not computed in JS. ---

type RpcCall = { fn: string; args: Record<string, unknown> };
type EqCall = { table: string; col: string; val: unknown };

function makeFakeAdmin(config: {
  timezone: string | null;
  todayCount: number;
  awardedSessionXp: number;
  awardError?: { message: string } | null;
  incrementError?: { message: string } | null;
}) {
  const rpcCalls: RpcCall[] = [];
  const eqCalls: EqCall[] = [];

  const admin = {
    rpcCalls,
    eqCalls,
    from(table: string) {
      const q = {
        _count: false,
        select(_cols: string, opts?: { count?: string; head?: boolean }) {
          if (opts?.count) q._count = true;
          return q;
        },
        eq(col?: string, val?: unknown) {
          if (col !== undefined) eqCalls.push({ table, col, val });
          return q;
        },
        gte() {
          // Terminal for the first-of-day count query.
          if (q._count) {
            return Promise.resolve({ count: config.todayCount, error: null });
          }
          return q;
        },
        insert() {
          // lesson_complete insert (when present) resolves here.
          return Promise.resolve({ data: null, error: null });
        },
        single() {
          if (table === "user_profiles") {
            return Promise.resolve({
              data: config.timezone === null ? null : { timezone: config.timezone },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return q;
    },
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      if (fn === "award_session_xp") {
        return Promise.resolve({
          data: config.awardedSessionXp,
          error: config.awardError ?? null,
        });
      }
      if (fn === "increment_dog_xp" || fn === "increment_user_xp") {
        return Promise.resolve({
          data: null,
          error: config.incrementError ?? null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
  return admin;
}

const fake = vi.hoisted(() => ({
  current: null as ReturnType<typeof makeFakeAdmin> | null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.current,
}));

const { handleXPAward } = await import("@/lib/gamification/xp-handler");

const session = {
  userId: "user-1",
  dogId: "dog-1",
  sessionId: "11111111-1111-1111-1111-111111111111",
  lessonId: null,
  skillId: null,
  rating: 5,
};

describe("handleXPAward delegates the session cap to award_session_xp", () => {
  it("calls award_session_xp with the uncapped amount, cap, and day start", async () => {
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      todayCount: 0, // first of day -> base 20 + bonus 5 = 25 uncapped
      awardedSessionXp: 25,
    });

    const result = await handleXPAward(session);

    const award = fake.current.rpcCalls.find((c) => c.fn === "award_session_xp");
    expect(award, "handler must call award_session_xp").toBeTruthy();
    expect(award!.args.p_user_id).toBe("user-1");
    expect(award!.args.p_action_ref).toBe(session.sessionId);
    expect(award!.args.p_amount).toBe(25);
    expect(award!.args.p_cap).toBe(200);
    expect(typeof award!.args.p_idempotency_key).toBe("string");
    expect(typeof award!.args.p_day_start).toBe("string");

    // The RPC's returned amount is what gets incremented into the totals.
    expect(result.xpAwarded).toBe(25);
    const incUser = fake.current.rpcCalls.find((c) => c.fn === "increment_user_xp");
    expect(incUser!.args.xp_amount).toBe(25);
  });

  it("awards nothing further when the RPC reports the cap is exhausted", async () => {
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      todayCount: 5,
      awardedSessionXp: 0, // server says daily cap already hit
    });

    const result = await handleXPAward(session);

    expect(result.xpAwarded).toBe(0);
    // No increment when nothing was awarded.
    expect(
      fake.current.rpcCalls.some((c) => c.fn === "increment_user_xp")
    ).toBe(false);
  });
});

/**
 * B1 (read-side guard): the stored timezone flows into
 * toLocaleString({ timeZone }) / toLocaleDateString({ timeZone }) with no
 * try/catch. A malformed IANA name (eg one that slipped in before the
 * write-side guard existed) throws a RangeError and breaks XP awarding for that
 * user on every session log. The handler must tolerate a bad stored value and
 * fall back to UTC rather than throw.
 */
describe("handleXPAward tolerates a malformed stored timezone (B1)", () => {
  it("does not throw a RangeError when the profile timezone is invalid", async () => {
    fake.current = makeFakeAdmin({
      timezone: "Not/AReal_Zone",
      todayCount: 0,
      awardedSessionXp: 25,
    });

    await expect(handleXPAward(session)).resolves.toEqual({ xpAwarded: 25 });
  });
});

/**
 * S1: isFirstOfDay was computed from a COUNT of ALL xp_transactions since the
 * local day start, not just session_log rows. A lesson_complete earlier in the
 * day made the count non-zero, so isFirstOfDay was false and the 5 XP
 * first-of-day session bonus was suppressed. The count must be scoped to
 * action_type = 'session_log'.
 */
describe("isFirstOfDay counts only session_log transactions (S1)", () => {
  it("filters the first-of-day count query by action_type=session_log", async () => {
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      todayCount: 0,
      awardedSessionXp: 25,
    });

    await handleXPAward(session);

    const filtered = fake.current.eqCalls.some(
      (c) =>
        c.table === "xp_transactions" &&
        c.col === "action_type" &&
        c.val === "session_log"
    );
    expect(
      filtered,
      "the first-of-day count must be scoped to session_log so a prior lesson_complete does not suppress the bonus"
    ).toBe(true);
  });
});

/**
 * S6: the award_session_xp result was consumed as `data ?? 0` with no error
 * check, unlike the lesson insert above which inspects `error`. A failed RPC
 * (or a later RLS/grant change) would silently award 0 XP with no signal. The
 * fix mirrors the lesson-insert pattern: check the error field on all three RPC
 * calls and surface it. The landmine: award_session_xp returns 0 BY DESIGN on
 * idempotent replay (migration 009), so 0 must NOT be treated as an error.
 */
describe("handleXPAward surfaces RPC errors without misreading idempotent 0 (S6)", () => {
  it("surfaces an award_session_xp error and awards nothing", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      todayCount: 0,
      awardedSessionXp: 0,
      awardError: { message: "rpc unavailable" },
    });

    const result = await handleXPAward(session);

    expect(result.xpAwarded).toBe(0);
    expect(errSpy).toHaveBeenCalled();
    // A failed award must not drive the downstream increments.
    expect(
      fake.current.rpcCalls.some(
        (c) => c.fn === "increment_user_xp" || c.fn === "increment_dog_xp"
      )
    ).toBe(false);
    errSpy.mockRestore();
  });

  it("does NOT treat an idempotent-replay 0 as an error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      todayCount: 5,
      awardedSessionXp: 0, // ON CONFLICT DO NOTHING replay: 0 with error: null
    });

    const result = await handleXPAward(session);

    expect(result.xpAwarded).toBe(0);
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("surfaces an increment RPC error after a successful award", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      todayCount: 0,
      awardedSessionXp: 25,
      incrementError: { message: "increment failed" },
    });

    const result = await handleXPAward(session);

    // The award itself succeeded, so the total still reflects it.
    expect(result.xpAwarded).toBe(25);
    // Both increments were attempted and both errors surfaced.
    expect(errSpy).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });
});
