-- DateCard schema — the contract (see SPEC.md).
-- Run in the Supabase SQL editor.
--
-- Security model:
--   profiles: owner-only direct access. Public reads MUST go through
--            get_public_profile() (excludes socials). Socials are revealed
--            only via reveal_socials() to the owner or an accepted applicant.
--   applications: owner OR applicant can read; anyone signed in can insert;
--            status update owner-only.

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
  socials     jsonb not null default '{}',         -- NEVER exposed publicly (RPC-only)
  photo_url   text,
  status      text not null default 'active' check (status in ('active', 'paused')),
  settings    jsonb not null default '{}',         -- {showLocation: bool}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, type)                          -- one profile per card type
);

-- ─── APPLICATIONS ────────────────────────────────────────────────────────────
create table if not exists public.applications (
  id           text primary key,
  profile_id   text not null references public.profiles (id) on delete cascade,
  applicant_id uuid references auth.users (id) on delete set null,  -- null in demo/pre-auth
  name         text,
  handle       text,
  platform     text,
  emoji        text,
  note         text,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now()
);
create index if not exists applications_profile_idx on public.applications (profile_id);
create index if not exists applications_applicant_idx on public.applications (applicant_id);

-- ─── EVENTS (scans / views / applies / reports) ──────────────────────────────
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  profile_id text not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('view', 'apply', 'accept', 'report')),
  created_at timestamptz not null default now()
);
create index if not exists events_profile_idx on public.events (profile_id);

-- ─── RPCs (the only public doorways) ─────────────────────────────────────────

-- Public profile view: everything EXCEPT socials. Security definer = bypasses RLS.
create or replace function public.get_public_profile(p_id text)
returns table (
  id text, owner_id uuid, type text, name text, age int, location text,
  bio text, interests jsonb, hobbies jsonb, looking_for text, prompts jsonb,
  photo_url text, status text, settings jsonb, created_at timestamptz, updated_at timestamptz
)
language sql security definer stable
as $$
  select p.id, p.owner_id, p.type, p.name, p.age, p.location, p.bio,
         p.interests, p.hobbies, p.looking_for, p.prompts,
         p.photo_url, p.status, p.settings, p.created_at, p.updated_at
  from public.profiles p
  where p.id = p_id;
$$;

-- Socials reveal: owner always; anyone with an ACCEPTED application on that profile.
create or replace function public.reveal_socials(p_id text)
returns jsonb
language sql security definer stable
as $$
  select case
    when p.owner_id = auth.uid() then p.socials
    when exists (
      select 1 from public.applications a
      where a.profile_id = p.id and a.applicant_id = auth.uid() and a.status = 'accepted'
    ) then p.socials
    else null
  end
  from public.profiles p
  where p.id = p_id;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.events enable row level security;

-- Profiles: owner-only direct access (public reads go through the RPC).
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles owner read" on public.profiles;
create policy "profiles owner read" on public.profiles
  for select using (auth.uid() = owner_id);

drop policy if exists "profiles owner insert" on public.profiles;
create policy "profiles owner insert" on public.profiles
  for insert with check (auth.uid() = owner_id);

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = owner_id);

drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles owner delete" on public.profiles
  for delete using (auth.uid() = owner_id);

-- Applications: owner OR applicant reads; anyone inserts; owner updates status.
drop policy if exists "applications owner read" on public.applications;
drop policy if exists "applications read" on public.applications;
create policy "applications read" on public.applications
  for select using (
    exists (select 1 from public.profiles p
            where p.id = applications.profile_id and p.owner_id = auth.uid())
    or applications.applicant_id = auth.uid()
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

-- Events: anyone logs, owner reads.
drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events
  for insert with check (true);

drop policy if exists "events owner read" on public.events;
create policy "events owner read" on public.events
  for select using (
    exists (select 1 from public.profiles p
            where p.id = events.profile_id and p.owner_id = auth.uid())
  );
