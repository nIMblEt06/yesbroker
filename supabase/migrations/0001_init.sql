create table if not exists areas (
  id serial primary key,
  name text not null,
  slug text not null unique,
  aliases text[] not null default '{}',
  kind text not null default 'area',
  source text not null default 'curated',
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists brokers (
  id serial primary key,
  phone text not null unique,
  display_name text,
  aliases text[] not null default '{}',
  budget_min int,
  budget_max int,
  property_tags text[] not null default '{}',
  notes text not null default '',
  added_by_count int not null default 1,
  helpful_votes int not null default 0,
  report_count int not null default 0,
  is_hidden boolean not null default false,
  is_deleted boolean not null default false,
  has_name_conflict boolean not null default false,
  first_added_at timestamptz not null default now(),
  last_added_at timestamptz not null default now()
);

create table if not exists broker_areas (
  broker_id int not null references brokers(id) on delete cascade,
  area_id int not null references areas(id),
  primary key (broker_id, area_id)
);

create table if not exists submissions (
  id serial primary key,
  broker_id int references brokers(id) on delete set null,
  phone_normalized text not null,
  name text,
  area_ids int[] not null default '{}',
  budget_min int,
  budget_max int,
  property_tags text[] not null default '{}',
  notes text,
  source text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id serial primary key,
  broker_id int not null references brokers(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  unique (broker_id, ip_hash)
);

create table if not exists reports (
  id serial primary key,
  broker_id int not null references brokers(id) on delete cascade,
  ip_hash text not null,
  reason text not null check (reason in ('wrong_number','dead_number','spam','abusive','other')),
  note text,
  created_at timestamptz not null default now(),
  unique (broker_id, ip_hash)
);

create index if not exists brokers_feed_idx on brokers (is_deleted, is_hidden, last_added_at desc);
create index if not exists broker_areas_area_idx on broker_areas (area_id);
create index if not exists submissions_broker_idx on submissions (broker_id);
create index if not exists votes_broker_idx on votes (broker_id);
create index if not exists reports_broker_idx on reports (broker_id);

alter table areas enable row level security;
alter table brokers enable row level security;
alter table broker_areas enable row level security;
alter table submissions enable row level security;
alter table votes enable row level security;
alter table reports enable row level security;

drop policy if exists areas_public_read on areas;
create policy areas_public_read on areas for select using (true);

drop policy if exists brokers_public_read on brokers;
create policy brokers_public_read on brokers for select using (not is_hidden and not is_deleted);

drop policy if exists broker_areas_public_read on broker_areas;
create policy broker_areas_public_read on broker_areas for select using (
  exists (select 1 from brokers b where b.id = broker_id and not b.is_hidden and not b.is_deleted)
);
