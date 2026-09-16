'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Bookmark,
  ChevronRight,
  MessageSquareText,
  Plus,
  Sparkles,
  TrendingUp,
  UserRoundPlus,
  Users,
} from 'lucide-react'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
  members_count: number
  posts_count: number
  viewer_joined: boolean
}

type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  followers_count: number
  plan: 'free' | 'boost' | 'mega'
}

type Discovery = {
  communities?: Community[]
  profiles?: Profile[]
}

const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

function CommunityIcon({ community }: { community: Community }) {
  return (
    <span className="vtx-rail-community-icon">
      {community.icon_url ? (
        <Image src={community.icon_url} alt="" fill sizes="32px" style={{ objectFit: 'cover' }} />
      ) : (
        community.name.charAt(0).toUpperCase()
      )}
    </span>
  )
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  return (
    <span className="vtx-rail-profile-avatar">
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt="" fill sizes="32px" style={{ objectFit: 'cover' }} />
      ) : (
        profile.username.charAt(0).toUpperCase()
      )}
    </span>
  )
}

export default function FeedRightRail() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error } = await supabase.rpc('feed_discovery', {
        community_limit: 5,
        profile_limit: 3,
      })

      if (!active || error) return
      const discovery = (data || {}) as Discovery
      setCommunities(discovery.communities || [])
      setProfiles(discovery.profiles || [])
    }

    load()
    return () => { active = false }
  }, [supabase])

  return (
    <aside className="vtx-feed-right-rail">
      <section className="vtx-rail-card vtx-rail-card--hero vtx-rail-card--compact">
        <div>
          <div className="vtx-rail-eyebrow"><Sparkles size={13} /> VORTEX</div>
          <h2>Entre na conversa.</h2>
        </div>
        <button className="vtx-rail-primary vtx-rail-primary--compact" onClick={() => router.push('/post/new')}>
          <Plus size={15} /> Publicar
        </button>
      </section>

      <section className="vtx-rail-card">
        <div className="vtx-rail-card-title">
          <span>Comunidades em destaque</span>
          <TrendingUp size={15} />
        </div>

        <div className="vtx-rail-community-list">
          {communities.length === 0 && (
            <div className="vtx-rail-muted">As comunidades vão aparecer aqui.</div>
          )}

          {communities.map((community, index) => (
            <button
              key={community.id}
              className="vtx-rail-community vtx-rail-community--ranked"
              onClick={() => router.push(`/community/${community.slug}`)}
            >
              <span className="vtx-rail-rank">#{index + 1}</span>
              <CommunityIcon community={community} />
              <span className="vtx-rail-community-copy">
                <strong>v/{community.name}</strong>
                <small>
                  {compactNumber.format(community.members_count)} membros
                  {community.posts_count > 0 ? ` · ${community.posts_count} posts/mês` : ''}
                </small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>

        <button className="vtx-rail-link" onClick={() => router.push('/communities')}>
          Explorar comunidades <ChevronRight size={14} />
        </button>
      </section>

      {profiles.length > 0 && (
        <section className="vtx-rail-card">
          <div className="vtx-rail-card-title">
            <span>Pessoas para conhecer</span>
            <UserRoundPlus size={15} />
          </div>

          <div className="vtx-rail-profile-list">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className="vtx-rail-profile"
                onClick={() => router.push(`/profile/${profile.username}`)}
              >
                <ProfileAvatar profile={profile} />
                <span className="vtx-rail-profile-copy">
                  <strong>{profile.display_name || `@${profile.username}`}</strong>
                  <small>@{profile.username} · {compactNumber.format(profile.followers_count)} seguidores</small>
                </span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="vtx-rail-card vtx-rail-card--shortcuts">
        <div className="vtx-rail-card-title">Atalhos</div>
        <div className="vtx-rail-shortcut-grid">
          <button className="vtx-rail-shortcut" onClick={() => router.push('/saved')}>
            <Bookmark size={15} /> Salvos
          </button>
          <button className="vtx-rail-shortcut" onClick={() => router.push('/messages')}>
            <MessageSquareText size={15} /> Mensagens
          </button>
          <button className="vtx-rail-shortcut" onClick={() => router.push('/communities')}>
            <Users size={15} /> Comunidades
          </button>
        </div>
      </section>

      <p className="vtx-rail-footnote">VORTEX · conversas reais, comunidades reais.</p>
    </aside>
  )
}
