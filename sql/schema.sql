-- =========================================================
-- Outreach Studio — Supabase schema (v2 baseline)
-- Run this ONLY for a brand-new project with no existing data.
--
-- Already running Outreach Studio with real data? Do NOT run this file —
-- it drops and recreates tables. Use the files in sql/migrations/ instead,
-- which are additive-only (ALTER TABLE, no drops) and safe to run live.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- creators
-- ---------------------------------------------------------
drop table if exists creator_events cascade;
drop table if exists notifications cascade;
drop table if exists creators cascade;

create table creators (
  id                    uuid primary key default gen_random_uuid(),

  -- Research fields
  creator_name          text not null,
  platform              text,
  channel_link          text,
  instagram             text,
  x_handle              text,
  email                 text,
  original_video        text,
  problem_found         text,
  my_reedit_link        text,
  subject               text,
  custom_first_email    text,
  priority              text not null default 'Medium', -- Low | Medium | High
  notes                 text,
  need_reedit           boolean not null default false,

  -- Outreach state
  -- status: 'Need First Email' | 'Need Social DM' | 'Waiting' |
  --         'Replied' | 'Client' | 'Closed'
  status                text not null default 'Need First Email',
  current_step          text not null default 'first_email',
  follow_up_count       integer not null default 0,
  used_followups        jsonb not null default '[]'::jsonb,
  email_only            boolean not null default false, -- no email at all -> social only
  social_only           boolean not null default false,

  first_email_at        timestamptz,
  last_contact_at       timestamptz,
  next_action_at        timestamptz,
  social_dm_sent_at     timestamptz,
  replied_at            timestamptz,
  client_at             timestamptz,
  closed_at             timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_creators_status          on creators (status);
create index idx_creators_next_action_at  on creators (next_action_at);
create index idx_creators_platform        on creators (platform);
create index idx_creators_priority        on creators (priority);
create index idx_creators_name_lower      on creators (lower(creator_name));

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_creators_updated_at
before update on creators
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- creator_events — the per-creator timeline
-- ---------------------------------------------------------
create table creator_events (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references creators(id) on delete cascade,
  event_type    text not null,   -- research_added, first_email_sent, followup_sent, social_dm_sent, replied, client, closed, note
  label         text not null,
  created_at    timestamptz not null default now()
);

create index idx_events_creator on creator_events (creator_id, created_at);

-- ---------------------------------------------------------
-- notifications — reply alerts etc, feeds the bell icon
-- ---------------------------------------------------------
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid references creators(id) on delete cascade,
  type          text not null default 'reply', -- reply | follow_up_due | system
  message       text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_notifications_read on notifications (read, created_at desc);

-- ---------------------------------------------------------
-- settings — single row, this app has one user
-- ---------------------------------------------------------
create table settings (
  id                integer primary key default 1,
  user_name         text,
  business_name     text,
  email_signature   text,
  timezone          text default 'UTC',
  followup_delays   jsonb not null default '[24,24,48,72,96,96,96,96,120]'::jsonb,
  constraint settings_singleton check (id = 1)
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------
-- Row Level Security — single personal user, anon key only
-- ---------------------------------------------------------
alter table creators enable row level security;
alter table creator_events enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;

create policy "Allow all for anon" on creators        for all using (true) with check (true);
create policy "Allow all for anon" on creator_events   for all using (true) with check (true);
create policy "Allow all for anon" on notifications    for all using (true) with check (true);
create policy "Allow all for anon" on settings         for all using (true) with check (true);
