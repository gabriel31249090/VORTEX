-- VORTEX quality hardening: safer privileged helpers + navigation performance.
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.is_conversation_participant(uuid, uuid) set search_path = public, pg_temp;
alter function public.messages_broadcast_trigger() set search_path = public, pg_temp;
alter function public.notify_on_comment() set search_path = public, pg_temp;
alter function public.notify_on_follow() set search_path = public, pg_temp;
alter function public.notify_on_like() set search_path = public, pg_temp;
alter function public.recalc_likes_count() set search_path = public, pg_temp;
alter function public.update_follow_counts() set search_path = public, pg_temp;

create or replace function public.is_conversation_participant(conv_id uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and uid = auth.uid()
    and exists (select 1 from public.conversation_participants cp
      where cp.conversation_id = conv_id and cp.user_id = auth.uid());
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.messages_broadcast_trigger() from public, anon, authenticated;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
revoke execute on function public.notify_on_follow() from public, anon, authenticated;
revoke execute on function public.notify_on_like() from public, anon, authenticated;
revoke execute on function public.recalc_likes_count() from public, anon, authenticated;
revoke execute on function public.update_follow_counts() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function public.navigation_unread_counts()
returns jsonb language plpgsql stable security definer
set search_path = public, auth, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  return jsonb_build_object(
    'notifications',(select count(*) from public.notifications n where n.user_id=uid and coalesce(n.read,false)=false),
    'messages',(select count(*) from public.conversation_participants cp
      where cp.user_id=uid and exists (
        select 1 from public.messages m where m.conversation_id=cp.conversation_id
          and m.sender_id<>uid and m.created_at>coalesce(cp.last_read_at,to_timestamp(0))
      ))
  );
end; $$;
revoke execute on function public.navigation_unread_counts() from public, anon;
grant execute on function public.navigation_unread_counts() to authenticated;

create index if not exists idx_comments_author_id_fk on public.comments(author_id);
create index if not exists idx_comments_parent_id_fk on public.comments(parent_id);
create index if not exists idx_comments_post_created on public.comments(post_id,created_at desc);
create index if not exists idx_communities_owner_id_fk on public.communities(owner_id);
create index if not exists idx_community_members_community_id_fk on public.community_members(community_id);
create index if not exists idx_conversation_participants_user_conversation on public.conversation_participants(user_id,conversation_id);
create index if not exists idx_conversations_created_by_fk on public.conversations(created_by);
create index if not exists idx_feedback_user_id_fk on public.feedback(user_id);
create index if not exists idx_follows_following_id_fk on public.follows(following_id);
create index if not exists idx_likes_post_id_fk on public.likes(post_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id,created_at desc);
create index if not exists idx_messages_sender_id_fk on public.messages(sender_id);
create index if not exists idx_moderation_logs_post_id_fk on public.moderation_logs(post_id);
create index if not exists idx_notifications_actor_id_fk on public.notifications(actor_id);
create index if not exists idx_notifications_comment_id_fk on public.notifications(comment_id);
create index if not exists idx_notifications_conversation_id_fk on public.notifications(conversation_id);
create index if not exists idx_notifications_post_id_fk on public.notifications(post_id);
create index if not exists idx_notifications_user_unread_created on public.notifications(user_id,read,created_at desc);
create index if not exists idx_plan_requests_user_id_fk on public.plan_requests(user_id);
create index if not exists idx_post_reports_reporter_id_fk on public.post_reports(reporter_id);
create index if not exists idx_posts_author_created on public.posts(author_id,created_at desc);
create index if not exists idx_posts_community_created on public.posts(community_id,created_at desc);
create index if not exists idx_push_subscriptions_user_id_fk on public.push_subscriptions(user_id);
create index if not exists idx_reactions_user_id_fk on public.reactions(user_id);
create index if not exists idx_reposts_user_id_fk on public.reposts(user_id);
create index if not exists idx_saved_posts_post_id_fk on public.saved_posts(post_id);
drop index if exists public.reactions_unique_idx;
