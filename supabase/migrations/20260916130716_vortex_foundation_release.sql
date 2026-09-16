-- VORTEX 1.0 foundation: security, feed/search performance and private receipts.
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select p.is_admin from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.is_conversation_participant(conv_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conv_id and cp.user_id = (select auth.uid())
    );
$$;
revoke all on function private.is_conversation_participant(uuid) from public, anon;
grant execute on function private.is_conversation_participant(uuid) to authenticated;

drop policy if exists "participantes veem membros" on public.conversation_participants;
create policy "participantes veem membros" on public.conversation_participants
for select to authenticated using (private.is_conversation_participant(conversation_id));

drop policy if exists "usuarios podem se adicionar ou serem adicionados" on public.conversation_participants;
create policy "usuarios podem se adicionar ou serem adicionados" on public.conversation_participants
for insert to authenticated with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = (select auth.uid())
  )
);

drop policy if exists "participante pode atualizar seu last_read_at" on public.conversation_participants;
create policy "participante pode atualizar seu last_read_at" on public.conversation_participants
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "participantes veem conversa" on public.conversations;
create policy "participantes veem conversa" on public.conversations
for select to authenticated
using (private.is_conversation_participant(id) or created_by = (select auth.uid()));

drop policy if exists "usuarios autenticados criam conversa" on public.conversations;
create policy "usuarios autenticados criam conversa" on public.conversations
for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists "participantes veem mensagens" on public.messages;
create policy "participantes veem mensagens" on public.messages
for select to authenticated using (private.is_conversation_participant(conversation_id));

drop policy if exists "participantes enviam mensagens" on public.messages;
create policy "participantes enviam mensagens" on public.messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and private.is_conversation_participant(conversation_id)
);

drop function if exists public.is_conversation_participant(uuid, uuid);

create or replace function private.navigation_unread_counts()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  return jsonb_build_object(
    'notifications', (
      select count(*) from public.notifications n
      where n.user_id=uid and coalesce(n.read,false)=false
    ),
    'messages', (
      select count(*) from public.conversation_participants cp
      where cp.user_id=uid and exists (
        select 1 from public.messages m
        where m.conversation_id=cp.conversation_id
          and m.sender_id<>uid
          and m.created_at>coalesce(cp.last_read_at,to_timestamp(0))
      )
    )
  );
end;
$$;
revoke all on function private.navigation_unread_counts() from public, anon;
grant execute on function private.navigation_unread_counts() to authenticated;

create or replace function public.navigation_unread_counts()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.navigation_unread_counts(); $$;
revoke all on function public.navigation_unread_counts() from public, anon;
grant execute on function public.navigation_unread_counts() to authenticated;

drop policy if exists "insert_posts" on public.posts;
create policy "insert_posts" on public.posts for insert to authenticated
with check (author_id = (select auth.uid()));

drop policy if exists "update_posts" on public.posts;
create policy "update_posts" on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists "usuarios podem inserir proprios pedidos" on public.plan_requests;
create policy "usuarios podem inserir proprios pedidos" on public.plan_requests
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "usuarios podem ver proprios pedidos" on public.plan_requests;
create policy "usuarios podem ver proprios pedidos" on public.plan_requests
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "admins podem ver pedidos de plano" on public.plan_requests;
create policy "admins podem ver pedidos de plano" on public.plan_requests
for select to authenticated using (private.is_admin());

drop policy if exists "admins podem atualizar pedidos de plano" on public.plan_requests;
create policy "admins podem atualizar pedidos de plano" on public.plan_requests
for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admins podem atualizar perfis" on public.profiles;
create policy "admins podem atualizar perfis" on public.profiles
for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admins podem ver logs de moderacao" on public.moderation_logs;
create policy "admins podem ver logs de moderacao" on public.moderation_logs
for select to authenticated using (private.is_admin());

drop policy if exists "Ver próprias notificações" on public.notifications;
drop policy if exists "Marcar como lida" on public.notifications;
drop policy if exists "Sistema insere notificações" on public.notifications;
drop policy if exists "Users can insert their own stories" on public.stories;
drop policy if exists "Stories viewable while not expired" on public.stories;

