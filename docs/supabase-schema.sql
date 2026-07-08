-- Shared Supabase schema for:
-- 1. task management app
-- 2. household finance app
-- 3. self-affirmation life app
--
-- Run in Supabase SQL Editor after enabling Supabase Auth.

create extension if not exists pgcrypto;

create type app_source as enum ('task_app', 'finance_app', 'bloom_os');
create type goal_status as enum ('active', 'paused', 'completed', 'archived');
create type task_status as enum ('todo', 'doing', 'done', 'archived');
create type mood_value as enum ('happy', 'smile', 'calm', 'sad', 'tired');
create type transaction_kind as enum ('income', 'expense', 'saving');
create type event_kind as enum ('task', 'finance', 'reward', 'personal', 'habit');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Mio',
  avatar_key text,
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level int not null default 1 check (level >= 1),
  exp int not null default 0 check (exp >= 0),
  coins int not null default 0 check (coins >= 0),
  current_streak int not null default 0 check (current_streak >= 0),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'life',
  status goal_status not null default 'active',
  target_date date,
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  source_app app_source not null default 'bloom_os',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  due_date date,
  due_at timestamptz,
  completed_at timestamptz,
  exp_reward int not null default 30 check (exp_reward >= 0),
  coin_reward int not null default 10 check (coin_reward >= 0),
  vision_progress_delta int not null default 0 check (vision_progress_delta >= 0),
  source_app app_source not null default 'task_app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_on date not null default current_date,
  mood mood_value not null,
  memo text,
  source_app app_source not null default 'bloom_os',
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create table public.accomplishment_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  note text,
  logged_on date not null default current_date,
  source_app app_source not null default 'bloom_os',
  created_at timestamptz not null default now()
);

create table public.vision_board_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  image_url text,
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  target_amount numeric(12, 0) not null check (target_amount > 0),
  current_amount numeric(12, 0) not null default 0 check (current_amount >= 0),
  target_date date,
  source_app app_source not null default 'finance_app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_saving_goal_id uuid references public.reward_saving_goals(id) on delete set null,
  title text not null,
  amount numeric(12, 0) not null,
  kind transaction_kind not null,
  category text not null default 'other',
  scheduled_on date,
  paid_on date,
  source_app app_source not null default 'finance_app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  finance_transaction_id uuid references public.finance_transactions(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  kind event_kind not null default 'personal',
  source_app app_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  amount int not null,
  coins int not null default 0,
  reason text not null,
  source_app app_source not null,
  created_at timestamptz not null default now()
);

create table public.ai_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood_log_id uuid references public.mood_logs(id) on delete set null,
  title text,
  body text not null,
  ai_summary text,
  reflection_prompt text,
  source_app app_source not null default 'bloom_os',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  journal_entry_id uuid references public.ai_journal_entries(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text,
  source_app app_source not null default 'bloom_os',
  created_at timestamptz not null default now()
);

create or replace view public.bloom_os_home as
select
  p.id as user_id,
  p.display_name,
  s.level,
  s.exp,
  s.coins,
  (
    select jsonb_agg(t order by t.due_at nulls last, t.created_at)
    from (
      select id, title, status, due_date, due_at, created_at
      from public.tasks
      where user_id = p.id
        and status <> 'archived'
        and (due_date = current_date or due_at::date = current_date)
      limit 5
    ) t
  ) as today_tasks,
  (
    select to_jsonb(m)
    from public.mood_logs m
    where m.user_id = p.id and m.logged_on = current_date
    limit 1
  ) as today_mood,
  (
    select jsonb_agg(g order by g.updated_at desc)
    from (
      select id, title, target_amount, current_amount, target_date, updated_at
      from public.reward_saving_goals
      where user_id = p.id
      limit 3
    ) g
  ) as reward_savings,
  (
    select jsonb_agg(e order by e.starts_at)
    from (
      select id, title, starts_at, ends_at, kind
      from public.calendar_events
      where user_id = p.id
        and starts_at::date = current_date
      limit 8
    ) e
  ) as today_calendar
from public.profiles p
left join public.user_stats s on s.user_id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Mio'));

  insert into public.user_stats (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.apply_task_completion_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    insert into public.accomplishment_logs (user_id, task_id, title, note, source_app)
    values (new.user_id, new.id, new.title, 'タスク管理アプリで達成', 'task_app');

    insert into public.xp_events (user_id, task_id, amount, coins, reason, source_app)
    values (new.user_id, new.id, new.exp_reward, new.coin_reward, 'task_completed', 'task_app');

    update public.user_stats
    set
      exp = exp + new.exp_reward,
      coins = coins + new.coin_reward,
      level = 1 + floor((exp + new.exp_reward) / 3000)::int,
      updated_at = now()
    where user_id = new.user_id;

    update public.vision_board_items
    set
      progress_percent = least(100, progress_percent + new.vision_progress_delta),
      updated_at = now()
    where goal_id = new.goal_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_task_completed on public.tasks;
create trigger on_task_completed
after update of status on public.tasks
for each row execute procedure public.apply_task_completion_rewards();

alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.mood_logs enable row level security;
alter table public.accomplishment_logs enable row level security;
alter table public.vision_board_items enable row level security;
alter table public.reward_saving_goals enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.xp_events enable row level security;
alter table public.ai_journal_entries enable row level security;
alter table public.ai_conversation_messages enable row level security;

create policy "Users can access own profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can access own stats"
on public.user_stats for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own goals"
on public.goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own tasks"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own mood logs"
on public.mood_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own accomplishment logs"
on public.accomplishment_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own vision board"
on public.vision_board_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own reward savings"
on public.reward_saving_goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own finance transactions"
on public.finance_transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own calendar events"
on public.calendar_events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read own xp events"
on public.xp_events for select
using (auth.uid() = user_id);

create policy "Users can access own ai journal entries"
on public.ai_journal_entries for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can access own ai conversation messages"
on public.ai_conversation_messages for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index tasks_user_today_idx on public.tasks (user_id, due_date, status);
create index tasks_goal_idx on public.tasks (goal_id);
create index mood_logs_user_day_idx on public.mood_logs (user_id, logged_on);
create index finance_user_schedule_idx on public.finance_transactions (user_id, scheduled_on);
create index calendar_user_starts_idx on public.calendar_events (user_id, starts_at);
create index reward_savings_user_idx on public.reward_saving_goals (user_id);
create index ai_journal_user_created_idx on public.ai_journal_entries (user_id, created_at desc);
create index ai_messages_user_created_idx on public.ai_conversation_messages (user_id, created_at desc);
