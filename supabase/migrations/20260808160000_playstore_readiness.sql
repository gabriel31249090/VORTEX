-- ============================================================
-- Preparação pra Play Store:
--   1) data de nascimento (tela de idade neutra no cadastro)
--   2) aceite de Termos/Privacidade registrado no banco
--   3) motivo de denúncia "exploração infantil"
--   4) tabela de push subscriptions
-- ============================================================

-- ---------- 1) Data de nascimento ----------
alter table public.profiles add column if not exists birth_date date;

-- ---------- 2) Aceite de Termos/Privacidade ----------
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text;

-- ---------- 3) Motivo de denúncia: exploração infantil ----------
-- Acha dinamicamente o nome da constraint de check em post_reports.reason
-- (não sabemos o nome exato, já que a tabela foi criada fora do histórico
-- de migrations do repo) e recria incluindo o novo motivo.
do $$
declare
  v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'post_reports'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%reason%';

  if v_conname is not null then
    execute format('alter table public.post_reports drop constraint %I', v_conname);
  end if;
end $$;

alter table public.post_reports
  add constraint post_reports_reason_check
  check (reason in ('spam', 'sexual', 'odio', 'violencia', 'assedio', 'fake_news', 'exploracao_infantil', 'outro'));

-- ---------- 4) Push subscriptions ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "usuarios gerenciam suas proprias subscriptions" on public.push_subscriptions;
create policy "usuarios gerenciam suas proprias subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
