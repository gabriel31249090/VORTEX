-- Combined migrations: receipts bucket + reactions table
-- Paste this entire file into Supabase SQL Editor and Run

-- ===== receipts bucket migration =====

-- Cria bucket 'receipts' e políticas para uploads de comprovantes

/*
  Este script cria o bucket `receipts` (público) e define políticas
  para permitir upload somente pelo usuário dono da pasta (<userId>/...).
  Também cria políticas para leitura pública (getPublicUrl funcionará).
*/

-- Cria o bucket receipts se não existir
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Policy: leitura pública (para que getPublicUrl retorne URL acessível)
drop policy if exists "Receipts bucket is publicly readable" on storage.objects;
create policy "Receipts bucket is publicly readable"
  on storage.objects for select
  using (bucket_id = 'receipts');

-- Policy: upload somente para a pasta do próprio usuário
-- (o nome do objeto segue o padrão "<userId>/<timestamp>.<ext>")
drop policy if exists "Users can upload to their own receipts folder" on storage.objects;
create policy "Users can upload to their own receipts folder"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: delete somente o próprio usuário
drop policy if exists "Users can delete their own receipts objects" on storage.objects;
create policy "Users can delete their own receipts objects"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Grants necessários para o role authenticated (opcional, garante acesso a RLS)
grant select on storage.objects to authenticated;
grant insert on storage.objects to authenticated;
grant delete on storage.objects to authenticated;


-- ===== reactions table migration =====

-- Create reactions table to support multi-emoji reactions on posts

create table if not exists public.reactions (
  id serial primary key,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reaction_type text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Use a unique index instead of a constraint so `IF NOT EXISTS` can be used
create unique index if not exists reactions_unique_idx on public.reactions (post_id, user_id, reaction_type);

-- Enable Row Level Security
alter table if exists public.reactions enable row level security;

-- Allow authenticated users to insert their own reactions
drop policy if exists "Authenticated users can insert reactions" on public.reactions;
create policy "Authenticated users can insert reactions" on public.reactions
  for insert
  with check (
    auth.uid() is not null and auth.uid() = user_id
  );

-- Allow users to delete their own reactions
drop policy if exists "Users can delete their reactions" on public.reactions;
create policy "Users can delete their reactions" on public.reactions
  for delete
  using (
    auth.uid() is not null and auth.uid() = user_id
  );

-- Allow admins to manage reactions (select, insert, update, delete)
drop policy if exists "Admins can manage reactions" on public.reactions;
create policy "Admins can manage reactions" on public.reactions
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Allow public/select for reaction counts and displays
drop policy if exists "Public can select reactions" on public.reactions;
create policy "Public can select reactions" on public.reactions
  for select
  using (true);

-- Grants
grant select, insert, delete on public.reactions to authenticated;
grant select on public.reactions to anon;

-- Grant sequence usage to roles
grant usage, select on sequence public.reactions_id_seq to authenticated;
grant usage, select on sequence public.reactions_id_seq to anon;

-- End of combined migrations
