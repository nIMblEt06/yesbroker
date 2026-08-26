insert into areas (name, slug, aliases, kind, source, sort_order) values
  ('Binnypete', 'binnypete', '{"Binnypete","Binny Pete","BinnyPete"}', 'area', 'curated', 50)
on conflict (slug) do nothing;
