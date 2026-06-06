-- 009_atomic_session_xp.sql
--
-- L1: enforce the daily session-XP cap atomically.
--
-- The handler previously read the running daily session-XP sum in app code,
-- applied the 200/day cap in JS, then inserted a fresh xp_transactions row.
-- Because the read and the insert were separate round trips, two concurrent
-- session logs could both observe the same sum, both decide they were under the
-- cap, and both insert, letting a user exceed the cap by logging sessions in
-- parallel (eg double-tapping "log session" or scripting the server action).
--
-- award_session_xp moves the sum -> cap -> insert into a single SECURITY DEFINER
-- function. It takes a per-user transaction-scoped advisory lock FIRST, before
-- summing, so concurrent calls for the same user serialize: the second caller
-- blocks until the first commits, then sees the updated sum and is capped
-- correctly. The lock auto-releases at transaction end.
--
-- Idempotency is preserved via ON CONFLICT (idempotency_key) DO NOTHING: a
-- replay of the same (user, session) inserts nothing and the function returns 0,
-- so the caller does not re-increment the dog/user XP totals.
--
-- Hardening:
--   * SET search_path = public, pg_temp pins name resolution (SECURITY DEFINER
--     functions must never inherit a caller-controlled search_path).
--   * EXECUTE is revoked from PUBLIC and granted only to service_role, matching
--     the service-role-only write architecture (clients never call this).
--   * The caller (the service-role admin client) passes the authenticated
--     user_id; the function trusts it and does not reference auth.uid(), which
--     has no meaning under the service role.

create or replace function public.award_session_xp(
  p_user_id uuid,
  p_action_ref uuid,
  p_idempotency_key text,
  p_amount int,
  p_day_start timestamptz,
  p_cap int
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sum int;
  v_capped int;
  v_inserted int;
begin
  -- Lock FIRST (before the sum) so concurrent awards for this user serialize.
  -- Namespaced two-key form to avoid collisions with other advisory locks.
  perform pg_advisory_xact_lock(hashtext('award_session_xp'), hashtext(p_user_id::text));

  select coalesce(sum(xp_amount), 0)
    into v_sum
    from public.xp_transactions
   where user_id = p_user_id
     and action_type = 'session_log'
     and awarded_at >= p_day_start;

  v_capped := least(p_amount, greatest(0, p_cap - v_sum));

  if v_capped <= 0 then
    return 0;
  end if;

  insert into public.xp_transactions (user_id, action_type, action_ref, xp_amount, idempotency_key)
  values (p_user_id, 'session_log', p_action_ref, v_capped, p_idempotency_key)
  on conflict (idempotency_key) do nothing;

  get diagnostics v_inserted = row_count;

  -- A conflict means this (user, session) was already awarded; award nothing
  -- more so the caller does not double-increment the XP totals on replay.
  if v_inserted = 0 then
    return 0;
  end if;

  return v_capped;
end;
$$;

revoke execute on function public.award_session_xp(uuid, uuid, text, int, timestamptz, int) from public;
grant execute on function public.award_session_xp(uuid, uuid, text, int, timestamptz, int) to service_role;

-- ---------------------------------------------------------------------------
-- ROLLBACK:
--   drop function if exists public.award_session_xp(uuid, uuid, text, int, timestamptz, int);
-- ---------------------------------------------------------------------------
