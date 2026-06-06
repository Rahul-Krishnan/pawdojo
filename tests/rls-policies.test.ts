import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * H1 + M1 regression guard.
 *
 * Architecture: every application write goes through the service-role admin
 * client (BYPASSRLS). Client-reachable (anon / authenticated role) writes are
 * NOT supposed to exist. Migration 001 shipped client INSERT/UPDATE policies
 * that, combined with the exposed anon key, let a logged-in user write
 * arbitrary rows to their own stat tables (eg set total_xp = 999999) straight
 * through PostgREST, bypassing all server-side validation.
 *
 * Migration 008 drops those client write policies. RLS stays enabled, so with
 * no permissive INSERT/UPDATE policy PostgREST denies client writes with 42501
 * while the service-role path is unaffected.
 *
 * This test computes the *effective* policy set by replaying every
 * `create policy` / `drop policy` statement across all migrations in order,
 * then asserts no client INSERT/UPDATE policy survives on the locked tables
 * (and that the SELECT policies are NOT over-dropped). It deterministically
 * couples migration 008 to the security property without a live database.
 *
 * NOTE: the live proof (connect with the anon key + a real user JWT and watch
 * a direct REST write get rejected 42501 post-008) must be run manually against
 * a Supabase instance and recorded in the PR test plan; no local Postgres /
 * Docker is available in CI here.
 */

const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

// Tables that must be SELECT-only for client roles after the lockdown.
const LOCKED_TABLES = [
  "user_profiles",
  "dogs",
  "dog_skill_progress",
  "lesson_completions",
  "training_sessions",
] as const;

type Command = "select" | "insert" | "update" | "delete" | "all";

interface Policy {
  name: string;
  table: string;
  command: Command;
}

function loadEffectivePolicies(): Policy[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const policies = new Map<string, Policy>(); // key: `${table}::${name}`

  const createRe =
    /create\s+policy\s+"([^"]+)"\s+on\s+(?:public\.)?(\w+)\s+for\s+(select|insert|update|delete|all)/gi;
  const dropRe = /drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+(?:public\.)?(\w+)/gi;

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    // Strip line comments so commented-out rollback DDL is ignored.
    const active = sql
      .split("\n")
      .map((line) => {
        const idx = line.indexOf("--");
        return idx === -1 ? line : line.slice(0, idx);
      })
      .join("\n");

    for (const m of active.matchAll(createRe)) {
      const [, name, table, command] = m;
      policies.set(`${table}::${name}`, {
        name,
        table,
        command: command.toLowerCase() as Command,
      });
    }
    for (const m of active.matchAll(dropRe)) {
      const [, name, table] = m;
      policies.delete(`${table}::${name}`);
    }
  }

  return [...policies.values()];
}

describe("RLS client write lockdown (H1 + M1)", () => {
  const effective = loadEffectivePolicies();

  for (const table of LOCKED_TABLES) {
    it(`${table} has no client INSERT/UPDATE/ALL policy`, () => {
      const writePolicies = effective.filter(
        (p) =>
          p.table === table &&
          (p.command === "insert" ||
            p.command === "update" ||
            p.command === "delete" ||
            p.command === "all")
      );
      expect(
        writePolicies,
        `client write policies still present on ${table}: ${writePolicies
          .map((p) => `${p.name} (${p.command})`)
          .join(", ")}`
      ).toEqual([]);
    });

    it(`${table} still has its client SELECT policy (not over-dropped)`, () => {
      const selectPolicies = effective.filter(
        (p) => p.table === table && p.command === "select"
      );
      expect(
        selectPolicies.length,
        `expected a SELECT policy to remain on ${table}`
      ).toBeGreaterThan(0);
    });
  }
});
