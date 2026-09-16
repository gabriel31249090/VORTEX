-- Keep social counters server-owned and narrow client-created notifications.
create or replace function public.recalc_comments_count()
returns trigger language plpgsql security definer set search_path=''
as $$
declare target_post uuid := coalesce(new.post_id,old.post_id);
begin
  update public.posts p
  set comments_count=(
    select count(*)::integer from public.comments c where c.post_id=target_post
  )
  where p.id=target_post;
  return coalesce(new,old);
end;
$$;
revoke execute on function public.recalc_comments_count() from public,anon,authenticated;

drop trigger if exists comments_count_sync on public.comments;
create trigger comments_count_sync after insert or delete on public.comments
for each row execute function public.recalc_comments_count();

create or replace function public.recalc_reposts_count()
returns trigger language plpgsql security definer set search_path=''
as $$
declare target_post uuid := coalesce(new.post_id,old.post_id);
begin
  update public.posts p
  set reposts_count=(
    select count(*)::integer from public.reposts r where r.post_id=target_post
  )
  where p.id=target_post;
  return coalesce(new,old);
end;
$$;
revoke execute on function public.recalc_reposts_count() from public,anon,authenticated;

drop trigger if exists reposts_count_sync on public.reposts;
create trigger reposts_count_sync after insert or delete on public.reposts
for each row execute function public.recalc_reposts_count();

update public.posts p
set comments_count=(select count(*)::integer from public.comments c where c.post_id=p.id),
    reposts_count=(select count(*)::integer from public.reposts r where r.post_id=p.id);

drop policy if exists "Criar notificação" on public.notifications;
create policy "notificacoes criadas com contexto valido" on public.notifications
for insert to authenticated
with check (
  actor_id=(select auth.uid())
  and user_id is not null
  and user_id<>(select auth.uid())
  and (
    (
      type='message' and conversation_id is not null
      and private.is_conversation_participant(conversation_id)
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id=conversation_id and cp.user_id=user_id
      )
    )
    or (type='mention' and post_id is not null)
    or (
      type='plan_approved' and private.is_admin()
      and plan in ('free','boost','mega')
    )
  )
);

drop policy if exists "update_comments" on public.comments;
create policy "update_comments" on public.comments for update to authenticated
using ((select auth.uid())=author_id)
with check ((select auth.uid())=author_id);
