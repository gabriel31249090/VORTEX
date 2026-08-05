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
