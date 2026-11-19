-- 005_candle_once_a_day.sql — Each visitor can light one candle per pet per day (resets at their local midnight).
-- Safe to run more than once.

create index if not exists tributes_candle_idx on tributes (pet_id, visitor_id, created_at desc) where type = 'candle';

-- Lights a candle unless this visitor already lit one for this pet since their local midnight.
-- Returns {ok, candle_count, flower_count, candles_today, next_at}. candles_today = candles for this pet in the last 24 hours.
create or replace function light_candle(p_pet uuid, p_visitor text, p_name text, p_tz text)
returns json language plpgsql as $$
declare midnight timestamptz; lit boolean; p pets; today int;
begin
  begin
    midnight := date_trunc('day', now() at time zone p_tz) at time zone p_tz;
  exception when others then
    p_tz := 'UTC';
    midnight := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  end;
  perform pg_advisory_xact_lock(hashtext('candle' || p_visitor || p_pet::text));
  select exists (select 1 from tributes where pet_id = p_pet and visitor_id = p_visitor and type = 'candle' and created_at >= midnight) into lit;
  if not lit then
    insert into tributes (pet_id, visitor_id, visitor_name, type) values (p_pet, p_visitor, p_name, 'candle');
    update pets set candle_count = candle_count + 1 where id = p_pet;
  end if;
  select * into p from pets where id = p_pet;
  select count(*) into today from tributes where pet_id = p_pet and type = 'candle' and created_at > now() - interval '24 hours';
  return json_build_object('ok', not lit, 'candle_count', p.candle_count, 'flower_count', p.flower_count,
    'candles_today', today, 'next_at', midnight + interval '1 day');
end $$;
revoke execute on function light_candle(uuid, text, text, text) from public, anon, authenticated;
grant execute on function light_candle(uuid, text, text, text) to service_role;

notify pgrst, 'reload schema';
