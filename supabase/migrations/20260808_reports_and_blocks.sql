-- ============================================================
-- Denúncias e bloqueios — VORTEX
-- Segue o mesmo padrão usado no resto do projeto:
-- RLS habilitada + GRANTs explícitos + função SECURITY DEFINER
-- pra qualquer checagem que precise "furar" a RLS com segurança.
-- ============================================================

-- ---------- Tabela de denúncias ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user', 'message')),
  target_id uuid not null,
  reason text not null check (reason in (
    'spam',
    'assedio',
    'discurso_de_odio',
    'nudez_conteudo_sexual',
    'exploracao_infantil',
    'violencia',
    'outro'
  )),
  details text,
  status text not null default 'pendente' check (status in (
    'pendente', 'em_analise', 'resolvida', 'arquivada'
  )),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "usuarios podem criar denuncias"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "usuarios veem apenas suas proprias denuncias"
  on public.reports for select
  using (auth.uid() = reporter_id);

grant select, insert on public.reports to authenticated;

-- ---------- Tabela de bloqueios ----------
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint nao_pode_bloquear_a_si_mesmo check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "usuarios gerenciam seus proprios bloqueios"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

grant select, insert, delete on public.blocks to authenticated;

-- ---------- Funções auxiliares (SECURITY DEFINER) ----------

-- Retorna true se existe bloqueio entre os dois usuários, em qualquer direção.
-- Útil pra travar DM e visualização de perfil sem expor a tabela `blocks` inteira.
create or replace function public.existe_bloqueio(usuario_a uuid, usuario_b uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = usuario_a and blocked_id = usuario_b)
       or (blocker_id = usuario_b and blocked_id = usuario_a)
  );
$$;

grant execute on function public.existe_bloqueio(uuid, uuid) to authenticated;

-- Retorna os ids de todo mundo que está bloqueado em relação ao usuário logado
-- (tanto quem ele bloqueou quanto quem o bloqueou). Use isso pra filtrar feed,
-- busca e listas de conversas.
create or replace function public.ids_bloqueados_para_mim()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid();
$$;

grant execute on function public.ids_bloqueados_para_mim() to authenticated;
