-- supabase/schema.sql — Mepawry database. Paste into Supabase → SQL Editor → Run. Safe to run again.
-- Row Level Security is on with no policies: browsers (anon key) can read/write nothing directly;
-- only the server (service role key, in lib/data.ts) can. Every write goes through our API routes.

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  species text not null check (species in ('dog', 'cat', 'other')),
  country_code text not null default 'XX',
  primary_photo_url text,
  gallery_urls text[] not null default '{}',
  birth_year int,
  death_year int,
  epitaph text,
  epitaph_translations jsonb not null default '{}',
  floor_id int not null,
  shrine_position int not null,
  candle_count int not null default 0,
  flower_count int not null default 0,
  visit_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, shrine_position) -- two shrines can never share a shelf
);
create index if not exists pets_created_idx on pets (created_at desc);

create table if not exists edit_tokens (
  pet_id uuid primary key references pets on delete cascade,
  token text not null
);

create table if not exists tributes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  visitor_id text,
  visitor_name text not null,
  type text not null check (type in ('candle', 'flower', 'treat_bone', 'treat_icecream', 'treat_ball')),
  created_at timestamptz not null default now()
);
create index if not exists tributes_created_idx on tributes (created_at desc);

create table if not exists guestbook (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  visitor_name text not null,
  message text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists guestbook_pet_idx on guestbook (pet_id, created_at desc);

create table if not exists presence (
  visitor_id text primary key,
  last_seen timestamptz not null default now()
);

alter table pets enable row level security;
alter table edit_tokens enable row level security;
alter table tributes enable row level security;
alter table guestbook enable row level security;
alter table presence enable row level security;

-- ── Counters that must not lose updates when two visitors click at once ──

create or replace function add_tribute(p_pet uuid, p_type text, p_name text)
returns setof pets language plpgsql as $$
begin
  insert into tributes (pet_id, visitor_name, type) values (p_pet, p_name, p_type);
  return query update pets set
    candle_count = candle_count + (p_type = 'candle')::int,
    flower_count = flower_count + (p_type = 'flower')::int
  where id = p_pet returning *;
end $$;

create or replace function record_visit(p_pet uuid)
returns void language sql as $$ update pets set visit_count = visit_count + 1 where id = p_pet $$;

-- Counts visitors seen in the last minute (and forgets older ones)
create or replace function heartbeat(p_id text)
returns int language plpgsql as $$
declare n int;
begin
  if p_id is not null then
    insert into presence (visitor_id, last_seen) values (p_id, now())
    on conflict (visitor_id) do update set last_seen = now();
  end if;
  delete from presence where last_seen < now() - interval '60 seconds';
  select count(*) into n from presence;
  return n;
end $$;

-- ── Numbers for the home, about and report pages ──

create or replace function get_stats()
returns json language sql stable as $$
  select json_build_object(
    'total_pets', (select count(*) from pets),
    'total_dogs', (select count(*) from pets where species = 'dog'),
    'total_cats', (select count(*) from pets where species = 'cat'),
    'total_others', (select count(*) from pets where species = 'other'),
    'total_countries', (select count(distinct country_code) from pets where country_code <> 'XX'),
    'total_candles', (select coalesce(sum(candle_count), 0) from pets),
    'total_flowers', (select coalesce(sum(flower_count), 0) from pets),
    'avg_age', (select round(avg(death_year - birth_year)::numeric, 1) from pets where birth_year is not null and death_year is not null),
    'candles_today', (select count(*) from tributes where type = 'candle' and created_at > now() - interval '24 hours'),
    'countries_today', (select count(distinct p.country_code) from tributes t join pets p on p.id = t.pet_id
                        where t.type = 'candle' and t.created_at > now() - interval '24 hours')
  )
$$;

create or replace function floor_counts()
returns table (floor_id int, n bigint) language sql stable as $$
  select floor_id, count(*) from pets group by floor_id
$$;

create or replace function top_names(p_limit int)
returns table (name text, count bigint) language sql stable as $$
  select name, count(*) from pets group by name order by count(*) desc, name limit p_limit
$$;

-- Only the server (service_role) may touch the tables or call these.
-- Newer Supabase projects don't grant table access automatically, so grant it explicitly.
revoke all on pets, edit_tokens, tributes, guestbook, presence from anon, authenticated;
grant usage on schema public to service_role;
grant all on pets, edit_tokens, tributes, guestbook, presence to service_role;
revoke execute on function add_tribute(uuid, text, text), record_visit(uuid), heartbeat(text),
  get_stats(), floor_counts(), top_names(int) from public, anon, authenticated;
grant execute on function add_tribute(uuid, text, text), record_visit(uuid), heartbeat(text),
  get_stats(), floor_counts(), top_names(int) to service_role;

-- ── Gifts (added later; this block is safe to run on its own too) ──

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  visitor_id text not null,
  visitor_name text not null,
  item text not null,
  created_at timestamptz not null default now()
);
create index if not exists gifts_pet_idx on gifts (pet_id, created_at desc);
create index if not exists gifts_visitor_idx on gifts (visitor_id, pet_id, created_at desc);
alter table gifts enable row level security;
revoke all on gifts from anon, authenticated;
grant all on gifts to service_role;

-- One free gift per visitor per pet every p_cooldown. Locked so a double tap can't slip two in.
-- Returns {ok: true, gift} or {ok: false, next_at}.
create or replace function leave_gift(p_pet uuid, p_item text, p_visitor text, p_name text, p_cooldown interval)
returns json language plpgsql as $$
declare last timestamptz; g gifts;
begin
  perform pg_advisory_xact_lock(hashtext(p_visitor || p_pet::text));
  select max(created_at) into last from gifts where visitor_id = p_visitor and pet_id = p_pet;
  if last is not null and last > now() - p_cooldown then
    return json_build_object('ok', false, 'next_at', last + p_cooldown);
  end if;
  insert into gifts (pet_id, visitor_id, visitor_name, item) values (p_pet, p_visitor, p_name, p_item) returning * into g;
  return json_build_object('ok', true, 'gift', row_to_json(g));
end $$;
revoke execute on function leave_gift(uuid, text, text, text, interval) from public, anon, authenticated;
grant execute on function leave_gift(uuid, text, text, text, interval) to service_role;

-- ── Accounts (added later; safe to run on its own too) ──
-- One profile per signed-in user. country_code is set once, from where they signed up, and never changed.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  gender text not null check (gender in ('male', 'female')),
  country_code text not null default 'XX',
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
revoke all on profiles from anon, authenticated;
grant all on profiles to service_role;

-- Who owns each memorial (lets them edit or delete it from any device)
alter table pets add column if not exists owner_id uuid references auth.users on delete set null;
create index if not exists pets_owner_idx on pets (owner_id);
-- Owners can hide their pet's country flag on the plaque
alter table pets add column if not exists show_flag boolean not null default true;

-- ── Photos: a public bucket (anyone can view a memorial photo; only the server uploads) ──

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 2000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
