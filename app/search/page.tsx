'use client'

import { useEffect, useState, useRef, useCallback, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase'
import { now } from '@/lib/time'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

type SearchTab = 'posts' | 'users' | 'communities'

type PostResult = {
  id: string
  title: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
  author: { username: string; display_name: string | null; avatar_url: string | null }
}

type UserResult = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

type CommunityResult = {
  id: string
  slug: string
  name: string
  description: string | null
  members_count: number
  icon: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<SearchTab>('posts')
  const [posts, setPosts] = useState<PostResult[]>([])
  const [users, setUsers] = useState<UserResult[]>([])
  const [communities, setCommunities] = useState<CommunityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPosts([]); setUsers([]); setCommunities([])
      setSearched(false); setLoading(false)
      return
    }

    setLoading(true)
    setSearched(true)
    const term = q.trim()

    const [postsRes, usersRes, commRes] = await Promise.all([
      supabase
        .from('posts')
        .select('id, title, content, likes_count, comments_count, created_at, author:author_id(username, display_name, avatar_url)')
        .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
        .eq('moderation_status', 'approved')
        .order('likes_count', { ascending: false })
        .limit(20),

      supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(15),

      supabase
        .from('communities')
        .select('id, slug, name, description, members_count, icon')
        .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
        .order('members_count', { ascending: false })
        .limit(10),
    ])

    setPosts((postsRes.data as unknown as PostResult[]) || [])
    setUsers((usersRes.data as unknown as UserResult[]) || [])
    setCommunities((commRes.data as unknown as CommunityResult[]) || [])
    setLoading(false)
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 350)
  }

  function timeAgo(date: string) {
    const diff = Math.floor((now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  function highlight(text: string, q: string) {
    if (!q.trim()) return text
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ background: 'rgba(200,242,60,0.25)', color: '#c8f23c', borderRadius: 3, padding: '0 2px' }}>
          {part}
        </mark>
      ) : part
    )
  }

  const totalResults = posts.length + users.length + communities.length
  const tabCounts: Record<SearchTab, number> = { posts: posts.length, users: users.length, communities: communities.length }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.15)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => router.push('/feed')}
            style={{ background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 18, padding: '4px 8px', flexShrink: 0, fontFamily: "'Syne', sans-serif" }}
          >
            ←
          </button>

          {/* Search Input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555577', fontSize: 15, pointerEvents: 'none' }}>
              ⌕
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Buscar posts, pessoas, comunidades..."
              style={{
                width: '100%', background: '#111118',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '10px 14px 10px 40px',
                color: '#f0f0f8', fontSize: 14, outline: 'none',
                fontFamily: "'Syne', sans-serif", boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 14
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {searched && (
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {(['posts', 'users', 'communities'] as SearchTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600,
                  background: 'transparent', transition: 'all 0.2s',
                  color: tab === t ? '#c8f23c' : '#555577',
                  borderBottom: `2px solid ${tab === t ? '#c8f23c' : 'transparent'}`,
                }}
              >
                {t === 'posts' ? 'Posts' : t === 'users' ? 'Pessoas' : 'Comunidades'}
                {tabCounts[t] > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, color: tab === t ? '#c8f23c' : '#333355' }}>
                    {tabCounts[t]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>

        {/* Empty state */}
        {!searched && (
          <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 48, opacity: 0.2 }}>⌕</div>
            <p style={{ color: '#333355', fontSize: 14 }}>Digite algo para buscar</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['tecnologia', 'design', 'programação'].map(hint => (
                <button
                  key={hint}
                  onClick={() => handleQueryChange(hint)}
                  style={{
                    background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#8888aa', borderRadius: 999, padding: '6px 14px',
                    fontSize: 13, cursor: 'pointer', fontFamily: "'Syne', sans-serif",
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#c8f23c' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8888aa' }}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#111118', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }}>
                <div style={{ height: 14, background: '#1a1a28', borderRadius: 6, width: '60%', marginBottom: 10 }} />
                <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '90%', marginBottom: 6 }} />
                <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {searched && !loading && totalResults === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: '#333355', fontSize: 14 }}>Nenhum resultado para &ldquo;<span style={{ color: '#555577' }}>{query}</span>&rdquo;</p>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Posts */}
            {tab === 'posts' && posts.map((post, i) => {
              const author = post.author
              return (
                <article
                  key={post.id}
                  onClick={() => router.push(`/post/${post.id}`)}
                  style={{
                    background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                    transition: 'all 0.2s',
                    animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', position: 'relative',
                      background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: '#000', flexShrink: 0,
                    }}>
                      {author?.avatar_url
                        ? <Image src={author.avatar_url} alt="" fill sizes="22px" style={{ objectFit: 'cover' }} />
                        : author?.username?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: '#555577', fontSize: 12 }}>@{author?.username}</span>
                    <span style={{ color: '#222240', fontSize: 12 }}>·</span>
                    <span style={{ color: '#222240', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
                  </div>

                  <h3 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                    {highlight(post.title, query)}
                  </h3>
                  {post.content && (
                    <p style={{
                      color: '#8888aa', fontSize: 13, lineHeight: 1.6, marginBottom: 10,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    } as CSSProperties}>
                      {highlight(post.content.slice(0, 200), query)}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span style={{ color: '#333355', fontSize: 12 }}>▲ {post.likes_count}</span>
                    <span style={{ color: '#333355', fontSize: 12 }}>💬 {post.comments_count}</span>
                  </div>
                </article>
              )
            })}

            {tab === 'posts' && posts.length === 0 && (
              <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>Nenhum post encontrado.</p>
            )}

            {/* Users */}
            {tab === 'users' && users.map((user, i) => (
              <div
                key={user.id}
                onClick={() => router.push(`/profile/${user.username}`)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'center',
                  background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(200,242,60,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', position: 'relative',
                  background: user.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: '#000',
                  boxShadow: '0 0 14px rgba(200,242,60,0.2)',
                }}>
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
                    : user.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>
                    {highlight(user.display_name || user.username, query)}
                  </p>
                  <p style={{ color: '#555577', fontSize: 13 }}>@{highlight(user.username, query)}</p>
                  {user.bio && (
                    <p style={{ color: '#8888aa', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.bio}
                    </p>
                  )}
                </div>
                <span style={{ color: '#333355', fontSize: 18, flexShrink: 0 }}>→</span>
              </div>
            ))}

            {tab === 'users' && users.length === 0 && (
              <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>Nenhuma pessoa encontrada.</p>
            )}

            {/* Communities */}
            {tab === 'communities' && communities.map((comm, i) => (
              <div
                key={comm.id}
                onClick={() => router.push(`/community/${comm.slug}`)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'center',
                  background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                  background: 'linear-gradient(135deg, rgba(200,242,60,0.2), rgba(200,242,60,0.05))',
                  border: '1px solid rgba(200,242,60,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {comm.icon || '🌐'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>
                    {highlight(comm.name, query)}
                  </p>
                  <p style={{ color: '#555577', fontSize: 12 }}>r/{comm.slug} · {comm.members_count?.toLocaleString('pt-BR') || 0} membros</p>
                  {comm.description && (
                    <p style={{ color: '#8888aa', fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comm.description}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {tab === 'communities' && communities.length === 0 && (
              <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>Nenhuma comunidade encontrada.</p>
            )}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input::placeholder { color: #333355; }
      `}</style>
    </div>
  )
}