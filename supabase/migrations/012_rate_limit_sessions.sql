-- 012_rate_limit_sessions.sql
--
-- L2: enforce the per-user session-log rate limit atomically.
--
-- The previous guard read the user's most recent training_sessions.logged_at in
-- app code and rejected logs fired within 2s. Because the read and the
-- subsequent insert were separate round trips, two concurrent session logs
-- could both observe the same prior timestamp, both decide enough time had
-- passed, and both insert, letting a user flood training_sessions (and the
-- derived session counts / achievement thresholds) by logging in parallel. The
-- authoritative daily XP cap (award_session_xp, migration 009) still bounded XP,
-- but row-flooding was unbounded.
--
-- check_session_rate moves the check-and-record into a single SECURITY DEFINER
-- function that takes a per-user transaction-scoped advisory lock FIRST, then
-- reads the last attempt and records the new one inside the same transaction.
-- Concurrent calls for the same user serialize: the first records now() and
-- returns true; the second blocks until the first commits, sees the fresh
-- timestamp, and returns false. The record happens in the RPC (not deferred to
-- the app's insert), which is what actually closes the race.
--
-- The attempt timestamp lives in its own user_rate_limits table rather than
-- being derived from training_sessions, so the rate decision does not depend on
-- the insert path and a rate-limiter change can never corrupt session data.
--
-- Hardening (mirrors 009/010):
--   * SET search_path = public, pg_temp pins name resolution.
--   * RLS is enabled on user_rate_limits with no client policies; combined with
--     the revoked PUBLIC execute, only the service role can read or write it,
--     matching the service-role-only write architecture (migration 008).
--   * EXECUTE is revoked from PUBLIC and granted only to service_role.
--   * The caller (service-role admin client) passes the authenticated user_id;
--     the function trusts it and does not reference auth.uid().

create table if not exists public.user_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_session_at timestamptz not null default now()
);

alter table public.user_rate_limits enable row level security;
-- No client policies by design: this table is service-role only.

create or replace function public.check_session_rate(
  p_user_id uuid,
  p_min_interval_ms int
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_last timestamptz;
begin
  -- Lock FIRST (before the read) so concurrent checks for this user serialize.
  -- Namespaced two-key form to avoid collisions with other advisory locks.
  perform pg_advisory_xact_lock(hashtext('check_session_rate'), hashtext(p_user_id::text));

  select last_session_at
    into v_last
    from public.user_rate_limits
   where user_id = p_user_id;

  if v_last is not null
     and now() - v_last < (p_min_interval_ms * interval '1 millisecond') then
    -- Too soon: do not record this attempt, so the window is measured from the
    -- last accepted log rather than from every rejected retry.
    return false;
  end if;

  insert into public.user_rate_limits (user_id, last_session_at)
  values (p_user_id, now())
  on conflict (user_id) do update set last_session_at = now();

  return true;
end;
$$;

revoke execute on function public.check_session_rate(uuid, int) from public;
grant execute on function public.check_session_rate(uuid, int) to service_role;

-- ---------------------------------------------------------------------------
-- ROLLBACK:
--   drop function if exists public.check_session_rate(uuid, int);
--   drop table if exists public.user_rate_limits;
-- ---------------------------------------------------------------------------
