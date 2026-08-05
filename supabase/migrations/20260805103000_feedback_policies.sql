-- Configura permissões de feedback no Supabase.
-- Rode este arquivo no SQL Editor do Supabase ou via CLI.

alter table if exists public.feedback enable row level security;

-- Usuário autenticado pode enviar feedback em nome próprio.
drop policy if exists "Authenticated users can insert feedback" on public.feedback;
create policy "Authenticated users can insert feedback" on public.feedback
  for insert
  with check (auth.uid() = user_id);

-- Apenas administradores podem visualizar feedbacks.
drop policy if exists "Admins can select feedback" on public.feedback;
create policy "Admins can select feedback" on public.feedback
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Apenas administradores podem atualizar o status do feedback.
drop policy if exists "Admins can update feedback" on public.feedback;
create policy "Admins can update feedback" on public.feedback
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Conceder permissões necessárias para o role authenticated.
grant select, insert, update on public.feedback to authenticated;
