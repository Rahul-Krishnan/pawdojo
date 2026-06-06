-- 010_lock_xp_increment_rpcs.sql
--
-- CRITICAL: stop the XP-increment RPCs from being client-callable.
--
-- Migration 006 created increment_dog_xp(uuid, int) and
-- increment_user_xp(uuid, int) as SECURITY DEFINER functions but left them with
-- the default PUBLIC EXECUTE and no pinned search_path. Supabase exposes every
-- public-schema function as a PostgREST RPC (/rest/v1/rpc/<fn>), and a SECURITY
-- DEFINER function with PUBLIC EXECUTE runs as its definer (BYPASSRLS). Any
-- authenticated client could therefore POST to /rest/v1/rpc/increment_user_xp
-- with an arbitrary id and amount and inflate any user's or dog's XP, bypassing
-- the client-write lockdown that migration 008 established for the base tables.
--
-- This migration does NOT change the function bodies (migration 006 stays the
-- source of the logic). It only:
--   * pins search_path = public, pg_temp via ALTER FUNCTION, so a SECURITY
--     DEFINER call can never inherit a caller-controlled search_path;
--   * REVOKEs EXECUTE from PUBLIC and GRANTs it only to service_role, matching
--     the service-role-only write architecture (the admin client is the sole
--     caller; anon/authenticated never invoke these directly).
--
-- The argument lists are spelled out so the grants bind to the exact overloads
-- created in 006.

alter function public.increment_dog_xp(uuid, int) set search_path = public, pg_temp;
alter function public.increment_user_xp(uuid, int) set search_path = public, pg_temp;

revoke execute on function public.increment_dog_xp(uuid, int) from public;
revoke execute on function public.increment_user_xp(uuid, int) from public;

grant execute on function public.increment_dog_xp(uuid, int) to service_role;
grant execute on function public.increment_user_xp(uuid, int) to service_role;

-- ---------------------------------------------------------------------------
-- ROLLBACK (restores 006's default-PUBLIC, unpinned-search_path state):
--   grant execute on function public.increment_dog_xp(uuid, int) to public;
--   grant execute on function public.increment_user_xp(uuid, int) to public;
--   alter function public.increment_dog_xp(uuid, int) reset search_path;
--   alter function public.increment_user_xp(uuid, int) reset search_path;
--   revoke execute on function public.increment_dog_xp(uuid, int) from service_role;
--   revoke execute on function public.increment_user_xp(uuid, int) from service_role;
-- ---------------------------------------------------------------------------
