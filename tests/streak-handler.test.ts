import { vi, describe, it, expect } from "vitest";

// Orchestration coverage for handleStreakUpdate. The streak math is unit-tested
// in streaks.test.ts; this file pins the handler's wiring: creating a missing
// dog_streaks row, the same-day early return, the timezone default, and event
// logging. The pure tests can't catch a regression in that glue.
//
// There is no Supabase mock helper in this repo, so a minimal in-memory fake of
// the query builder lives here. It records writes so the test can assert on them.

type Row = Record<string, unknown>;

type Write = {
  table: string;
  op: "insert" | "update";
  payload?: Row;
  filter?: Record<string, unknown>;
};

function makeFakeAdmin(config: {
  dogStreakRow: Row | null;
  profile: Row | null;
}) {
  const writes: Write[] = [];

  const admin = {
    writes,
    from(table: string) {
      const q = {
        _type: null as "insert" | "update" | null,
        _payload: undefined as Row | undefined,
        _filter: {} as Record<string, unknown>,
        select() {
          return q;
        },
        insert(payload: Row) {
          q._type = "insert";
          q._payload = payload;
          // streak_events inserts are awaited directly; dog_streaks inserts are
          // followed by .select().single() and resolve there instead.
          if (table === "streak_events") {
            writes.push({ table, op: "insert", payload });
            return Promise.resolve({ data: null, error: null });
          }
          return q;
        },
        update(payload: Row) {
          q._type = "update";
          q._payload = payload;
          return q;
        },
        eq(col: string, val: unknown) {
          q._filter[col] = val;
          // For updates, .eq() is the terminal awaited call.
          if (q._type === "update") {
            writes.push({
              table,
              op: "update",
              payload: q._payload,
              filter: { ...q._filter },
            });
            return Promise.resolve({ data: null, error: null });
          }
          return q;
        },
        single() {
          if (table === "dog_streaks" && q._type === "insert") {
            writes.push({ table, op: "insert", payload: q._payload });
            return Promise.resolve({ data: { ...q._payload }, error: null });
          }
          if (table === "dog_streaks") {
            return Promise.resolve({ data: config.dogStreakRow, error: null });
          }
          if (table === "user_profiles") {
            return Promise.resolve({ data: config.profile, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return q;
    },
  };
  return admin;
}

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof makeFakeAdmin> | null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.current,
}));

const { handleStreakUpdate } = await import("@/lib/gamification/streak-handler");

// The handler reads "today" from new Date() and converts it with the user's
// timezone, so the test must derive expected dates the same way.
function utcDate(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "UTC" });
}

const session = {
  userId: "user-1",
  dogId: "dog-1",
  sessionId: "session-1",
  lessonId: null,
  skillId: null,
  rating: 5,
};

describe("handleStreakUpdate", () => {
  it("creates a dog_streaks row and records the first activity when none exists", async () => {
    fake.current = makeFakeAdmin({
      dogStreakRow: null,
      profile: { timezone: "UTC" },
    });

    const result = await handleStreakUpdate(session);

    expect(result.streakUpdated).toBe(true);

    const inserts = fake.current.writes.filter(
      (w) => w.table === "dog_streaks" && w.op === "insert"
    );
    expect(inserts).toHaveLength(1);

    const update = fake.current.writes.find(
      (w) => w.table === "dog_streaks" && w.op === "update"
    );
    expect(update?.payload?.current_streak).toBe(1);

    const events = fake.current.writes.filter((w) => w.table === "streak_events");
    expect(events).toHaveLength(1);
    expect(events[0].payload?.event_type).toBe("activity");
  });

  it("is a no-op when the dog already trained today", async () => {
    fake.current = makeFakeAdmin({
      dogStreakRow: {
        dog_id: "dog-1",
        current_streak: 3,
        longest_streak: 3,
        last_streak_date: utcDate(0),
        freeze_available: 2,
      },
      profile: { timezone: "UTC" },
    });

    const result = await handleStreakUpdate(session);

    expect(result.streakUpdated).toBe(false);
    expect(
      fake.current.writes.some(
        (w) => w.table === "dog_streaks" && w.op === "update"
      )
    ).toBe(false);
    expect(fake.current.writes.some((w) => w.table === "streak_events")).toBe(
      false
    );
  });

  it("defaults to UTC and still records the streak when the profile has no timezone", async () => {
    fake.current = makeFakeAdmin({
      dogStreakRow: {
        dog_id: "dog-1",
        current_streak: 4,
        longest_streak: 4,
        last_streak_date: utcDate(-1),
        freeze_available: 2,
      },
      profile: null,
    });

    const result = await handleStreakUpdate(session);

    expect(result.streakUpdated).toBe(true);
    const update = fake.current.writes.find(
      (w) => w.table === "dog_streaks" && w.op === "update"
    );
    // Yesterday (UTC) + today => consecutive day, so the stored 4 becomes 5.
    expect(update?.payload?.current_streak).toBe(5);
  });
});
