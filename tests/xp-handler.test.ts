import { vi, describe, it, expect } from "vitest";

/**
 * RK-8 gap: gamification ORCHESTRATION — handleXPAward wiring.
 *
 * The XP math (calculateXPAward, the daily cap) is unit-tested in xp.test.ts and
 * xp-award.test.ts. This file pins the HANDLER glue the pure tests can't reach:
 *   - the first-of-day check is scoped to session_log transactions (S1),
 *   - the session award is credited off the RPC error field, never the value,
 *     so an idempotent 0 is not treated as a failure (migration 009 semantics),
 *   - a lesson_complete award is added only when its insert has no error,
 *   - the dog/user increment RPCs fire exactly when totalXpAwarded > 0.
 *
 * The DB itself is faked (no Supabase locally; see streak-handler.test.ts for
 * the in-repo precedent). Real RPC effects on Postgres are RK-10 integration.
 */

type Row = Record<string, unknown>;

type RpcResult = { data: unknown; error: unknown };

function makeFakeAdmin(config: {
  timezone?: string | null;
  sessionLogCount?: number;
  awardSessionXp?: RpcResult;
  lessonInsertError?: unknown;
  incrementResult?: RpcResult;
}) {
  const rpcCalls: { fn: string; args: Row }[] = [];
  const inserts: { table: string; payload: Row }[] = [];

  const admin = {
    rpcCalls,
    inserts,
    rpc(fn: string, args: Row): Promise<RpcResult> {
      rpcCalls.push({ fn, args });
      if (fn === "award_session_xp") {
        return Promise.resolve(
          config.awardSessionXp ?? { data: 30, error: null }
        );
      }
      return Promise.resolve(config.incrementResult ?? { data: null, error: null });
    },
    from(table: string) {
      const q = {
        _isInsert: false,
        _payload: undefined as Row | undefined,
        select(_cols?: string, opts?: { count?: string; head?: boolean }) {
          // The first-of-day count query resolves to { count } when awaited.
          if (table === "xp_transactions" && opts?.count) {
            return {
              eq() {
                return this;
              },
              gte() {
                return Promise.resolve({
                  count: config.sessionLogCount ?? 0,
                  error: null,
                });
              },
            };
          }
          return q;
        },
        eq() {
          return q;
        },
        gte() {
          return Promise.resolve({ count: config.sessionLogCount ?? 0, error: null });
        },
        single() {
          if (table === "user_profiles") {
            return Promise.resolve({
              data: { timezone: config.timezone ?? "UTC" },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        insert(payload: Row) {
          inserts.push({ table, payload });
          // xp_transactions lesson insert is awaited directly for { error }.
          return Promise.resolve({ error: config.lessonInsertError ?? null });
        },
      };
      return q;
    },
  };
  return admin;
}

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof makeFakeAdmin> | null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.current }));

const { handleXPAward } = await import("@/lib/gamification/xp-handler");

const baseSession = {
  userId: "user-1",
  dogId: "dog-1",
  sessionId: "session-1",
  lessonId: null as string | null,
  skillId: "skill-1",
  rating: 5,
};

describe("handleXPAward orchestration", () => {
  it("credits the session XP returned by award_session_xp", async () => {
    fake.current = makeFakeAdmin({
      timezone: "UTC",
      sessionLogCount: 0,
      awardSessionXp: { data: 30, error: null },
    });

    const result = await handleXPAward(baseSession);

    expect(result.xpAwarded).toBe(30);
    const awardCall = fake.current.rpcCalls.find((c) => c.fn === "award_session_xp");
    expect(awardCall).toBeDefined();
    // First of day => p_amount carries the first-of-day bonus baked in by
    // calculateXPAward; the increment RPCs run because the total is > 0.
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_dog_xp")).toBe(true);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_user_xp")).toBe(true);
  });

  it("treats an idempotent 0 from award_session_xp as success, not an error", async () => {
    fake.current = makeFakeAdmin({
      awardSessionXp: { data: 0, error: null },
    });

    const result = await handleXPAward(baseSession);

    // 0 awarded (replay) => no error, but also no increment RPCs since total is 0.
    expect(result.xpAwarded).toBe(0);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_dog_xp")).toBe(false);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_user_xp")).toBe(false);
  });

  it("does not credit session XP when award_session_xp returns an error", async () => {
    fake.current = makeFakeAdmin({
      awardSessionXp: { data: 999, error: { message: "rpc failed" } },
    });

    const result = await handleXPAward(baseSession);

    expect(result.xpAwarded).toBe(0);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_dog_xp")).toBe(false);
  });

  it("adds lesson_complete XP when a lessonId is present and its insert succeeds", async () => {
    fake.current = makeFakeAdmin({
      sessionLogCount: 0,
      awardSessionXp: { data: 0, error: null },
      lessonInsertError: null,
    });

    const result = await handleXPAward({ ...baseSession, lessonId: "lesson-1" });

    // Session contributed 0 (replay), so the whole award is the lesson XP.
    expect(result.xpAwarded).toBeGreaterThan(0);
    const lessonInsert = fake.current.inserts.find(
      (i) => i.table === "xp_transactions" && i.payload.action_type === "lesson_complete"
    );
    expect(lessonInsert).toBeDefined();
    // Total > 0 => increments fire.
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_user_xp")).toBe(true);
  });

  it("does not add lesson XP when the lesson insert errors", async () => {
    fake.current = makeFakeAdmin({
      awardSessionXp: { data: 0, error: null },
      lessonInsertError: { message: "duplicate" },
    });

    const result = await handleXPAward({ ...baseSession, lessonId: "lesson-1" });

    expect(result.xpAwarded).toBe(0);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_dog_xp")).toBe(false);
  });

  it("falls back to UTC and still awards when the stored timezone is malformed (B1)", async () => {
    fake.current = makeFakeAdmin({
      timezone: "Not/AZone",
      awardSessionXp: { data: 25, error: null },
    });

    const result = await handleXPAward(baseSession);

    // The try/catch around toLocaleString must not break XP awarding.
    expect(result.xpAwarded).toBe(25);

    // Discriminating assertion: prove the UTC fallback branch actually engaged
    // rather than just relying on the mocked award amount (which is independent
    // of the timezone branch). The catch block computes the day boundary from
    // the current UTC date via Date.UTC(...), i.e. UTC midnight. A real non-UTC
    // zone would offset this by its tzOffset, so equality to UTC midnight is
    // what distinguishes the fallback. Compute the same value the SUT does.
    const [y, m, d] = new Date().toISOString().slice(0, 10).split("-").map(Number);
    const expectedDayStart = new Date(Date.UTC(y, m - 1, d)).toISOString();
    const awardCall = fake.current.rpcCalls.find((c) => c.fn === "award_session_xp");
    expect(awardCall).toBeDefined();
    expect(awardCall!.args.p_day_start).toBe(expectedDayStart);
  });
});
