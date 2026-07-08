-- Bloom OS Vision freeboard MVP.
-- Safe to re-run. Creates editable Vision sheets, free-positioned items,
-- and a private Storage bucket for uploaded images.
-- Paste this whole file into a blank Supabase SQL Editor tab.
-- Do not append it after an older query.

create table if not exists public.vision_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid not null references public.vision_boards(id) on delete cascade,
  type text not null check (type in ('image', 'text', 'sticky', 'sticker')),
  content text not null,
  x numeric(10, 2) not null default 24,
  y numeric(10, 2) not null default 24,
  width numeric(10, 2) not null default 160,
  height numeric(10, 2) not null default 100,
  rotation numeric(10, 2) not null default 0,
  z_index int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vision_boards
add column if not exists background text not null default 'dream';

alter table public.vision_items
add column if not exists color text not null default 'butter';

alter table public.vision_boards enable row level security;
alter table public.vision_items enable row level security;

drop policy if exists "Users can access own vision boards" on public.vision_boards;
create policy "Users can access own vision boards"
on public.vision_boards for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can access own vision items" on public.vision_items;
create policy "Users can access own vision items"
on public.vision_items for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.vision_boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

create index if not exists vision_boards_user_created_idx
on public.vision_boards (user_id, created_at);

create index if not exists vision_items_board_z_idx
on public.vision_items (board_id, z_index);

grant select, insert, update, delete on public.vision_boards to authenticated;
grant select, insert, update, delete on public.vision_items to authenticated;

insert into storage.buckets (id, name, public)
values ('vision-assets', 'vision-assets', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read own vision assets" on storage.objects;
create policy "Users can read own vision assets"
on storage.objects for select
using (
  bucket_id = 'vision-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own vision assets" on storage.objects;
create policy "Users can upload own vision assets"
on storage.objects for insert
with check (
  bucket_id = 'vision-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own vision assets" on storage.objects;
create policy "Users can update own vision assets"
on storage.objects for update
using (
  bucket_id = 'vision-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'vision-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own vision assets" on storage.objects;
create policy "Users can delete own vision assets"
on storage.objects for delete
using (
  bucket_id = 'vision-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
