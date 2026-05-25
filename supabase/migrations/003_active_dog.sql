-- Add active_dog_id to user_profiles for multi-dog support
alter table public.user_profiles
  add column if not exists active_dog_id uuid references public.dogs(id) on delete set null;

-- Backfill: set active_dog_id to each user's first dog (by created_at)
update public.user_profiles p
set active_dog_id = (
  select d.id from public.dogs d
  where d.user_id = p.id
  order by d.created_at asc
  limit 1
)
where p.active_dog_id is null;
