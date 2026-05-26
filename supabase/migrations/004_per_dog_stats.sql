-- Per-dog XP and level
alter table public.dogs
  add column if not exists total_xp bigint not null default 0,
  add column if not exists current_level int not null default 1;

-- Per-dog streaks
create table if not exists public.dog_streaks (
  dog_id uuid primary key references public.dogs(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_streak_date date,
  freeze_available int not null default 2,
  updated_at timestamptz not null default now()
);

alter table public.dog_streaks enable row level security;
create policy "Users read own dog streaks" on public.dog_streaks
  for select using (
    dog_id in (select id from public.dogs where user_id = auth.uid())
  );

-- Backfill: copy user-level stats to their first (active) dog
update public.dogs d
set total_xp = p.total_xp,
    current_level = p.current_level
from public.user_profiles p
where d.user_id = p.id
  and d.id = p.active_dog_id;

-- Backfill: copy user streaks to dog streaks for active dog
insert into public.dog_streaks (dog_id, current_streak, longest_streak, last_streak_date, freeze_available, updated_at)
select p.active_dog_id, s.current_streak, s.longest_streak, s.last_streak_date, s.freeze_available, s.updated_at
from public.user_streaks s
join public.user_profiles p on s.user_id = p.id
where p.active_dog_id is not null
on conflict (dog_id) do nothing;
