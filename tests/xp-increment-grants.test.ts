import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * CRITICAL regression guard: the XP-increment RPCs must not be client-callable.
 *
 * Migration 006 created increment_dog_xp and increment_user_xp as SECURITY
 * DEFINER functions with no REVOKE/GRANT and no pinned search_path. Supabase
 * exposes every function in the public schema as a PostgREST RPC endpoint
 * (/rest/v1/rpc/<fn>), and a SECURITY DEFINER function with the default PUBLIC
 * EXECUTE runs as its definer (BYPASSRLS). That let any authenticated client
 * call increment_user_xp / increment_dog_xp with an arbitrary id and amount to
 * inflate any user's or dog's XP, defeating migration 008's client write
 * lockdown.
 *
 * Migration 010 hardens both functions the same way 009 hardens
 * award_session_xp: pin search_path, REVOKE EXECUTE FROM PUBLIC, GRANT EXECUTE
 * only to service_role. This is a static SQL guard; the live proof (anon/
 * authenticated rpc call returns 42501, service_role still works) is recorded
 * in the PR test plan because no local Postgres is available.
 */

const MIGRATION_010 = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "010_lock_xp_increment_rpcs.sql"
);

describe("migration 010 hardens the XP-increment RPCs (CRITICAL)", () => {
  const sql = readFileSync(MIGRATION_010, "utf8");
  const lower = sql.toLowerCase();

  for (const fn of ["increment_dog_xp", "increment_user_xp"]) {
    it(`pins search_path on ${fn}`, () => {
      const re = new RegExp(
        `(alter\\s+function\\s+public\\.${fn}[\\s\\S]*?set\\s+search_path)|` +
          `(create\\s+or\\s+replace\\s+function\\s+public\\.${fn}[\\s\\S]*?set\\s+search_path)`
      );
      expect(lower).toMatch(re);
    });

    it(`revokes EXECUTE on ${fn} from PUBLIC`, () => {
      const re = new RegExp(
        `revoke\\s+execute\\s+on\\s+function\\s+public\\.${fn}[\\s\\S]*?from\\s+public`
      );
      expect(lower).toMatch(re);
    });

    it(`grants EXECUTE on ${fn} only to service_role`, () => {
      const re = new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}[\\s\\S]*?to\\s+service_role`
      );
      expect(lower).toMatch(re);
    });
  }
});
