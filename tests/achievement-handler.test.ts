import { vi, describe, it, expect } from "vitest";

/**
 * RK-8 gap: gamification ORCHESTRATION — handleAchievementCheck wiring.
 *
 * The achievement evaluation rules live in achievements.ts and are unit-tested
 * in achievements.test.ts. This file pins the HANDLER glue the pure tests can't
 * reach:
 *   - the early return when there are no achievement definitions,
 *   - stat assembly scoped to the ACTIVE dog (streak read from dog_streaks, not
 *     user_profiles; perfect-session flag from rating=5 count),
 *   - persistence: a progress upsert per evaluated update, and an xp_transactions
 *     insert + increment RPCs ONLY for newly-unlocked defs whose xpReward > 0.
 *
 * The DB is faked (no Supabase locally; see streak-handler.test.ts). The
 * evaluateAchievements call is left REAL so the wiring is exercised end-to-end
 * against the actual rule engine. Real DB effects are RK-10 integration.
 */

type Row = Record<string, unknown>;

type Config = {
  defs?: Row[] | null;
  userAchievements?: Row[] | null;
  dogRow?: Row | null;
  dogStreakRows?: Row[] | null;
  sessionCount?: number;
  perfectCount?: number;
  completions?: Row[] | null;
  allLessons?: Row[] | null;
  basicSkills?: Row[] | null;
};

function makeFakeAdmin(config: Config) {
  const upserts: { table: string; payload: Row }[] = [];
  const inserts: { table: string; payload: Row }[] = [];
  const rpcCalls: { fn: string; args: Row }[] = [];
  // training_sessions is queried twice (total count, then rating=5 count); use
  // the presence of a rating filter to disambiguate.
  const admin = {
    upserts,
    inserts,
    rpcCalls,
    rpc(fn: string, args: Row) {
      rpcCalls.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },
    from(table: string) {
      const state = { ratingFiltered: false, count: false };
      const result = (): Row => {
        switch (table) {
          case "achievement_definitions":
            return { data: config.defs ?? [], error: null };
          case "user_achievements":
            return { data: config.userAchievements ?? [], error: null };
          case "dogs":
            return { data: config.dogRow ?? null, error: null };
          case "dog_streaks":
            return { data: config.dogStreakRows ?? [], error: null };
          case "training_sessions":
            return {
              count: state.ratingFiltered
                ? config.perfectCount ?? 0
                : config.sessionCount ?? 0,
              error: null,
            };
          case "lesson_completions":
            return { data: config.completions ?? [], error: null };
          case "lessons":
            return { data: config.allLessons ?? [], error: null };
          case "skills":
            return { data: config.basicSkills ?? [], error: null };
          default:
            return { data: null, error: null };
        }
      };

      const q: Row & { then: unknown } = {
        select() {
          return q;
        },
        eq(col: string) {
          if (col === "rating") state.ratingFiltered = true;
          return q;
        },
        limit() {
          return q;
        },
        single() {
          return Promise.resolve(result());
        },
        upsert(payload: Row) {
          upserts.push({ table, payload });
          return Promise.resolve({ data: null, error: null });
        },
        insert(payload: Row) {
          inserts.push({ table, payload });
          return Promise.resolve({ data: null, error: null });
        },
        // Awaited-directly chains (lists / count queries) resolve here.
        then(resolve: (v: Row) => unknown) {
          return Promise.resolve(result()).then(resolve);
        },
      };
      return q;
    },
  };
  return admin;
}

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof makeFakeAdmin> | null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.current }));

const { handleAchievementCheck } = await import("@/lib/gamification/achievement-handler");

const session = {
  userId: "user-1",
  dogId: "dog-1",
  sessionId: "session-1",
  lessonId: null,
  skillId: "skill-1",
  rating: 5,
};

describe("handleAchievementCheck orchestration", () => {
  it("returns no unlocks when there are no achievement definitions", async () => {
    fake.current = makeFakeAdmin({ defs: [] });
    const result = await handleAchievementCheck(session);
    expect(result.achievementsUnlocked).toEqual([]);
    expect(fake.current.upserts).toHaveLength(0);
    expect(fake.current.inserts).toHaveLength(0);
  });

  it("returns no unlocks when definitions are null", async () => {
    fake.current = makeFakeAdmin({ defs: null });
    const result = await handleAchievementCheck(session);
    expect(result.achievementsUnlocked).toEqual([]);
  });

  it("unlocks a sessions-count achievement and persists progress + reward", async () => {
    // A "first session" style achievement: condition met by total_sessions >= 1.
    fake.current = makeFakeAdmin({
      defs: [
        {
          id: "def-1",
          key: "first_session",
          name: "First Steps",
          description: "Log your first session",
          condition_type: "total_sessions",
          condition_value: { threshold: 1 },
          xp_reward: 50,
        },
      ],
      userAchievements: [],
      dogRow: { total_xp: 0 },
      dogStreakRows: [{ current_streak: 1 }],
      sessionCount: 1,
      perfectCount: 1,
      completions: [],
      allLessons: [],
      basicSkills: [],
    });

    const result = await handleAchievementCheck(session);

    expect(result.achievementsUnlocked).toContain("First Steps");

    // Progress upsert recorded.
    const progressUpsert = fake.current.upserts.find(
      (u) => u.table === "user_achievements"
    );
    expect(progressUpsert).toBeDefined();
    expect(progressUpsert?.payload.unlocked_at).not.toBeNull();

    // Reward path: xp_transactions insert + both increment RPCs (xp_reward > 0).
    const rewardInsert = fake.current.inserts.find(
      (i) => i.table === "xp_transactions" && i.payload.action_type === "achievement_unlock"
    );
    expect(rewardInsert).toBeDefined();
    expect(rewardInsert?.payload.xp_amount).toBe(50);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_dog_xp")).toBe(true);
    expect(fake.current.rpcCalls.some((c) => c.fn === "increment_user_xp")).toBe(true);
  });

  it("does not re-reward an already-unlocked achievement", async () => {
    fake.current = makeFakeAdmin({
      defs: [
        {
          id: "def-1",
          key: "first_session",
          name: "First Steps",
          description: "",
          condition_type: "total_sessions",
          condition_value: { threshold: 1 },
          xp_reward: 50,
        },
      ],
      // Already unlocked previously.
      userAchievements: [
        { achievement_def_id: "def-1", progress: 1, unlocked_at: "2026-01-01T00:00:00Z" },
      ],
      dogRow: { total_xp: 0 },
      dogStreakRows: [{ current_streak: 1 }],
      sessionCount: 1,
      perfectCount: 0,
      completions: [],
      allLessons: [],
      basicSkills: [],
    });

    const result = await handleAchievementCheck(session);

    // Not newly unlocked => not in the returned names, and no reward insert.
    expect(result.achievementsUnlocked).not.toContain("First Steps");
    expect(
      fake.current.inserts.some(
        (i) => i.table === "xp_transactions"
      )
    ).toBe(false);
  });
});
