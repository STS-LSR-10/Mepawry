-- supabase/update-board.sql — The community board: stories (with photos), kind-word notes, comments and hearts.
-- Run once in Supabase → SQL Editor. Safe to run again.

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

notify pgrst, 'reload schema';
