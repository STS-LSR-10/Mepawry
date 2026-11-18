-- supabase/001_gifts_and_accounts.sql — Run once in Supabase → SQL Editor on a database made before gifts and accounts existed.
-- Safe to run again.

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

-- Tell the API to see the new tables right away
notify pgrst, 'reload schema';
