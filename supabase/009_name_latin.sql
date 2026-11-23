-- supabase/009_name_latin.sql — A pet's name in English (Latin) letters, written by the owner, for visitors who can't
-- read the name's own alphabet (e.g. ข้าวสวย → Khao Suay). Optional. Safe to run again.

alter table pets add column if not exists name_latin text check (name_latin is null or char_length(name_latin) <= 60);

notify pgrst, 'reload schema';
