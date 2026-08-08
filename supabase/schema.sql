-- DateCard schema — one account, up to 3 profiles (one per card type).
-- Run this in the Supabase SQL editor. RLS keeps public pages readable
-- while only the owner can create/update their profiles.

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          text primary key,                    -- client-generated (e.g. A1B2C3D4)
  owner_id    uuid not null references auth.users (id) on delete cascade,
  type        text not null check (type in ('serious', 'casual', 'friendship')),
  name        text not null,
  age         int,
  location    text,
  bio         text,
  interests   jsonb not null default '[]',
  hobbies     jsonb not null default '[]',
  looking_for text,
  prompts     jsonb not null default '[]',         -- [{prompt, answer}]
  socials     jsonb not null default '{}',         -- revealed only on accept
  photo_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, type)                          -- one profile per card type
);

-- ─── APPLICATIONS ────────────────────────────────────────────────────────────
create table if not exists public.applications (
  id         text primary key,
  profile_id text not null references public.profiles (id) on delete cascade,
  name       text,
  handle     text,
  platform   text,
  emoji      text,
  note       text,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create index if not exists applications_profile_idx on public.applications (profile_id);

-- ─── EVENTS (future analytics: scans / views) ────────────────────────────────
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  profile_id text not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('scan', 'view', 'apply')),
  created_at timestamptz not null default now()
);
create index if not exists events_profile_idx on public.events (profile_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.events enable row level security;

-- Profiles: public pages are the whole point — anyone can read.
-- Only the owner can create/update/delete their own.
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles
  for select using (true);

drop policy if exists "profiles owner insert" on public.profiles;
create policy "profiles owner insert" on public.profiles
  for insert with check (auth.uid() = owner_id);

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = owner_id);

drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles owner delete" on public.profiles
  for delete using (auth.uid() = owner_id);

-- Applications: anyone signed in can apply; the profile owner reads/updates.
drop policy if exists "applications owner read" on public.applications;
create policy "applications owner read" on public.applications
  for select using (
    exists (select 1 from public.profiles p
            where p.id = applications.profile_id and p.owner_id = auth.uid())
  );

drop policy if exists "applications anyone insert" on public.applications;
create policy "applications anyone insert" on public.applications
  for insert with check (true);

drop policy if exists "applications owner update" on public.applications;
create policy "applications owner update" on public.applications
  for update using (
    exists (select 1 from public.profiles p
            where p.id = applications.profile_id and p.owner_id = auth.uid())
  );

-- Events: anyone can log, owner reads.
drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events
  for insert with check (true);

drop policy if exists "events owner read" on public.events;
create policy "events owner read" on public.events
  for select using (
    exists (select 1 from public.profiles p
            where p.id = events.profile_id and p.owner_id = auth.uid())
  );
