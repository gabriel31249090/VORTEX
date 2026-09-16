'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ImageIcon, Link2, PenLine } from 'lucide-react'

type Props = {
  username: string | null
  avatarUrl: string | null
}

export default function FeedComposer({ username, avatarUrl }: Props) {
  const router = useRouter()
  const initial = username?.charAt(0)?.toUpperCase() || '?'

  return (
    <section className="vtx-feed-composer">
      <button
        className="vtx-composer-avatar"
        onClick={() => username && router.push(`/profile/${username}`)}
        aria-label="Abrir seu perfil"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill sizes="36px" style={{ objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </button>

      <button className="vtx-composer-input" onClick={() => router.push('/post/new')}>
        Compartilhe algo com a comunidade…
      </button>

      <button className="vtx-composer-tool" onClick={() => router.push('/post/new')} title="Criar publicação">
        <PenLine size={18} />
      </button>
      <button className="vtx-composer-tool" onClick={() => router.push('/post/new')} title="Publicar imagem">
        <ImageIcon size={18} />
      </button>
      <button className="vtx-composer-tool" onClick={() => router.push('/post/new')} title="Publicar link">
        <Link2 size={18} />
      </button>
    </section>
  )
}
