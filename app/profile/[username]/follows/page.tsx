'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Nav from '../../../components/Nav'
import Image from 'next/image'

type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

type Tab = 'followers' | 'following'

export default function FollowsPage() {
  const [followers, setFollowers] = useState<Profile[]>([])
  const [following, setFollowing] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const username = params.username as string
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'followers')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('username', username)
        .single()

      if (!profileData) { setLoading(false); return }
      setProfile(profileData)

      const [{ data: followersData }, { data: followingData }] = await Promise.all([
        supabase
          .from('follows')
          .select('follower:follower_id(id, username, display_name, avatar_url)')
          .eq('following_id', profileData.id),
        supabase
          .from('follows')
          .select('following:following_id(id, username, display_name, avatar_url)')
          .eq('follower_id', profileData.id),
      ])

      setFollowers((followersData || []).map((f: any) => f.follower))
      setFollowing((followingData || []).map((f: any) => f.following))

      if (user) {
        const { data: myFollowing } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        setFollowingIds(new Set((myFollowing || []).map((f: any) => f.following_id)))
      }

      setLoading(false)
    }
    load()
  }, [username])

  async function handleFollow(targetId: string) {
    if (!currentUserId) { router.push('/login'); return }
    const isFollowing = followingIds.has(targetId)

    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetId)
      setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId })
      setFollowingIds(prev => new Set(prev).add(targetId))
    }
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  const list = tab === 'followers' ? followers : following

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push(`/profile/${username}`)}
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}
          >
            ← Voltar
          </button>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>@{username}</span>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        <div style={{ display: 'flex', background: '#111118', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
          {(['followers', 'following'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: tab === t ? 'rgba(200,242,60,0.12)' : 'transparent',
                color: tab === t ? '#c8f23c' : '#555577',
              }}
            >
              {t === 'followers'
                ? `Seguidores (${followers.length})`
                : `Seguindo (${following.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: '#111118', borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'center', opacity: 0.5 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#222230', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, background: '#222230', borderRadius: 4, width: '40%', marginBottom: 8 }} />
                  <div style={{ height: 12, background: '#222230', borderRadius: 4, width: '25%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <p style={{ fontSize: 15 }}>
              {tab === 'followers' ? 'Nenhum seguidor ainda.' : 'Não está seguindo ninguém ainda.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!loading && list.map(user => {
            if (!user) return null
            const isMe = currentUserId === user.id
            const isFollowingUser = followingIds.has(user.id)

            return (
              <div
                key={user.id}
                style={{
                  background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <div
                  onClick={() => router.push(`/profile/${user.username}`)}
                  style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0, position: 'relative',
                    background: user.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 800, fontSize: 18,
                    overflow: 'hidden', cursor: 'pointer',
                    boxShadow: '0 0 8px rgba(200,242,60,0.1)'
                  }}
                >
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
                    : getInitial(user.username)
                  }
                </div>

                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => router.push(`/profile/${user.username}`)}
                >
                  <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>
                    {user.display_name || user.username}
                  </p>
                  <p style={{ color: '#555577', fontSize: 13 }}>@{user.username}</p>
                </div>

                {!isMe && (
                  <button
                    onClick={() => handleFollow(user.id)}
                    style={{
                      background: isFollowingUser ? 'transparent' : '#c8f23c',
                      border: isFollowingUser ? '1px solid rgba(255,255,255,0.12)' : 'none',
                      color: isFollowingUser ? '#8888aa' : '#000',
                      padding: '6px 16px', borderRadius: 50, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif",
                      transition: 'all 0.2s', flexShrink: 0,
                      boxShadow: isFollowingUser ? 'none' : '0 0 10px rgba(200,242,60,0.3)',
                    }}
                    onMouseEnter={e => { if (isFollowingUser) { e.currentTarget.style.borderColor = 'rgba(255,60,60,0.4)'; e.currentTarget.style.color = '#ff6060' } }}
                    onMouseLeave={e => { if (isFollowingUser) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' } }}
                  >
                    {isFollowingUser ? 'Seguindo ✓' : 'Seguir'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}