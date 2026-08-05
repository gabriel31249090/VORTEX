-- Cria tabela de feedback para SAC e suporte

create table if not exists public.feedback (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  category text not null,
  subject text,
  message text not null,
  status text not null default 'new',
  created_at timestamp with time zone default now()
);
