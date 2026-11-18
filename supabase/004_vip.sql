-- supabase/004_vip.sql — VIP Garden niches. Run once in Supabase → SQL Editor. Safe to run again.
-- A pet in the VIP Garden has a niche number on its own floor (0–23). Each niche holds one pet.
alter table pets add column if not exists vip_position int;
create unique index if not exists pets_vip_slot on pets (floor_id, vip_position) where vip_position is not null;
notify pgrst, 'reload schema';
