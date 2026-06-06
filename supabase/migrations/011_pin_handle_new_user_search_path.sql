-- 011_pin_handle_new_user_search_path.sql
--
-- Pin search_path on handle_new_user(), closing the last unpinned SECURITY
-- DEFINER function flagged in the audit.
--
-- handle_new_user() was created in 001 and re-created in 007 as SECURITY DEFINER
-- but left without a pinned search_path. That is the same search_path-injection
-- class migration 010 closed for the XP-increment RPCs: a SECURITY DEFINER call
-- that inherits a caller-controlled search_path can be steered to resolve
-- unqualified names against attacker-created objects.
--
-- Unlike the XP RPCs, handle_new_user() is a zero-argument trigger function
-- (fired by on_auth_user_created AFTER INSERT ON auth.users). PostgREST only
-- exposes callable functions as RPCs, not trigger functions, so this one is not
-- reachable at /rest/v1/rpc/* and needs no REVOKE/GRANT. Pinning search_path is
-- the whole fix. Its body is already fully schema-qualified
-- (public.user_profiles), so it is safe under search_path = public, pg_temp.
--
-- This does NOT change the function body (007 stays the source of the logic).

alter function public.handle_new_user() set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- ROLLBACK (restores the prior unpinned state):
--   alter function public.handle_new_user() reset search_path;
-- ---------------------------------------------------------------------------
