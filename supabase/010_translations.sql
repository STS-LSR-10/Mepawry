-- supabase/010_translations.sql — Translations of text people wrote (epitaphs, guestbook notes, board posts), made
-- once per text and language and kept: the next reader in that language gets it at once, at no cost. The key is a
-- hash of the exact text, so an edited epitaph is simply translated again. Safe to run again.

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

notify pgrst, 'reload schema';
