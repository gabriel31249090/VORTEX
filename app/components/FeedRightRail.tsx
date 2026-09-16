'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Bookmark, ChevronRight, MessageSquareText, Plus, Sparkles, Users } from 'lucide-react'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
}

function CommunityIcon({ community }: { community: Community }) {
  return (
    <span className="vtx-rail-community-icon">
      {community.icon_url ? (
        <Image src={community.icon_url} alt="" fill sizes="34px" style={{ objectFit: 'cover' }} />
      ) : (
        community.name.charAt(0).toUpperCase()
      )}
    </span>
  )
}

export default function FeedRightRail() {
  const [communities, setCommunities] = useState<Community[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('communities')
        .select('id, name, slug, description, icon_url')
        .order('created_at', { ascending: false })
        .limit(5)

      if (active && data) setCommunities(data as Community[])
    }
    load()
    return () => { active = false }
  }, [supabase])

  return (
    <aside className="vtx-feed-right-rail">
      <section className="vtx-rail-card vtx-rail-card--hero">
        <div className="vtx-rail-eyebrow"><Sparkles size={14} /> VORTEX</div>
        <h2>Seu feed, do seu jeito.</h2>
        <p>Converse, encontre comunidades e publique sem sair do fluxo.</p>
        <button className="vtx-rail-primary" onClick={() => router.push('/post/new')}>
          <Plus size={16} /> Criar publicação
        </button>
      </section>

      <section className="vtx-rail-card">
        <div className="vtx-rail-card-title">
          <span>Comunidades para explorar</span>
          <Users size={16} />
        </div>

        <div className="vtx-rail-community-list">
          {communities.length === 0 && (
            <div className="vtx-rail-muted">As comunidades vão aparecer aqui.</div>
          )}

          {communities.map((community) => (
            <button
              key={community.id}
              className="vtx-rail-community"
              onClick={() => router.push(`/community/${community.slug}`)}
            >
              <CommunityIcon community={community} />
              <span className="vtx-rail-community-copy">
                <strong>v/{community.name}</strong>
                <small>{community.description || 'Entre e acompanhe as conversas.'}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>

        <button className="vtx-rail-link" onClick={() => router.push('/communities')}>
          Ver todas as comunidades <ChevronRight size={14} />
        </button>
      </section>

      <section className="vtx-rail-card">
        <div className="vtx-rail-card-title">Atalhos</div>
        <button className="vtx-rail-shortcut" onClick={() => router.push('/saved')}>
          <Bookmark size={16} /> Salvos
        </button>
        <button className="vtx-rail-shortcut" onClick={() => router.push('/messages')}>
          <MessageSquareText size={16} /> Mensagens
        </button>
        <button className="vtx-rail-shortcut" onClick={() => router.push('/communities')}>
          <Users size={16} /> Comunidades
        </button>
      </section>

      <p className="vtx-rail-footnote">
        VORTEX · conversas reais, comunidades reais.
      </p>
    </aside>
  )
}
