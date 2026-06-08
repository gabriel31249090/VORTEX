'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Nav from '@/app/components/Nav'
import Link from 'next/link'

type FollowUser = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  followed_at?: string
}

export default function FollowsPage() {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [profileUsername, setProfileUsername] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})
  
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const username = params.username as string
  const tab = searchParams.get('tab') || 'followers'

  useEffect(() => {
    async function load() {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .single()
      
      if (!profile) {
        setLoading(false)
        return
      }
      
      setProfileUsername(profile.username)
      
      let followsData: any[] = []
      
      if (tab === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select(`
            follower_id,
            created_at,
            follower:follower_id (
              id, username, display_name, avatar_url, bio, created_at
            )
          `)
          .eq('following_id', profile.id)
          .order('created_at', { ascending: false })
        
        if (data) {
          followsData = data.map(item => ({
            ...item.follower,
            followed_at: item.created_at
          }))
        }
      } else {
        const { data } = await supabase
          .from('follows')
          .select(`
            following_id,
            created_at,
            following:following_id (
              id, username, display_name, avatar_url, bio, created_at
            )
          `)
          .eq('follower_id', profile.id)
          .order('created_at', { ascending: false })
        
        if (data) {
          followsData = data.map(item => ({
            ...item.following,
            followed_at: item.created_at
          }))
        }
      }
      
      setUsers(followsData)
      
      if (user && tab === 'following') {
        const followingStatus: Record<string, boolean> = {}
        for (const followedUser of followsData) {
          const { data: followCheck } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', followedUser.id)
            .single()
          followingStatus[followedUser.id] = !!followCheck
        }
        setFollowingMap(followingStatus)
      }
      
      setLoading(false)
    }
    
    load()
  }, [username, tab])
  
  async function handleFollow(userId: string, isCurrentlyFollowing: boolean) {
    if (!currentUserId) {
      router.push('/login')
      return
    }
    
    if (isCurrentlyFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
      
      setFollowingMap(prev => ({ ...prev, [userId]: false }))
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: userId })
      
      setFollowingMap(prev => ({ ...prev, [userId]: true }))
    }
  }
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
        <p style={{ color: '#555577' }}>Carregando...</p>
      </div>
    )
  }
  
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
            onClick={() => router.back()} 
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}
          >
            ← Voltar
          </button>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>
            @{profileUsername} • {tab === 'followers' ? 'Seguidores' : 'Seguindo'}
          </span>
        </div>
      </header>
      
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', background: '#111118', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
          <Link 
            href={`/profile/${username}/follows?tab=followers`}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, textAlign: 'center',
              fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, textDecoration: 'none',
              background: tab === 'followers' ? 'rgba(200,242,60,0.12)' : 'transparent',
              color: tab === 'followers' ? '#c8f23c' : '#555577',
            }}
          >
            Seguidores
          </Link>
          <Link 
            href={`/profile/${username}/follows?tab=following`}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, textAlign: 'center',
              fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, textDecoration: 'none',
              background: tab === 'following' ? 'rgba(200,242,60,0.12)' : 'transparent',
              color: tab === 'following' ? '#c8f23c' : '#555577',
            }}
          >
            Seguindo
          </Link>
        </div>
        
        {users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#111118', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: '#555577', fontSize: 14 }}>
              {tab === 'followers' 
                ? `Nenhum seguidor ainda.` 
                : `@${profileUsername} não segue ninguém ainda.`}
            </p>
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div
                onClick={() => router.push(`/profile/${user.username}`)}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: user.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 800, fontSize: 20,
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                }}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              
              <div 
                onClick={() => router.push(`/profile/${user.username}`)}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>
                    {user.display_name || user.username}
                  </span>
                  <span style={{ color: '#555577', fontSize: 13 }}>@{user.username}</span>
                </div>
                {user.bio && (
                  <p style={{ color: '#8888aa', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                    {user.bio.length > 80 ? user.bio.substring(0, 80) + '...' : user.bio}
                  </p>
                )}
              </div>
              
              {currentUserId && currentUserId !== user.id && tab === 'following' && (
                <button
                  onClick={() => handleFollow(user.id, followingMap[user.id] || false)}
                  style={{
                    background: followingMap[user.id] ? 'transparent' : '#c8f23c',
                    border: followingMap[user.id] ? '1px solid rgba(255,255,255,0.12)' : 'none',
                    color: followingMap[user.id] ? '#8888aa' : '#000',
                    padding: '6px 16px',
                    borderRadius: 50,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'Syne', sans-serif",
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (followingMap[user.id]) {
                      e.currentTarget.style.borderColor = 'rgba(255,60,60,0.4)'
                      e.currentTarget.style.color = '#ff6060'
                    }
                  }}
                  onMouseLeave={e => {
                    if (followingMap[user.id]) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                      e.currentTarget.style.color = '#8888aa'
                    }
                  }}
                >
                  {followingMap[user.id] ? 'Seguindo ✓' : 'Seguir'}
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  )
}