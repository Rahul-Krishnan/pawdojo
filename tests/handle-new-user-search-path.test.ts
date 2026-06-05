import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * S5 regression guard: handle_new_user() must run with a pinned search_path.
 *
 * handle_new_user() (created in 001, re-created in 007) is SECURITY DEFINER but
 * was left without a pinned search_path, the same search_path-injection class
 * that migration 010 closed for the XP-increment RPCs. It is trigger-only (no
 * args), so it is NOT reachable as a PostgREST RPC and needs no REVOKE/GRANT;
 * pinning search_path is the whole fix. Its body is fully schema-qualified
 * (public.user_profiles), so it is safe under search_path = public, pg_temp.
 *
 * Static SQL guard only; no local Postgres is available, so the live proof is
 * recorded in the PR test plan.
 */

const MIGRATION_011 = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "011_pin_handle_new_user_search_path.sql"
);

describe("migration 011 pins search_path on handle_new_user (S5)", () => {
  const sql = readFileSync(MIGRATION_011, "utf8");
  const lower = sql.toLowerCase();

  it("pins search_path on handle_new_user via ALTER FUNCTION", () => {
    expect(lower).toMatch(
      /alter\s+function\s+public\.handle_new_user\(\)[\s\S]*?set\s+search_path/
    );
  });

  it("pins to public, pg_temp", () => {
    expect(lower).toMatch(/set\s+search_path\s*=\s*public\s*,\s*pg_temp/);
  });
});
