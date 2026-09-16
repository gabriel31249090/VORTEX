-- Consolidate permissive policies after the VORTEX 1.0 hardening pass.
create or replace function public.is_admin_safe()
returns boolean language sql stable security invoker set search_path=public,auth,pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.is_admin=true
  );
$$;
revoke execute on function public.is_admin_safe() from anon;
grant execute on function public.is_admin_safe() to authenticated;

drop policy if exists "admins podem tudo em ads" on public.ads;
drop policy if exists "usuarios podem ver ads ativos" on public.ads;
create policy "ads visiveis conforme acesso" on public.ads for select to public
using (
  active=true
  or (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.is_admin=true
    )
  )
);
create policy "admins criam ads" on public.ads for insert to authenticated with check (private.is_admin());
create policy "admins atualizam ads" on public.ads for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins removem ads" on public.ads for delete to authenticated using (private.is_admin());

drop policy if exists "admins podem ver pedidos de plano" on public.plan_requests;
drop policy if exists "usuarios podem ver proprios pedidos" on public.plan_requests;
create policy "pedidos de plano visiveis ao dono ou admin" on public.plan_requests
for select to authenticated using (user_id=(select auth.uid()) or private.is_admin());

drop policy if exists "Admins can delete any post" on public.posts;
drop policy if exists "delete_posts" on public.posts;
create policy "delete_posts" on public.posts for delete to authenticated
using (author_id=(select auth.uid()) or private.is_admin());

drop policy if exists "Usuário edita próprio perfil" on public.profiles;
drop policy if exists "admins podem atualizar perfis" on public.profiles;
create policy "perfil atualizavel pelo dono ou admin" on public.profiles
for update to authenticated
using (id=(select auth.uid()) or private.is_admin())
with check (id=(select auth.uid()) or private.is_admin());

drop policy if exists "Admins can manage reactions" on public.reactions;
drop policy if exists "Users can delete their reactions" on public.reactions;
drop policy if exists "Authenticated users can insert reactions" on public.reactions;
create policy "Authenticated users can insert reactions" on public.reactions
for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users or admins can delete reactions" on public.reactions
for delete to authenticated using ((select auth.uid())=user_id or private.is_admin());
create policy "Admins can update reactions" on public.reactions
for update to authenticated using (private.is_admin()) with check (private.is_admin());
