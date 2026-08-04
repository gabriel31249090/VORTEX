-- supabase-migration-stories.sql
-- Conserto dos stories: cria a tabela (se faltar), garante a coluna
-- expires_at, configura RLS, cria o bucket de storage e as policies
-- necessárias pro upload funcionar.
--
-- COMO RODAR:
--   1. Abra o painel do Supabase do VORTEX
--   2. SQL Editor (lado esquerdo)
--   3. Cole TUDO daqui e clique em "Run"
--   4. Se já existia tabela/bucket/policy com conflito, o script é
--      idempotente — pode rodar mais de uma vez sem estragar nada.
--
-- Não commita este arquivo como migration automática do app: rode
-- uma vez no SQL Editor e pronto.

-- =====================================================================
-- 1. TABELA stories
-- =====================================================================

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + interval '24 hours')
);

-- Índices pra acelerar a query do StoriesBar (filtra por expires_at e agrupa por user_id)
create index if not exists stories_user_id_idx   on public.stories(user_id);
create index if not exists stories_expires_at_idx on public.stories(expires_at);

-- Se a tabela JÁ existia mas sem a coluna expires_at (criada via dashboard
-- em algum momento), adiciona agora. Sem essa coluna, o StoriesBar filtra
-- .gt('expires_at', ...) e a query inteira quebra com 400.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'stories'
      and column_name  = 'expires_at'
  ) then
    alter table public.stories
      add column expires_at timestamp with time zone not null default (now() + interval '24 hours');

    -- Backfill: se já tem stories "antigas" sem expires_at, dá 24h a partir de agora
    update public.stories
      set expires_at = now() + interval '24 hours'
      where expires_at is null;
  end if;
end $$;

-- =====================================================================
-- 2. RLS DA TABELA stories
-- =====================================================================

alter table public.stories enable row level security;

-- Qualquer pessoa logada pode ver stories não expirados
drop policy if exists "Stories are viewable by everyone" on public.stories;
create policy "Stories are viewable by everyone"
  on public.stories for select
  using (expires_at > now());

-- Usuário só pode criar story em nome próprio
drop policy if exists "Users can insert their own stories" on public.stories;
create policy "Users can insert their own stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

-- Usuário só pode deletar o próprio story
drop policy if exists "Users can delete their own stories" on public.stories;
create policy "Users can delete their own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- 3. STORAGE BUCKET (a parte que mais quebra o upload)
-- =====================================================================

-- Cria o bucket "stories" se não existir. O StoriesBar.tsx faz upload
-- pra supabase.storage.from('stories'), e sem o bucket criado TUDO
-- falha silenciosamente no handleUpload.
insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do nothing;

-- =====================================================================
-- 4. RLS DO STORAGE
-- =====================================================================

-- Leitura pública: o viewer precisa baixar o media_url sem autenticação
drop policy if exists "Stories bucket is publicly readable" on storage.objects;
create policy "Stories bucket is publicly readable"
  on storage.objects for select
  using (bucket_id = 'stories');

-- Upload: usuário só pode subir pra pasta com o PRÓPRIO id de auth
-- (StoriesBar salva como `${currentUserId}/${Date.now()}.${ext}`)
drop policy if exists "Users can upload to their own stories folder" on storage.objects;
create policy "Users can upload to their own stories folder"
  on storage.objects for insert
  with check (
    bucket_id = 'stories'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: só dono da pasta
drop policy if exists "Users can delete their own stories objects" on storage.objects;
create policy "Users can delete their own stories objects"
  on storage.objects for delete
  using (
    bucket_id = 'stories'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- FIM. Depois de rodar, teste no app:
--   1. Abre /feed logado
--   2. Clica no "+" do StoriesBar
--   3. Sobe uma foto
--   4. Ela deve aparecer como seu story, e os stories de outros
--      usuários (se houver) devem aparecer na barra horizontal
-- =====================================================================
