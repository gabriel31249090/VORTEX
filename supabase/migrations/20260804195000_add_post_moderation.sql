-- Adiciona colunas de moderação para posts e registra histórico de moderação

alter table public.posts
  add column if not exists moderation_status text not null default 'approved';

alter table public.posts
  add column if not exists moderation_reason text;

alter table public.posts
  add column if not exists moderation_details jsonb;

create table if not exists public.moderation_logs (
  id serial primary key,
  post_id uuid references public.posts(id) on delete cascade,
  content text not null,
  action text not null,
  reason text,
  labels jsonb,
  details jsonb,
  created_at timestamp with time zone default now()
);
