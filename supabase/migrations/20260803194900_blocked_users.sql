-- ============================================================
-- VORTEX — Lote 1: bloqueio de usuários
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  constraint blocked_users_no_self_block check (blocker_id <> blocked_id),
  constraint blocked_users_unique unique (blocker_id, blocked_id),
  constraint blocked_users_blocker_id_fkey foreign key (blocker_id)
    references public.profiles(id) on delete cascade,
  constraint blocked_users_blocked_id_fkey foreign key (blocked_id)
    references public.profiles(id) on delete cascade
);

create index if not exists blocked_users_blocker_idx on public.blocked_users(blocker_id);
create index if not exists blocked_users_blocked_idx on public.blocked_users(blocked_id);

alter table public.blocked_users enable row level security;

-- Cada usuário só enxerga bloqueios onde ele é uma das duas pontas
-- (precisa ver quem o bloqueou também, pra poder esconder conteúdo certo)
drop policy if exists "select_own_blocks" on public.blocked_users;
create policy "select_own_blocks" on public.blocked_users
  for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);

-- Só pode criar bloqueio em nome de si mesmo
drop policy if exists "insert_own_blocks" on public.blocked_users;
create policy "insert_own_blocks" on public.blocked_users
  for insert with check (auth.uid() = blocker_id);

-- Só pode remover um bloqueio que ele mesmo criou
drop policy if exists "delete_own_blocks" on public.blocked_users;
create policy "delete_own_blocks" on public.blocked_users
  for delete using (auth.uid() = blocker_id);

-- RLS sozinha não basta nesse projeto (mesmo padrão que já apareceu em
-- outras tabelas) — sem esses GRANTs o Postgres barra o role antes mesmo
-- de avaliar a policy.
grant select, insert, delete on public.blocked_users to authenticated;
