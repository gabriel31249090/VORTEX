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

-- Observação: rode este arquivo no SQL Editor do Supabase ou via CLI para
-- que o bucket e as policies sejam aplicados no projeto do Supabase.
