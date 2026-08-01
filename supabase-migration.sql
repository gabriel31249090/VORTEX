-- Corrige a FK de post_reports.reporter_id pra apontar pra profiles
-- (mesmo ajuste que já fizemos em stories.user_id), pra dar pra fazer
-- o embed de username via PostgREST no painel de admin.
alter table public.post_reports drop constraint if exists post_reports_reporter_id_fkey;

alter table public.post_reports
  add constraint post_reports_reporter_id_fkey
  foreign key (reporter_id) references public.profiles(id) on delete cascade;
