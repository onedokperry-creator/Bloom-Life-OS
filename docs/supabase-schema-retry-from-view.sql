-- Retry script for the Bloom OS schema when the first run stopped at
-- `create or replace view public.bloom_os_home`.
--
-- Use this if the tables/types were already created, but the original run failed with:
-- ERROR: 42703: column t.created_at does not exist

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

drop policy if exists "Users can access own profile" on public.profiles;
create policy "Users can access own profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can access own stats" on public.user_stats;
create policy "Users can access own stats"
on public.user_stats for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own goals" on public.goals;
create policy "Users can access own goals"
on public.goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own tasks" on public.tasks;
create policy "Users can access own tasks"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own mood logs" on public.mood_logs;
create policy "Users can access own mood logs"
on public.mood_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own accomplishment logs" on public.accomplishment_logs;
create policy "Users can access own accomplishment logs"
on public.accomplishment_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own vision board" on public.vision_board_items;
create policy "Users can access own vision board"
on public.vision_board_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own reward savings" on public.reward_saving_goals;
create policy "Users can access own reward savings"
on public.reward_saving_goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own finance transactions" on public.finance_transactions;
create policy "Users can access own finance transactions"
on public.finance_transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own calendar events" on public.calendar_events;
create policy "Users can access own calendar events"
on public.calendar_events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own xp events" on public.xp_events;
create policy "Users can read own xp events"
on public.xp_events for select
using (auth.uid() = user_id);

drop policy if exists "Users can access own ai journal entries" on public.ai_journal_entries;
create policy "Users can access own ai journal entries"
on public.ai_journal_entries for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own ai conversation messages" on public.ai_conversation_messages;
create policy "Users can access own ai conversation messages"
on public.ai_conversation_messages for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists tasks_user_today_idx on public.tasks (user_id, due_date, status);
create index if not exists tasks_goal_idx on public.tasks (goal_id);
create index if not exists mood_logs_user_day_idx on public.mood_logs (user_id, logged_on);
create index if not exists finance_user_schedule_idx on public.finance_transactions (user_id, scheduled_on);
create index if not exists calendar_user_starts_idx on public.calendar_events (user_id, starts_at);
create index if not exists reward_savings_user_idx on public.reward_saving_goals (user_id);
create index if not exists ai_journal_user_created_idx on public.ai_journal_entries (user_id, created_at desc);
create index if not exists ai_messages_user_created_idx on public.ai_conversation_messages (user_id, created_at desc);
