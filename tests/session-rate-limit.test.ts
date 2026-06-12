import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * L2 regression guard: the per-user session-log rate limit must be enforced
 * atomically.
 *
 * The previous guard read the most recent training_sessions.logged_at in app
 * code and rejected logs within 2s. Because the read and the insert were
 * separate round trips, two concurrent logs could both observe the same prior
 * timestamp and both insert, letting a user flood training_sessions in parallel.
 *
 * Migration 012 introduces a SECURITY DEFINER `check_session_rate` RPC that
 * takes a per-user advisory lock FIRST, then reads the last attempt and records
 * the new one inside one transaction, so concurrent calls serialize. The record
 * happens in the RPC (not deferred to the app insert), which closes the race.
 *
 * Two properties are guarded here without a live database:
 *   1. The migration SQL has the lock-first ordering, the in-lock upsert,
 *      pinned search_path, RLS on the backing table, and least-privilege grants.
 *   2. logSession calls check_session_rate and no longer reads logged_at to
 *      decide the rate limit in JS.
 *
 * The live concurrency proof (fire N parallel logSession calls against a real
 * Supabase instance and assert at most one is accepted per window) must be run
 * manually and recorded in the PR test plan; no local Postgres is available.
 */

const MIGRATION_012 = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "012_rate_limit_sessions.sql"
);

const LOG_SESSION = join(
  __dirname,
  "..",
  "src",
  "app",
  "actions",
  "log-session.ts"
);

describe("migration 012 check_session_rate hardening (L2)", () => {
  const sql = readFileSync(MIGRATION_012, "utf8");
  const lower = sql.toLowerCase();

  it("defines check_session_rate as SECURITY DEFINER", () => {
    expect(lower).toMatch(/create\s+or\s+replace\s+function\s+public\.check_session_rate/);
    expect(lower).toContain("security definer");
  });

  it("pins search_path", () => {
    expect(lower).toContain("set search_path = public, pg_temp");
  });

  it("takes the per-user advisory lock BEFORE reading the last attempt", () => {
    const lockIdx = lower.indexOf("pg_advisory_xact_lock");
    const readIdx = lower.indexOf("select last_session_at");
    expect(lockIdx).toBeGreaterThan(-1);
    expect(readIdx).toBeGreaterThan(-1);
    expect(lockIdx).toBeLessThan(readIdx);
  });

  it("records the attempt with an in-lock upsert", () => {
    expect(lower).toMatch(/insert\s+into\s+public\.user_rate_limits/);
    expect(lower).toContain("on conflict (user_id) do update set last_session_at = now()");
  });

  it("backs the limiter with a dedicated RLS-enabled table", () => {
    expect(lower).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.user_rate_limits/);
    expect(lower).toContain("alter table public.user_rate_limits enable row level security");
  });

  it("grants execute only to service_role", () => {
    expect(lower).toContain("revoke execute on function public.check_session_rate(uuid, int) from public");
    expect(lower).toContain("grant execute on function public.check_session_rate(uuid, int) to service_role");
  });
});

describe("logSession rate-limit wiring (L2)", () => {
  const src = readFileSync(LOG_SESSION, "utf8");

  it("delegates the rate limit to check_session_rate", () => {
    expect(src).toContain('admin.rpc("check_session_rate"');
    expect(src).toContain("p_min_interval_ms");
  });

  it("no longer derives the rate limit from training_sessions.logged_at in JS", () => {
    expect(src).not.toMatch(/select\(["']logged_at["']\)/);
    expect(src).not.toContain("sinceMs");
  });

  it("fails open on a rate-limiter error (does not block legitimate logs)", () => {
    // On rateError we log and fall through; only an explicit false rejects.
    expect(src).toContain("rateAllowed === false");
  });
});
