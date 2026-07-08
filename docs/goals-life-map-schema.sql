-- Bloom OS Goals Life Map MVP.
-- Safe to re-run. Stores the editable life-design notebook state per user.

create table if not exists public.goal_life_maps (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  year_theme text not null default '',
  categories jsonb not null default '[]'::jsonb,
  recent_wins jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goal_life_maps enable row level security;

alter table public.goal_life_maps
add column if not exists ideal_day jsonb not null default '[]'::jsonb;

drop policy if exists "Users can access own goal life map" on public.goal_life_maps;
create policy "Users can access own goal life map"
on public.goal_life_maps for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.goal_life_maps to authenticated;
