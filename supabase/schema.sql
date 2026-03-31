-- ============================================================
-- Yanwar's HQ — Full Supabase Schema
-- Run this in the Supabase SQL editor (Project > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. family_hq
-- ============================================================
create table if not exists family_hq (
  id            uuid primary key default gen_random_uuid(),
  family_code   text not null unique,
  family_name   text not null,
  family_emoji  text,
  pin           text not null,
  founder_id    text,
  founder_name  text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 2. family_members
-- ============================================================
create table if not exists family_members (
  id                uuid primary key default gen_random_uuid(),
  family_code       text not null,
  name              text not null,
  emoji             text,
  avatar_url        text,
  color             text not null check (color in ('purple','pink','blue','green','orange')),
  role              text not null check (role in ('Parent','Teen','Kid')),
  xp                integer not null default 0,
  level             integer not null default 1,
  streak            integer not null default 0,
  last_chore_date   date,
  allowance_balance numeric(12,2) not null default 0,
  weekly_xp         integer not null default 0,
  week_start        date,
  birthday          date,
  timezone          text,
  created_at        timestamptz not null default now()
);

create index if not exists family_members_family_code_idx on family_members (family_code);

-- ============================================================
-- 3. chores
-- ============================================================
create table if not exists chores (
  id             uuid primary key default gen_random_uuid(),
  family_code    text not null,
  title          text not null,
  emoji          text,
  assigned_to    text not null,   -- member id (uuid stored as text for simplicity)
  assigned_name  text,
  assigned_color text,
  due_date       date,
  points         integer not null default 10,
  completed      boolean not null default false,
  completed_date timestamptz,
  priority       integer not null default 0,
  recurring      text not null default 'none' check (recurring in ('none','daily','weekly')),
  created_at     timestamptz not null default now()
);

create index if not exists chores_family_code_idx on chores (family_code);

-- ============================================================
-- 4. calendar_events
-- ============================================================
create table if not exists calendar_events (
  id            uuid primary key default gen_random_uuid(),
  family_code   text not null,
  title         text not null,
  emoji         text,
  date          date not null,
  time          text,
  stored_tz     text check (stored_tz in ('PDT','WIB')),
  end_time      text,
  member_id     text,
  member_name   text,
  member_color  text,
  description   text,
  is_big_event  boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists calendar_events_family_code_idx on calendar_events (family_code);

-- ============================================================
-- 5. meal_plans
-- ============================================================
create table if not exists meal_plans (
  id           uuid primary key default gen_random_uuid(),
  family_code  text not null,
  day          text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_type    text not null check (meal_type in ('Breakfast','Lunch','Dinner')),
  title        text not null,
  emoji        text,
  recipe       text,
  ingredients  text,
  votes_up     integer not null default 0,
  votes_down   integer not null default 0,
  voted_by     text[] not null default '{}',
  week_of      date,
  created_at   timestamptz not null default now()
);

create index if not exists meal_plans_family_code_idx on meal_plans (family_code);

-- ============================================================
-- 6. budget_transactions
-- ============================================================
create table if not exists budget_transactions (
  id           uuid primary key default gen_random_uuid(),
  family_code  text not null,
  description  text not null,
  amount       numeric(12,2) not null,
  category     text not null check (category in ('groceries','gas','fun','dining','utilities','clothing','education','other')),
  member_id    text,
  member_name  text,
  date         date,
  type         text not null default 'expense' check (type in ('expense','allowance_add','allowance_request')),
  status       text not null default 'approved' check (status in ('approved','pending','denied')),
  created_at   timestamptz not null default now()
);

create index if not exists budget_transactions_family_code_idx on budget_transactions (family_code);

-- ============================================================
-- 7. notices
-- ============================================================
create table if not exists notices (
  id           uuid primary key default gen_random_uuid(),
  family_code  text not null,
  content      text not null,
  author_id    text,
  author_name  text not null,
  author_color text,
  color        text not null default 'yellow' check (color in ('yellow','pink','blue','green','purple')),
  pinned       boolean not null default false,
  urgent       boolean not null default false,
  reactions    jsonb not null default '{"heart":0,"laugh":0,"thumbs_up":0}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists notices_family_code_idx on notices (family_code);

-- ============================================================
-- 8. family_goals
-- ============================================================
create table if not exists family_goals (
  id             uuid primary key default gen_random_uuid(),
  family_code    text not null,
  title          text not null,
  emoji          text,
  target_amount  numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  deadline       date,
  is_shared      boolean not null default true,
  owner_id       text,
  owner_name     text,
  completed      boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists family_goals_family_code_idx on family_goals (family_code);

-- ============================================================
-- 9. family_photos
-- ============================================================
create table if not exists family_photos (
  id            uuid primary key default gen_random_uuid(),
  family_code   text not null,
  photo_url     text not null,
  caption       text,
  emoji_tag     text,
  member_id     text,
  member_name   text not null,
  member_color  text,
  member_emoji  text,
  reactions     jsonb not null default '{"heart":[],"laugh":[],"fire":[],"clap":[],"love":[]}'::jsonb,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists family_photos_family_code_idx on family_photos (family_code);

-- ============================================================
-- 10. photo_comments
-- ============================================================
create table if not exists photo_comments (
  id            uuid primary key default gen_random_uuid(),
  family_code   text not null,
  photo_id      uuid not null references family_photos(id) on delete cascade,
  text          text not null,
  member_id     text,
  member_name   text not null,
  member_color  text,
  member_emoji  text,
  created_at    timestamptz not null default now()
);

create index if not exists photo_comments_photo_id_idx on photo_comments (photo_id);
create index if not exists photo_comments_family_code_idx on photo_comments (family_code);

-- ============================================================
-- 11. rewards
-- ============================================================
create table if not exists rewards (
  id              uuid primary key default gen_random_uuid(),
  family_code     text not null,
  title           text not null,
  emoji           text,
  description     text,
  xp_cost         integer not null,
  created_by_id   text,
  created_by_name text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists rewards_family_code_idx on rewards (family_code);

-- ============================================================
-- 12. reward_redemptions
-- ============================================================
create table if not exists reward_redemptions (
  id            uuid primary key default gen_random_uuid(),
  family_code   text not null,
  reward_id     uuid,
  reward_title  text not null,
  reward_emoji  text,
  xp_cost       integer not null,
  member_id     text not null,
  member_name   text not null,
  member_color  text,
  status        text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at    timestamptz not null default now()
);

create index if not exists reward_redemptions_family_code_idx on reward_redemptions (family_code);

-- ============================================================
-- 13. activity_logs
-- ============================================================
create table if not exists activity_logs (
  id            uuid primary key default gen_random_uuid(),
  family_code   text not null,
  message       text not null,
  member_id     text,
  member_name   text not null,
  member_color  text,
  type          text check (type in ('chore','event','goal','meal','notice','budget')),
  created_at    timestamptz not null default now()
);

create index if not exists activity_logs_family_code_idx on activity_logs (family_code);

-- ============================================================
-- Row Level Security
-- The app uses family_code as the multi-tenancy key.
-- Anyone who knows the family_code can read/write that family's data.
-- This matches the existing PIN-based access model.
-- ============================================================

alter table family_hq           enable row level security;
alter table family_members      enable row level security;
alter table chores              enable row level security;
alter table calendar_events     enable row level security;
alter table meal_plans          enable row level security;
alter table budget_transactions enable row level security;
alter table notices             enable row level security;
alter table family_goals        enable row level security;
alter table family_photos       enable row level security;
alter table photo_comments      enable row level security;
alter table rewards             enable row level security;
alter table reward_redemptions  enable row level security;
alter table activity_logs       enable row level security;

-- Allow full access with the anon key (client sends family_code in queries)
-- This is intentional — the PIN on the client side is the security gate.
create policy "anon full access" on family_hq           for all using (true) with check (true);
create policy "anon full access" on family_members      for all using (true) with check (true);
create policy "anon full access" on chores              for all using (true) with check (true);
create policy "anon full access" on calendar_events     for all using (true) with check (true);
create policy "anon full access" on meal_plans          for all using (true) with check (true);
create policy "anon full access" on budget_transactions for all using (true) with check (true);
create policy "anon full access" on notices             for all using (true) with check (true);
create policy "anon full access" on family_goals        for all using (true) with check (true);
create policy "anon full access" on family_photos       for all using (true) with check (true);
create policy "anon full access" on photo_comments      for all using (true) with check (true);
create policy "anon full access" on rewards             for all using (true) with check (true);
create policy "anon full access" on reward_redemptions  for all using (true) with check (true);
create policy "anon full access" on activity_logs       for all using (true) with check (true);

-- ============================================================
-- Supabase Storage bucket for Moments photos
-- Run this separately in the Supabase dashboard:
--   Storage > New bucket > name: "moments" > Public: ON
-- Or uncomment the line below if using the storage API directly.
-- insert into storage.buckets (id, name, public) values ('moments', 'moments', true);
-- ============================================================
