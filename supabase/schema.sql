-- DateCard schema — the contract (see SPEC.md).
-- Run in the Supabase SQL editor.
--
-- Security model:
--   profiles: owner-only direct access. Public reads MUST go through
--            get_public_profile() (excludes socials AND owner_id, so cards
--            can't be cross-linked). Socials are revealed only via
--            reveal_socials() to the owner or an accepted applicant.
--   applications: owner OR applicant can read; a signed-in user can insert
--            only as themselves, only as 'pending', only onto an active card
--            they don't own; status update owner-only.
--
-- Safe to re-run: every statement is idempotent. Re-run it after pulling
-- schema changes.

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
-- Every security-definer function pins search_path so a malicious schema on the
-- path can't shadow public.profiles / public.applications.

-- Public profile view: everything EXCEPT socials and owner_id. Security definer
-- = bypasses RLS. owner_id is deliberately NOT returned: two cards with the same
-- owner_id would cross-link a person's serious and casual selves (SPEC §2.4).
-- The caller learns only whether the card is theirs (is_mine).
drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_id text)
returns table (
  id text, type text, name text, age int, location text,
  bio text, interests jsonb, hobbies jsonb, looking_for text, prompts jsonb,
  photo_url text, status text, settings jsonb, created_at timestamptz, updated_at timestamptz,
  is_mine boolean
)
language sql security definer stable
set search_path = public
as $$
  select p.id, p.type, p.name, p.age,
         -- casual cards never expose a city; others honour the showLocation toggle
         case when p.type = 'casual' or coalesce((p.settings->>'showLocation')::boolean, true) = false
              then null else p.location end,
         p.bio, p.interests, p.hobbies, p.looking_for, p.prompts,
         p.photo_url, p.status, p.settings, p.created_at, p.updated_at,
         (auth.uid() is not null and p.owner_id = auth.uid())
  from public.profiles p
  where p.id = p_id;
$$;

-- Can this card take an application from the current user right now?
-- Used by the applications insert policy; security definer because the
-- applicant can't see the profiles row directly (owner-only RLS).
create or replace function public.profile_accepts_applications(p_id text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id and p.status = 'active' and p.owner_id <> auth.uid()
  );
$$;

-- Socials reveal: owner always; anyone with an ACCEPTED application on that profile.
create or replace function public.reveal_socials(p_id text)
returns jsonb
language sql security definer stable
set search_path = public
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

-- Applications: owner OR applicant reads; signed-in applicant inserts (as
-- themselves, pending only, active card only); owner updates status.
drop policy if exists "applications owner read" on public.applications;
drop policy if exists "applications read" on public.applications;
create policy "applications read" on public.applications
  for select using (
    exists (select 1 from public.profiles p
            where p.id = applications.profile_id and p.owner_id = auth.uid())
    or applications.applicant_id = auth.uid()
  );

-- The old policy was `with check (true)`, which let anyone insert a row with
-- status = 'accepted' and their own applicant_id — then reveal_socials() handed
-- them the socials with no approval. The insert must be: as yourself, pending,
-- onto an active card that isn't yours.
drop policy if exists "applications anyone insert" on public.applications;
drop policy if exists "applications applicant insert" on public.applications;
create policy "applications applicant insert" on public.applications
  for insert with check (
    auth.uid() is not null
    and applicant_id = auth.uid()
    and status = 'pending'
    and public.profile_accepts_applications(profile_id)
  );

drop policy if exists "applications owner update" on public.applications;
create policy "applications owner update" on public.applications
  for update using (
    exists (select 1 from public.profiles p
            where p.id = applications.profile_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.profiles p
            where p.id = applications.profile_id and p.owner_id = auth.uid())
  );

-- Events: anyone logs view/apply/report; only the owner can log accept. Owner reads.
drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events
  for insert with check (
    kind in ('view', 'apply', 'report')
    or (kind = 'accept' and exists (select 1 from public.profiles p
                                    where p.id = events.profile_id and p.owner_id = auth.uid()))
  );

drop policy if exists "events owner read" on public.events;
create policy "events owner read" on public.events
  for select using (
    exists (select 1 from public.profiles p
            where p.id = events.profile_id and p.owner_id = auth.uid())
  );
