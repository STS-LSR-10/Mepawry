# Database (Supabase)

SQL files are numbered in the order they were made. Run them in **Supabase → SQL Editor**.

| File | What it adds |
|---|---|
| `000_full_schema.sql` | Everything below in one file. Use it for a **new** project. |
| `001_gifts_and_accounts.sql` | Gifts (one free gift every 3 days), profiles, pet owners |
| `002_guest_flags.sql` | Show/hide the country flag on a pet's plaque |
| `003_board.sql` | Community board: stories, kind-word notes, comments, hearts |
| `004_vip.sql` | VIP Garden niche for a pet (big arched niches on every floor) |
| `007_owned_gifts.sql` | Special gifts are bought once: who owns which |

**Existing database:** run only the numbered files after the last one you ran.
Every file is safe to run more than once.

**Adding a change:** create the next number (`004_short_name.sql`), and add the same SQL to
`000_full_schema.sql` so a new project still gets everything from one file.
