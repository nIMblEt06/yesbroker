insert into areas (name, slug, aliases, kind, source, sort_order) values
  ('Kaggadasapura', 'kaggadasapura', '{"Kaggadasapura","Kaggadasapura Main Road"}', 'area', 'curated', 51),
  ('Hoodi', 'hoodi', '{"Hoodi","Hoodi Village"}', 'area', 'curated', 52),
  ('Kammanahalli', 'kammanahalli', '{"Kammanahalli","Kammanahalli Main Road"}', 'area', 'curated', 53),
  ('Banaswadi', 'banaswadi', '{"Banaswadi","Chikka Banaswadi","Dodda Banaswadi"}', 'area', 'curated', 54),
  ('Singasandra', 'singasandra', '{"Singasandra","Kudlu Gate","Kudlu"}', 'area', 'curated', 55),
  ('Kundalahalli', 'kundalahalli', '{"Kundalahalli","Kundalahalli Gate"}', 'area', 'curated', 56),
  ('Murugeshpalya', 'murugeshpalya', '{"Murugeshpalya","Murgeshpalya","Jeevan Bima Nagar","Jeevanbhima Nagar"}', 'area', 'curated', 57),
  ('Kodihalli', 'kodihalli', '{"Kodihalli"}', 'area', 'curated', 58),
  ('Kadubeesanahalli', 'kadubeesanahalli', '{"Kadubeesanahalli"}', 'area', 'curated', 59),
  ('Ramamurthy Nagar', 'ramamurthy-nagar', '{"Ramamurthy Nagar","Ramamurthynagar","RM Nagar"}', 'area', 'curated', 60),
  ('Horamavu', 'horamavu', '{"Horamavu","Horumavu"}', 'area', 'curated', 61),
  ('Basavanagudi', 'basavanagudi', '{"Basavanagudi","Basavangudi"}', 'area', 'curated', 62),
  ('Bommanahalli', 'bommanahalli', '{"Bommanahalli"}', 'area', 'curated', 63),
  ('Begur', 'begur', '{"Begur","Begur Road"}', 'area', 'curated', 64),
  ('Basaveshwaranagar', 'basaveshwaranagar', '{"Basaveshwaranagar","Basaveshwara Nagar","Basaveswaranagar"}', 'area', 'curated', 65),
  ('Nagarbhavi', 'nagarbhavi', '{"Nagarbhavi"}', 'area', 'curated', 66),
  ('Chandra Layout', 'chandra-layout', '{"Chandra Layout","Chandralayout"}', 'area', 'curated', 67),
  ('RR Nagar', 'rr-nagar', '{"RR Nagar","Rajarajeshwari Nagar","Raja Rajeshwari Nagar"}', 'area', 'curated', 68),
  ('Kengeri', 'kengeri', '{"Kengeri","Kengeri Satellite Town"}', 'area', 'curated', 69),
  ('Vijayanagar', 'vijayanagar', '{"Vijayanagar","Vijay Nagar"}', 'area', 'curated', 70),
  ('RT Nagar', 'rt-nagar', '{"RT Nagar","R T Nagar","Jayamahal","Jayamahal Road"}', 'area', 'curated', 71),
  ('Sahakar Nagar', 'sahakar-nagar', '{"Sahakar Nagar","Sahakara Nagar","Sahakarnagar"}', 'area', 'curated', 72),
  ('Kodigehalli', 'kodigehalli', '{"Kodigehalli"}', 'area', 'curated', 73),
  ('Jakkur', 'jakkur', '{"Jakkur","Jakkur Aerodrome"}', 'area', 'curated', 74),
  ('Chandapura', 'chandapura', '{"Chandapura","Chandapura Anekal Road"}', 'area', 'curated', 75),
  ('Anekal', 'anekal', '{"Anekal"}', 'area', 'curated', 76)
on conflict (slug) do nothing;

update areas set aliases = array(select distinct unnest(aliases || '{Old Airport Rd}')) where slug = 'old-airport-road';
update areas set aliases = array(select distinct unnest(aliases || '{HRBR Layout,HRBR,HRBR Extension}')) where slug = 'kalyan-nagar';
update areas set aliases = array(select distinct unnest(aliases || '{RMV,RMV Extension}')) where slug = 'sadashivanagar';
update areas set aliases = array(select distinct unnest(aliases || '{Kanakapura Rd}')) where slug = 'kanakapura-road';
