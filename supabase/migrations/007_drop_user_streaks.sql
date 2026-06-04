-- Drop the legacy user_streaks table.
-- Streaks are per-dog now and live in dog_streaks (migration 004). Nothing reads
-- user_streaks anymore: the app-level write was removed and the 004 backfill that
-- read it has already run.

-- Stop seeding user_streaks on signup before dropping the table, otherwise the
-- trigger would fail on every new auth.users insert.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Dropping the table also removes its RLS policy ("Users read own streaks").
drop table if exists public.user_streaks;
