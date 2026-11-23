-- supabase/000_full_schema.sql — The whole Mepawry database, for a NEW Supabase project. Paste into SQL Editor → Run.
-- Safe to run again. Already have a database? Run only the numbered files after the last one you ran (001, 002, …).
-- Row Level Security is on with no policies: browsers (anon key) can read/write nothing directly;
-- only the server (service role key, in lib/data.ts) can. Every write goes through our API routes.

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_latin text check (name_latin is null or char_length(name_latin) <= 60), -- the name in English letters (optional)
  species text not null check (species in ('dog', 'cat', 'other')),
  country_code text not null default 'XX',
  primary_photo_url text,
  gallery_urls text[] not null default '{}',
  birth_year int,
  death_year int,
  epitaph text,
  epitaph_translations jsonb not null default '{}',
  floor_id int not null,
  shrine_position int, -- null: in the VIP pavilion (vip_position) instead of on a shelf
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
  select floor_id, count(*) from pets where shrine_position is not null group by floor_id
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

-- ── Community board (also in 003_board.sql) ──
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users on delete cascade,
  author_name text not null,
  author_country text not null default 'XX',
  pet_id uuid references pets on delete set null,
  kind text not null check (kind in ('story', 'note')),
  body text not null,
  photo_url text,
  note_color text,
  like_count int not null default 0,
  comment_count int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists posts_kind_created_idx on posts (kind, created_at desc);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  author_name text not null,
  author_country text not null default 'XX',
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on post_comments (post_id, created_at);

create table if not exists post_likes (
  post_id uuid not null references posts on delete cascade,
  liker text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, liker)
);

alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_likes enable row level security;
revoke all on posts, post_comments, post_likes from anon, authenticated;
grant all on posts, post_comments, post_likes to service_role;

-- Heart / un-heart, counted atomically. Returns the new count and whether it's now liked.
create or replace function toggle_like(p_post uuid, p_liker text)
returns json language plpgsql as $$
declare gone int; n int;
begin
  delete from post_likes where post_id = p_post and liker = p_liker;
  get diagnostics gone = row_count;
  if gone = 0 then insert into post_likes (post_id, liker) values (p_post, p_liker); end if;
  update posts set like_count = like_count + (case when gone = 0 then 1 else -1 end) where id = p_post returning like_count into n;
  return json_build_object('liked', gone = 0, 'count', n);
end $$;

-- Add or remove a comment and keep the post's count right
create or replace function add_comment(p_post uuid, p_author uuid, p_name text, p_country text, p_body text)
returns post_comments language plpgsql as $$
declare c post_comments;
begin
  insert into post_comments (post_id, author_id, author_name, author_country, body) values (p_post, p_author, p_name, p_country, p_body) returning * into c;
  update posts set comment_count = comment_count + 1 where id = p_post;
  return c;
end $$;

create or replace function delete_comment(p_comment uuid, p_author uuid)
returns boolean language plpgsql as $$
declare pid uuid;
begin
  delete from post_comments where id = p_comment and author_id = p_author returning post_id into pid;
  if pid is null then return false; end if;
  update posts set comment_count = greatest(0, comment_count - 1) where id = pid;
  return true;
end $$;

-- Pets whose shrine anniversary is today (placed on this day in an earlier year)
create or replace function anniversary_pets()
returns setof pets language sql stable as $$
  select * from pets
  where extract(month from created_at) = extract(month from now())
    and extract(day from created_at) = extract(day from now())
    and created_at < date_trunc('day', now())
  order by created_at limit 40
$$;

revoke execute on function toggle_like(uuid, text), add_comment(uuid, uuid, text, text, text), delete_comment(uuid, uuid), anniversary_pets() from public, anon, authenticated;
grant execute on function toggle_like(uuid, text), add_comment(uuid, uuid, text, text, text), delete_comment(uuid, uuid), anniversary_pets() to service_role;

-- ── VIP Garden (also in 004_vip.sql) ──
alter table pets add column if not exists vip_position int;
create unique index if not exists pets_vip_slot on pets (floor_id, vip_position) where vip_position is not null;

-- ── Photos: a public bucket (anyone can view a memorial photo; only the server uploads) ──

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 2000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ── Special gifts each signed-in user owns (007_owned_gifts.sql) ──
create table if not exists gift_owners (
  user_id uuid not null references auth.users on delete cascade,
  item text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table gift_owners enable row level security;
revoke all on gift_owners from anon, authenticated;
grant all on gift_owners to service_role;

-- ── Translations of what people wrote, kept for the next reader (010_translations.sql) ──
create table if not exists translations (
  source_hash text not null,
  lang text not null,
  text text not null,
  provider text not null, -- which translator made it ('workers-ai', 'gemini')
  created_at timestamptz not null default now(),
  primary key (source_hash, lang)
);
alter table translations enable row level security;
revoke all on translations from anon, authenticated;
grant all on translations to service_role;

-- ── Admin page counts: visitors per day and AI usage (011_admin_stats.sql) ──
create table if not exists daily_visits (
  day date not null,
  visitor_id text not null,
  country text not null default 'XX',
  primary key (day, visitor_id)
);
create index if not exists daily_visits_day_idx on daily_visits (day);

create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  provider text not null,          -- 'workers-ai' or 'gemini'
  model text not null,
  input_tokens int not null,
  output_tokens int not null,
  estimated boolean not null default false -- true: counted from the text length (the model didn't report it)
);
create index if not exists ai_usage_created_idx on ai_usage (created_at);

alter table daily_visits enable row level security;
alter table ai_usage enable row level security;
revoke all on daily_visits, ai_usage from anon, authenticated;
grant all on daily_visits, ai_usage to service_role;

-- Visitors between two days (inclusive): how many different people, per country, and per day
create or replace function visitor_stats(p_from date, p_to date)
returns json language sql stable as $$
  select json_build_object(
    'visitors', (select count(distinct visitor_id) from daily_visits where day between p_from and p_to),
    'countries', coalesce((select json_agg(c order by c.n desc) from (
      select country, count(distinct visitor_id) as n from daily_visits where day between p_from and p_to group by country) c), '[]'::json),
    'days', coalesce((select json_agg(d order by d.day) from (
      select day, count(*) as n from daily_visits where day between p_from and p_to group by day) d), '[]'::json)
  )
$$;
revoke execute on function visitor_stats(date, date) from public, anon, authenticated;
grant execute on function visitor_stats(date, date) to service_role;

