-- supabase/008_vip_frees_shelf.sql — A shrine in the VIP pavilion gives its ordinary shelf back (no shelf: null),
-- and only shrines on shelves count towards a dome filling up. Safe to run again.

alter table pets alter column shrine_position drop not null;
update pets set shrine_position = null where vip_position is not null and shrine_position is not null;

create or replace function floor_counts()
returns table (floor_id int, n bigint) language sql stable as $$
  select floor_id, count(*) from pets where shrine_position is not null group by floor_id
$$;

notify pgrst, 'reload schema';
