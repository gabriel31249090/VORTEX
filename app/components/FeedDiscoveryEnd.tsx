'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Compass, Users } from 'lucide-react'

type Community = {
  id: string
  name: string
  slug: string
  icon_url: string | null
  members_count: number
  posts_count: number
}

type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  followers_count: number
}

type Discovery = {
  communities?: Community[]
  profiles?: Profile[]
}

const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export default function FeedDiscoveryEnd({ empty = false }: { empty?: boolean }) {
  const [data, setData] = useState<Discovery>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true

    async function load() {
      const { data: discovery, error } = await supabase.rpc('feed_discovery', {
        community_limit: 4,
        profile_limit: 4,
      })
      if (active && !error) setData((discovery || {}) as Discovery)
    }

    load()
    return () => { active = false }
  }, [supabase])

  const communities = data.communities || []
  const profiles = data.profiles || []

  if (communities.length === 0 && profiles.length === 0) return null

  return (
    <section className={`vtx-feed-discovery-end ${empty ? 'is-empty' : ''}`}>
      <header className="vtx-discovery-end-header">
        <div>
          <span className="vtx-discovery-kicker"><Compass size={14} /> Continue explorando</span>
          <h2>{empty ? 'Construa seu VORTEX' : 'O feed acabou. A descoberta não.'}</h2>
          <p>Encontre comunidades e pessoas para deixar o próximo carregamento muito mais interessante.</p>
        </div>
        <button onClick={() => router.push('/communities')}>
          Explorar tudo <ArrowRight size={14} />
        </button>
      </header>

      <div className="vtx-discovery-end-grid">
        {communities.length > 0 && (
          <div className="vtx-discovery-panel">
            <div className="vtx-discovery-panel-title"><Users size={15} /> Comunidades</div>
            {communities.slice(0, 3).map((community) => (
              <button
                key={community.id}
                className="vtx-discovery-row"
                onClick={() => router.push(`/community/${community.slug}`)}
              >
                <span className="vtx-discovery-avatar">
                  {community.icon_url ? (
                    <Image src={community.icon_url} alt="" fill sizes="34px" style={{ objectFit: 'cover' }} />
                  ) : community.name.charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>v/{community.name}</strong>
                  <small>{compactNumber.format(community.members_count)} membros · {community.posts_count} posts recentes</small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        )}

        {profiles.length > 0 && (
          <div className="vtx-discovery-panel">
            <div className="vtx-discovery-panel-title">Pessoas</div>
            {profiles.slice(0, 3).map((profile) => (
              <button
                key={profile.id}
                className="vtx-discovery-row"
                onClick={() => router.push(`/profile/${profile.username}`)}
              >
                <span className="vtx-discovery-avatar">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" fill sizes="34px" style={{ objectFit: 'cover' }} />
                  ) : profile.username.charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>{profile.display_name || `@${profile.username}`}</strong>
                  <small>@{profile.username} · {compactNumber.format(profile.followers_count)} seguidores</small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
