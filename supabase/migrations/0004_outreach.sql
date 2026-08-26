alter table brokers add column if not exists contact_count int not null default 0;
alter table brokers add column if not exists flats_found int not null default 0;

create table if not exists outreach_events (
  id serial primary key,
  broker_id int not null references brokers(id) on delete cascade,
  kind text not null check (kind in ('contact', 'flat_found')),
  budget_min int,
  budget_max int,
  property_tags text[] not null default '{}',
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (broker_id, kind, ip_hash)
);

create index if not exists outreach_events_broker_idx on outreach_events (broker_id);

alter table outreach_events enable row level security;
