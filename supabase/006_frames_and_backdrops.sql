-- 006_frames_and_backdrops.sql — A shrine's portrait frame style and cabinet backdrop (ids from lib/decor.ts).
-- null = the defaults (classic gold frame, midnight sky). Safe to run more than once.

alter table pets add column if not exists frame_style text;
alter table pets add column if not exists backdrop text;

notify pgrst, 'reload schema';
