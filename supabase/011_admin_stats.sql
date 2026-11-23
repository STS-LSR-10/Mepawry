-- supabase/011_admin_stats.sql — What the admin page (/admin) counts: one row per visitor per day (Bangkok time) with
-- their country, and every call to an AI model with its tokens. Safe to run again.

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

notify pgrst, 'reload schema';