do $$
declare r record; q text; c text;
begin
  for r in
    select schemaname,tablename,policyname,qual,with_check
    from pg_policies
    where schemaname='public'
      and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
  loop
    q := case when r.qual is null then null else replace(r.qual,'auth.uid()','(select auth.uid())') end;
    c := case when r.with_check is null then null else replace(r.with_check,'auth.uid()','(select auth.uid())') end;
    if q is not null and c is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)',r.policyname,r.schemaname,r.tablename,q,c);
    elsif q is not null then
      execute format('alter policy %I on %I.%I using (%s)',r.policyname,r.schemaname,r.tablename,q);
    elsif c is not null then
      execute format('alter policy %I on %I.%I with check (%s)',r.policyname,r.schemaname,r.tablename,c);
    end if;
  end loop;
end $$;

alter table public.plan_requests add column if not exists receipt_path text;
update public.plan_requests
set receipt_path = case
  when receipt_path is not null then receipt_path
  when receipt_url like '%/storage/v1/object/public/receipts/%'
    then split_part(receipt_url,'/storage/v1/object/public/receipts/',2)
  when receipt_url like '%/storage/v1/object/sign/receipts/%'
    then split_part(split_part(receipt_url,'/storage/v1/object/sign/receipts/',2),'?',1)
  else receipt_url
end
where receipt_path is null;
alter table public.plan_requests alter column receipt_url drop not null;

drop policy if exists "Receipts bucket is publicly readable" on storage.objects;
drop policy if exists "Admins can read receipts" on storage.objects;
create policy "Admins can read receipts" on storage.objects for select to authenticated
using (bucket_id='receipts' and private.is_admin());

update storage.buckets
set public=false,
    file_size_limit=10485760,
    allowed_mime_types=array['image/png','image/jpeg','image/webp','application/pdf']::text[]
where id='receipts';

create index if not exists idx_posts_approved_created on public.posts(created_at desc) where moderation_status='approved';
create index if not exists idx_reposts_created on public.reposts(created_at desc);
create index if not exists idx_blocked_users_blocker_blocked on public.blocked_users(blocker_id,blocked_id);
create index if not exists idx_blocked_users_blocked_blocker on public.blocked_users(blocked_id,blocker_id);
create index if not exists idx_posts_search_trgm on public.posts using gin ((coalesce(title,'')||' '||coalesce(content,'')) extensions.gin_trgm_ops);
create index if not exists idx_profiles_search_trgm on public.profiles using gin ((coalesce(username,'')||' '||coalesce(display_name,'')||' '||coalesce(bio,'')) extensions.gin_trgm_ops);
create index if not exists idx_communities_search_trgm on public.communities using gin ((coalesce(name,'')||' '||coalesce(description,'')) extensions.gin_trgm_ops);

create or replace function public.feed_page(
  feed_mode text default 'geral',
  cursor_at timestamptz default null,
  limit_count integer default 15
)
returns jsonb language sql stable security invoker
set search_path=public,extensions,pg_temp
as $$
with activity as (
  select p.id post_id,p.author_id,p.created_at activity_at,false is_repost,null::uuid reposter_id,null::text reposter_username
  from public.posts p where p.moderation_status='approved'
  union all
  select r.post_id,p.author_id,r.created_at,true,r.user_id,rp.username
  from public.reposts r
  join public.posts p on p.id=r.post_id
  join public.profiles rp on rp.id=r.user_id
  where p.moderation_status='approved'
),
selected as (
  select a.activity_at,p.id post_id,p.author_id,p.title,p.content,p.type post_type,p.media_url,
    coalesce(p.likes_count,0) likes_count,coalesce(p.comments_count,0) comments_count,
    coalesce(p.reposts_count,0) reposts_count,p.created_at,
    pr.username profile_username,pr.avatar_url profile_avatar_url,pr.plan profile_plan,
    pr.accent_color profile_accent_color,c.name community_name,c.slug community_slug,
    a.is_repost,a.reposter_id,a.reposter_username,
    (select l.vote_type from public.likes l where l.post_id=p.id and l.user_id=(select auth.uid()) limit 1) viewer_vote,
    exists(select 1 from public.reposts mr where mr.post_id=p.id and mr.user_id=(select auth.uid())) viewer_reposted
  from activity a
  join public.posts p on p.id=a.post_id
  left join public.profiles pr on pr.id=p.author_id
  left join public.communities c on c.id=p.community_id
  where (select auth.uid()) is not null
    and (cursor_at is null or a.activity_at<cursor_at)
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id=(select auth.uid()) and (b.blocked_id=a.author_id or b.blocked_id=a.reposter_id))
         or (b.blocked_id=(select auth.uid()) and (b.blocker_id=a.author_id or b.blocker_id=a.reposter_id))
    )
    and (
      feed_mode<>'seguindo'
      or exists (
        select 1 from public.follows f
        where f.follower_id=(select auth.uid())
          and (f.following_id=a.author_id or f.following_id=a.reposter_id)
      )
    )
  order by a.activity_at desc,p.id desc
  limit greatest(1,least(limit_count,50))
)
select coalesce(jsonb_agg(jsonb_build_object(
  'activity_at',s.activity_at,'post_id',s.post_id,'author_id',s.author_id,'title',s.title,
  'content',s.content,'type',s.post_type,'media_url',s.media_url,'likes_count',s.likes_count,
  'comments_count',s.comments_count,'reposts_count',s.reposts_count,'created_at',s.created_at,
  'profile_username',s.profile_username,'profile_avatar_url',s.profile_avatar_url,
  'profile_plan',s.profile_plan,'profile_accent_color',s.profile_accent_color,
  'community_name',s.community_name,'community_slug',s.community_slug,'is_repost',s.is_repost,
  'reposter_id',s.reposter_id,'reposter_username',s.reposter_username,'viewer_vote',s.viewer_vote,
  'viewer_reposted',s.viewer_reposted
) order by s.activity_at desc,s.post_id desc),'[]'::jsonb)
from selected s;
$$;
revoke all on function public.feed_page(text,timestamptz,integer) from public,anon;
grant execute on function public.feed_page(text,timestamptz,integer) to authenticated;

