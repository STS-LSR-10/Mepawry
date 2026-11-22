-- supabase/007_owned_gifts.sql — Special gifts are bought once and kept: who owns which, so they can give it again
-- at any shrine for free. Safe to run again.

create table if not exists gift_owners (
  user_id uuid not null references auth.users on delete cascade,
  item text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table gift_owners enable row level security;
revoke all on gift_owners from anon, authenticated;
grant all on gift_owners to service_role;

notify pgrst, 'reload schema';
