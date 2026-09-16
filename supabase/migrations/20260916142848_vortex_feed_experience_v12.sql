-- VORTEX 1.2: feed sorting and discovery.
create or replace function public.feed_page_v2(
  feed_mode text default 'geral',
  sort_mode text default 'recent',
  cursor_score double precision default null,
  cursor_at timestamptz default null,
  cursor_post_id uuid default null,
  limit_count integer default 15
)
returns jsonb
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with activity as (
    select
      p.id as post_id,
      p.author_id,
      p.created_at as activity_at,
      false as is_repost,
      null::uuid as reposter_id,
      null::text as reposter_username
    from public.posts p
    where p.moderation_status = 'approved'

    union all

    select
      r.post_id,
      p.author_id,
      r.created_at as activity_at,
      true as is_repost,
      r.user_id as reposter_id,
      rp.username as reposter_username
    from public.reposts r
    join public.posts p on p.id = r.post_id
    join public.profiles rp on rp.id = r.user_id
    where p.moderation_status = 'approved'
  ),
  ranked as (
    select
      a.*,
      p.title,
      p.content,
      p.type as post_type,
      p.media_url,
      coalesce(p.likes_count, 0) as likes_count,
      coalesce(p.comments_count, 0) as comments_count,
      coalesce(p.reposts_count, 0) as reposts_count,
      p.created_at,
      pr.username as profile_username,
      pr.avatar_url as profile_avatar_url,
      pr.plan as profile_plan,
      pr.accent_color as profile_accent_color,
      c.name as community_name,
      c.slug as community_slug,
      case
        when sort_mode = 'top' then
          greatest(
            0,
            coalesce(p.likes_count, 0)
            + coalesce(p.comments_count, 0) * 2
            + coalesce(p.reposts_count, 0) * 3
          )::double precision
        when sort_mode = 'hot' then
          (
            greatest(
              0,
              coalesce(p.likes_count, 0) * 2
              + coalesce(p.comments_count, 0) * 3
              + coalesce(p.reposts_count, 0) * 4
            ) + 1
          )::double precision
          /
          power(
            greatest(2, extract(epoch from (now() - a.activity_at)) / 3600 + 2)::double precision,
            1.35
          )
        else extract(epoch from a.activity_at)::double precision
      end as rank_score,
      (
        select l.vote_type
        from public.likes l
        where l.post_id = p.id
          and l.user_id = (select auth.uid())
        limit 1
      ) as viewer_vote,
      exists (
        select 1
        from public.reposts mr
        where mr.post_id = p.id
          and mr.user_id = (select auth.uid())
      ) as viewer_reposted
    from activity a
    join public.posts p on p.id = a.post_id
    left join public.profiles pr on pr.id = p.author_id
    left join public.communities c on c.id = p.community_id
    where (select auth.uid()) is not null
      and not exists (
        select 1
        from public.blocked_users b
        where
          (
            b.blocker_id = (select auth.uid())
            and (b.blocked_id = a.author_id or b.blocked_id = a.reposter_id)
          )
          or
          (
            b.blocked_id = (select auth.uid())
            and (b.blocker_id = a.author_id or b.blocker_id = a.reposter_id)
          )
      )
      and (
        feed_mode <> 'seguindo'
        or exists (
          select 1
          from public.follows f
          where f.follower_id = (select auth.uid())
            and (f.following_id = a.author_id or f.following_id = a.reposter_id)
        )
      )
  ),
  selected as (
    select *
    from ranked r
    where
      cursor_score is null
      or r.rank_score < cursor_score
      or (
        r.rank_score = cursor_score
        and (
          cursor_at is null
          or r.activity_at < cursor_at
          or (
            r.activity_at = cursor_at
            and (cursor_post_id is null or r.post_id < cursor_post_id)
          )
        )
      )
    order by r.rank_score desc, r.activity_at desc, r.post_id desc
    limit greatest(1, least(limit_count, 50))
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'activity_at', s.activity_at,
        'rank_score', s.rank_score,
        'post_id', s.post_id,
        'author_id', s.author_id,
        'title', s.title,
        'content', s.content,
        'type', s.post_type,
        'media_url', s.media_url,
        'likes_count', s.likes_count,
        'comments_count', s.comments_count,
        'reposts_count', s.reposts_count,
        'created_at', s.created_at,
        'profile_username', s.profile_username,
        'profile_avatar_url', s.profile_avatar_url,
        'profile_plan', s.profile_plan,
        'profile_accent_color', s.profile_accent_color,
        'community_name', s.community_name,
        'community_slug', s.community_slug,
        'is_repost', s.is_repost,
        'reposter_id', s.reposter_id,
        'reposter_username', s.reposter_username,
        'viewer_vote', s.viewer_vote,
        'viewer_reposted', s.viewer_reposted
      )
      order by s.rank_score desc, s.activity_at desc, s.post_id desc
    ),
    '[]'::jsonb
  )
  from selected s;
$$;

revoke all on function public.feed_page_v2(text, text, double precision, timestamptz, uuid, integer) from public, anon;
grant execute on function public.feed_page_v2(text, text, double precision, timestamptz, uuid, integer) to authenticated;

create or replace function public.feed_discovery(
  community_limit integer default 6,
  profile_limit integer default 5
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'communities',
    coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select
          c.id,
          c.name,
          c.slug,
          c.description,
          c.icon_url,
          count(distinct cm.user_id)::integer as members_count,
          count(distinct p.id)::integer as posts_count,
          exists (
            select 1
            from public.community_members mine
            where mine.community_id = c.id
              and mine.user_id = (select auth.uid())
          ) as viewer_joined
        from public.communities c
        left join public.community_members cm on cm.community_id = c.id
        left join public.posts p
          on p.community_id = c.id
          and p.moderation_status = 'approved'
          and p.created_at > now() - interval '30 days'
        where coalesce(c.is_private, false) = false
        group by c.id
        order by
          count(distinct cm.user_id) desc,
          count(distinct p.id) desc,
          c.created_at desc
        limit greatest(1, least(community_limit, 10))
      ) x
    ), '[]'::jsonb),
    'profiles',
    coalesce((
      select jsonb_agg(to_jsonb(x))
      from (
        select
          pr.id,
          pr.username,
          pr.display_name,
          pr.avatar_url,
          coalesce(pr.followers_count, 0) as followers_count,
          pr.plan
        from public.profiles pr
        where pr.id <> (select auth.uid())
          and not exists (
            select 1
            from public.follows f
            where f.follower_id = (select auth.uid())
              and f.following_id = pr.id
          )
          and not exists (
            select 1
            from public.blocked_users b
            where
              (b.blocker_id = (select auth.uid()) and b.blocked_id = pr.id)
              or
              (b.blocked_id = (select auth.uid()) and b.blocker_id = pr.id)
          )
        order by
          coalesce(pr.followers_count, 0) desc,
          pr.created_at desc
        limit greatest(1, least(profile_limit, 10))
      ) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.feed_discovery(integer, integer) from public, anon;
grant execute on function public.feed_discovery(integer, integer) to authenticated;