create or replace function public.search_vortex(term text,limit_count integer default 20)
returns jsonb language sql stable security invoker
set search_path=public,extensions,pg_temp
as $$
with q as (select lower(trim(coalesce(term,''))) value)
select jsonb_build_object(
  'posts',coalesce((select jsonb_agg(to_jsonb(x)) from (
    select p.id,p.title,p.content,coalesce(p.likes_count,0) likes_count,
      coalesce(p.comments_count,0) comments_count,p.created_at,
      jsonb_build_object('username',pr.username,'display_name',pr.display_name,'avatar_url',pr.avatar_url) author
    from public.posts p left join public.profiles pr on pr.id=p.author_id cross join q
    where length(q.value)>0 and p.moderation_status='approved'
      and (lower(coalesce(p.title,'')||' '||coalesce(p.content,'')) like '%'||q.value||'%'
        or extensions.similarity(lower(coalesce(p.title,'')),q.value)>=0.22)
    order by greatest(
      extensions.similarity(lower(coalesce(p.title,'')),q.value),
      extensions.similarity(lower(coalesce(p.content,'')),q.value)
    ) desc,coalesce(p.likes_count,0) desc,p.created_at desc
    limit greatest(1,least(limit_count,40))
  ) x),'[]'::jsonb),
  'users',coalesce((select jsonb_agg(to_jsonb(x)) from (
    select pr.id,pr.username,pr.display_name,pr.bio,pr.avatar_url
    from public.profiles pr cross join q
    where length(q.value)>0
      and (lower(coalesce(pr.username,'')||' '||coalesce(pr.display_name,'')||' '||coalesce(pr.bio,'')) like '%'||q.value||'%'
        or extensions.similarity(lower(coalesce(pr.username,'')),q.value)>=0.22)
    order by greatest(
      extensions.similarity(lower(coalesce(pr.username,'')),q.value),
      extensions.similarity(lower(coalesce(pr.display_name,'')),q.value)
    ) desc,pr.followers_count desc nulls last
    limit greatest(1,least(limit_count,30))
  ) x),'[]'::jsonb),
  'communities',coalesce((select jsonb_agg(to_jsonb(x)) from (
    select c.id,c.slug,c.name,c.description,
      (select count(*)::integer from public.community_members cm where cm.community_id=c.id) members_count,
      c.icon_url icon
    from public.communities c cross join q
    where length(q.value)>0
      and (lower(coalesce(c.name,'')||' '||coalesce(c.description,'')) like '%'||q.value||'%'
        or extensions.similarity(lower(coalesce(c.name,'')),q.value)>=0.22)
    order by greatest(
      extensions.similarity(lower(coalesce(c.name,'')),q.value),
      extensions.similarity(lower(coalesce(c.description,'')),q.value)
    ) desc,c.created_at desc
    limit greatest(1,least(limit_count,20))
  ) x),'[]'::jsonb)
);
$$;
revoke all on function public.search_vortex(text,integer) from public,anon;
grant execute on function public.search_vortex(text,integer) to authenticated;
