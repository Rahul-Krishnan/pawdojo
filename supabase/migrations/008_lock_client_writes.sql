-- 008_lock_client_writes.sql
--
-- H1 (critical) + M1: remove client-reachable write access to the stat tables.
--
-- Architecture: every application write goes through the service-role admin
-- client (createAdminClient -> service_role, which has BYPASSRLS). Clients
-- (anon / authenticated role, holding the public NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- only ever read. Migration 001, however, shipped client INSERT/UPDATE policies
-- on the user-owned stat tables. Combined with the publicly-exposed anon key,
-- a logged-in user could issue a direct PostgREST write (eg
--   update user_profiles set total_xp = 999999 where id = auth.uid())
-- bypassing every server-side validation and the XP/gamification pipeline.
--
-- This migration DROPS those client write policies. RLS stays ENABLED on each
-- table, and with no permissive INSERT/UPDATE policy PostgREST denies client
-- writes with error 42501 (insufficient privilege). The service-role admin
-- path is unaffected (BYPASSRLS), so the running app keeps working. SELECT
-- policies are intentionally kept so clients can still read their own data.
--
-- This mirrors the read-only policy pattern already used for dog_streaks
-- (migration 004) and user_streaks / streak_events (migration 001), where the
-- tables are writable only by the service-role pipeline.

-- user_profiles: drop client UPDATE (keep "Users read own profile" SELECT)
drop policy if exists "Users update own profile" on public.user_profiles;

-- dogs: drop client INSERT + UPDATE (keep "Users read own dogs" SELECT)
drop policy if exists "Users insert own dogs" on public.dogs;
drop policy if exists "Users update own dogs" on public.dogs;

-- dog_skill_progress: drop client INSERT + UPDATE (keep "Users read own progress" SELECT)
drop policy if exists "Users insert own progress" on public.dog_skill_progress;
drop policy if exists "Users update own progress" on public.dog_skill_progress;

-- lesson_completions: drop client INSERT (keep "Users read own completions" SELECT)
drop policy if exists "Users insert own completions" on public.lesson_completions;

-- training_sessions: drop client INSERT (keep "Users read own sessions" SELECT)
drop policy if exists "Users insert own sessions" on public.training_sessions;

-- ---------------------------------------------------------------------------
-- ROLLBACK (recreate the dropped policies verbatim, for a mechanical revert):
--
-- create policy "Users update own profile" on public.user_profiles for update using (auth.uid() = id);
-- create policy "Users insert own dogs" on public.dogs for insert with check (auth.uid() = user_id);
-- create policy "Users update own dogs" on public.dogs for update using (auth.uid() = user_id);
-- create policy "Users insert own progress" on public.dog_skill_progress for insert with check (auth.uid() = user_id);
-- create policy "Users update own progress" on public.dog_skill_progress for update using (auth.uid() = user_id);
-- create policy "Users insert own completions" on public.lesson_completions for insert with check (auth.uid() = user_id);
-- create policy "Users insert own sessions" on public.training_sessions for insert with check (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
