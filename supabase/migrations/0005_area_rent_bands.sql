create table if not exists area_rent_bands (
  area_id int primary key references areas(id) on delete cascade,
  tier text not null,
  rent_1bhk_min int,
  rent_1bhk_max int,
  rent_2bhk_min int,
  rent_2bhk_max int,
  rent_3bhk_min int,
  rent_3bhk_max int,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

alter table area_rent_bands enable row level security;

drop policy if exists area_rent_bands_public_read on area_rent_bands;
create policy area_rent_bands_public_read on area_rent_bands for select using (true);

with bands(slug, tier, r1min, r1max, r2min, r2max, r3min, r3max, notes) as (
  values
    ('indiranagar', 'Premium', 20000, 30000, 32000, 55000, 55000, 85000, 'Highest band in the city alongside Koramangala. Limited new supply.'),
    ('koramangala', 'Premium', 20000, 30000, 35000, 50000, 50000, 80000, 'Startup/professional demand keeps this tight year-round.'),
    ('bellandur', 'Premium', 18000, 28000, 35000, 60000, 50000, 75000, 'ORR corridor premium; up roughly 12 percent year on year.'),
    ('hsr-layout', 'Premium', 16000, 26000, 22000, 48000, 40000, 70000, 'Sources disagree most here: one reports 22-35k, another 28-48k for 2BHK.'),
    ('sarjapur', 'Mid to Premium', 15000, 25000, 28000, 50000, 45000, 75000, 'Fastest-rising corridor in 2026 at about +15 percent, driven by metro.'),
    ('whitefield', 'Mid', 13000, 25000, 22000, 55000, 40000, 80000, '2BHK average about 35,000. Best supply of large gated communities. +14 percent YoY.'),
    ('marathahalli', 'Mid', 13000, 22000, 28000, 48000, 40000, 65000, 'Community threads: a decent 3BHK gated flat needs 55-60k, not 42k.'),
    ('domlur', 'Mid to Premium', 18000, 28000, 30000, 50000, 45000, 70000, 'Central location premium without full Indiranagar pricing.'),
    ('old-airport-road', 'Mid to Premium', 18000, 28000, 30000, 50000, 45000, 70000, 'Central location premium without full Indiranagar pricing.'),
    ('kammanahalli', 'Mid', 12000, 20000, 20000, 35000, 32000, 50000, 'Popular with those priced out of Indiranagar.'),
    ('banaswadi', 'Mid', 12000, 20000, 20000, 35000, 32000, 50000, 'Popular with those priced out of Indiranagar.'),
    ('frazer-town', 'Mid', 13000, 22000, 22000, 40000, 35000, 60000, 'Older housing stock, larger floor plates, strong local broker network.'),
    ('cooke-town', 'Mid', 13000, 22000, 22000, 40000, 35000, 60000, 'Older housing stock, larger floor plates, strong local broker network.'),
    ('jayanagar', 'Mid', 12000, 20000, 22000, 38000, 35000, 55000, 'Established South Bangalore; more independent houses than gated towers.'),
    ('j-p-nagar', 'Mid', 12000, 20000, 22000, 38000, 35000, 55000, 'Established South Bangalore; more independent houses than gated towers.'),
    ('hebbal', 'Mid', 12000, 20000, 22000, 40000, 35000, 60000, 'Metro-linked, flagged as a high continued-increase corridor.'),
    ('thanisandra', 'Mid', 12000, 20000, 22000, 40000, 35000, 60000, 'Metro-linked, flagged as a high continued-increase corridor.'),
    ('kalyan-nagar', 'Mid', 12000, 20000, 20000, 35000, 32000, 52000, 'Dense broker presence; good mid-market supply.'),
    ('btm-layout', 'Budget to Mid', 10000, 18000, 18000, 28000, 28000, 42000, 'One of the cheaper central-ish options; heavy sharing market.'),
    ('rajajinagar', 'Budget to Mid', 10000, 18000, 18000, 32000, 28000, 45000, 'West Bangalore; good value against comparable East locations.'),
    ('basaveshwaranagar', 'Budget to Mid', 10000, 18000, 18000, 32000, 28000, 45000, 'West Bangalore; good value against comparable East locations.'),
    ('banashankari', 'Budget to Mid', 10000, 17000, 18000, 30000, 28000, 45000, 'Traditional South Bangalore, largely independent housing.'),
    ('basavanagudi', 'Budget to Mid', 10000, 17000, 18000, 30000, 28000, 45000, 'Traditional South Bangalore, largely independent housing.'),
    ('singasandra', 'Budget', 9000, 16000, 16000, 26000, 26000, 38000, 'Hosur Road corridor; metro has pushed asks up sharply.'),
    ('yelahanka', 'Budget', 9000, 15000, 16000, 28000, 26000, 40000, 'Most stable band for budget renters; only 5-7 percent YoY.'),
    ('electronic-city', 'Budget', 8000, 15000, 14000, 22000, 24000, 35000, 'Lowest band in the city, 40-50 percent under Indiranagar.'),
    ('kr-puram', 'Budget', 8000, 15000, 15000, 25000, 24000, 36000, 'Budget East; longer commute to ORR parks.'),
    ('ramamurthy-nagar', 'Budget', 8000, 15000, 15000, 25000, 24000, 36000, 'Budget East; longer commute to ORR parks.'),
    ('kanakapura-road', 'Budget', 9000, 15000, 16000, 26000, 26000, 38000, 'Stable for budget renters per 2026 trend data.'),
    ('uttarahalli', 'Budget', 9000, 15000, 16000, 26000, 26000, 38000, 'Stable for budget renters per 2026 trend data.'),
    ('chandapura', 'Budget', 7000, 12000, 12000, 20000, 20000, 30000, 'Far south; mostly plots and independent houses, thin flat supply.'),
    ('anekal', 'Budget', 7000, 12000, 12000, 20000, 20000, 30000, 'Far south; mostly plots and independent houses, thin flat supply.')
)
insert into area_rent_bands
  (area_id, tier, rent_1bhk_min, rent_1bhk_max, rent_2bhk_min, rent_2bhk_max, rent_3bhk_min, rent_3bhk_max, notes)
select a.id, b.tier, b.r1min, b.r1max, b.r2min, b.r2max, b.r3min, b.r3max, b.notes
from bands b
join areas a on a.slug = b.slug
on conflict (area_id) do update set
  tier = excluded.tier,
  rent_1bhk_min = excluded.rent_1bhk_min,
  rent_1bhk_max = excluded.rent_1bhk_max,
  rent_2bhk_min = excluded.rent_2bhk_min,
  rent_2bhk_max = excluded.rent_2bhk_max,
  rent_3bhk_min = excluded.rent_3bhk_min,
  rent_3bhk_max = excluded.rent_3bhk_max,
  notes = excluded.notes,
  updated_at = now();
