-- Goodboy v0 initial schema
-- All timestamps stored as UTC. Day boundaries computed using user timezone.

-- User profiles (extends auth.users)
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  total_xp bigint not null default 0,
  current_level int not null default 1,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dogs (one per user in v0)
create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  breed text,
  age_months int,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Skills (curriculum building blocks)
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  category text not null,
  sort_order int not null default 0
);

-- Lessons (structured content within skills)
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  title text not null,
  content_md text not null default '',
  lesson_order int not null,
  path_order int not null,
  xp_reward int not null default 10
);

create index idx_lessons_path_order on public.lessons(path_order);

-- Dog skill progress
create table public.dog_skill_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  level int not null default 0,
  lessons_done int not null default 0,
  last_practiced_at timestamptz,
  unique(dog_id, skill_id)
);

-- Lesson completions
create table public.lesson_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score numeric,
  xp_awarded int not null default 0,
  completed_at timestamptz not null default now()
);

create index idx_completions_user_lesson on public.lesson_completions(user_id, lesson_id);

-- Training sessions (real-world, user-logged)
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  skill_id uuid references public.skills(id),
  duration_min int,
  rating int check (rating >= 1 and rating <= 5),
  reps int,
  notes text,
  logged_at timestamptz not null default now()
);

create index idx_sessions_user_date on public.training_sessions(user_id, logged_at);

-- User streaks
create table public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_streak_date date,
  timezone text not null default 'UTC',
  freeze_available int not null default 2,
  updated_at timestamptz not null default now()
);

-- Streak event log (audit trail)
create table public.streak_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  streak_value int not null,
  occurred_at timestamptz not null default now()
);

-- XP transactions (event-sourced, append-only)
create table public.xp_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  action_ref uuid,
  xp_amount int not null,
  idempotency_key text unique not null,
  awarded_at timestamptz not null default now()
);

create index idx_xp_user_date on public.xp_transactions(user_id, awarded_at);

-- Achievement definitions (admin-managed reference data)
create table public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  category text not null,
  condition_type text not null,
  condition_value jsonb not null default '{}',
  xp_reward int not null default 0,
  sort_order int not null default 0
);

-- User achievements
create table public.user_achievements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_def_id uuid not null references public.achievement_definitions(id),
  progress numeric not null default 0,
  unlocked_at timestamptz,
  notified_at timestamptz,
  unique(user_id, achievement_def_id)
);

create index idx_achievements_user on public.user_achievements(user_id);

-- RLS policies

alter table public.user_profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.skills enable row level security;
alter table public.lessons enable row level security;
alter table public.dog_skill_progress enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.training_sessions enable row level security;
alter table public.user_streaks enable row level security;
alter table public.streak_events enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

-- User-scoped tables: users can read/write their own data
create policy "Users read own profile" on public.user_profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.user_profiles for update using (auth.uid() = id);

create policy "Users read own dogs" on public.dogs for select using (auth.uid() = user_id);
create policy "Users insert own dogs" on public.dogs for insert with check (auth.uid() = user_id);
create policy "Users update own dogs" on public.dogs for update using (auth.uid() = user_id);

create policy "Users read own progress" on public.dog_skill_progress for select using (auth.uid() = user_id);
create policy "Users insert own progress" on public.dog_skill_progress for insert with check (auth.uid() = user_id);
create policy "Users update own progress" on public.dog_skill_progress for update using (auth.uid() = user_id);

create policy "Users read own completions" on public.lesson_completions for select using (auth.uid() = user_id);
create policy "Users insert own completions" on public.lesson_completions for insert with check (auth.uid() = user_id);

create policy "Users read own sessions" on public.training_sessions for select using (auth.uid() = user_id);
create policy "Users insert own sessions" on public.training_sessions for insert with check (auth.uid() = user_id);

create policy "Users read own streaks" on public.user_streaks for select using (auth.uid() = user_id);
create policy "Users read own streak events" on public.streak_events for select using (auth.uid() = user_id);

create policy "Users read own xp" on public.xp_transactions for select using (auth.uid() = user_id);

create policy "Users read own achievements" on public.user_achievements for select using (auth.uid() = user_id);

-- Public reference tables: readable by all authenticated users
create policy "Anyone reads skills" on public.skills for select using (true);
create policy "Anyone reads lessons" on public.lessons for select using (true);
create policy "Anyone reads achievement defs" on public.achievement_definitions for select using (true);

-- Trigger: auto-create profile + streak on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id) values (new.id);
  insert into public.user_streaks (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
