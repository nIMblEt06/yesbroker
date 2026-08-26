create table if not exists cities (
  id serial primary key,
  name text not null,
  slug text not null unique,
  state text,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

insert into cities (name, slug, state, sort_order) values
  ('Bengaluru', 'bangalore', 'Karnataka', 0)
on conflict (slug) do nothing;

alter table areas add column if not exists city_id int references cities(id);
update areas set city_id = (select id from cities where slug = 'bangalore') where city_id is null;
alter table areas alter column city_id set not null;

alter table areas drop constraint if exists areas_slug_key;
create unique index if not exists areas_city_slug_key on areas (city_id, slug);

alter table brokers add column if not exists city_id int references cities(id);
update brokers set city_id = (select id from cities where slug = 'bangalore') where city_id is null;
alter table brokers alter column city_id set not null;

create index if not exists brokers_city_feed_idx on brokers (city_id, is_deleted, is_hidden, last_added_at desc);
create index if not exists areas_city_idx on areas (city_id);

alter table cities enable row level security;

drop policy if exists cities_public_read on cities;
create policy cities_public_read on cities for select using (is_active);
