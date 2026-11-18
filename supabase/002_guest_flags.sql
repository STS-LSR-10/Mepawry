-- supabase/002_guest_flags.sql — Run once in Supabase → SQL Editor. Safe to run again.
-- Owners can hide their pet's country flag on the plaque.
alter table pets add column if not exists show_flag boolean not null default true;
notify pgrst, 'reload schema';
