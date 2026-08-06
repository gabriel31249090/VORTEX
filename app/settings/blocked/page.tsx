'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Nav from '../../components/Nav'

type BlockedRow = {
  blocked_id: string
  created_at: string
  profile: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export default function BlockedUsersPage() {
  const [rows, setRows] = useState<BlockedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id, created_at, profile:profiles!blocked_users_blocked_id_fkey(username, display_name, avatar_url)')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      setRows((data as unknown as BlockedRow[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function unblock(blockedId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUnblockingId(blockedId)
    const { error } = await supabase
      .from('blocked_users').delete()
      .eq('blocker_id', user.id).eq('blocked_id', blockedId)
    if (error) {
      toast.error('Não foi possível desbloquear.')
    } else {
      setRows(prev => prev.filter(r => r.blocked_id !== blockedId))
      toast.success('Usuário desbloqueado.')
    }
    setUnblockingId(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Usuários bloqueados</h1>
        <p style={{ color: '#555577', fontSize: 14, marginBottom: 24 }}>
          O conteúdo de quem você bloqueia some do seu feed, e vocês não conseguem iniciar uma
          conversa nova um com o outro.
        </p>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 64, background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>
            Você não bloqueou ninguém ainda.
          </p>
        )}

        {!loading && rows.map(row => (
          <div key={row.blocked_id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
            padding: '12px 16px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: row.profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 16, overflow: 'hidden',
              }}>
                {row.profile?.avatar_url
                  ? <img src={row.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (row.profile?.username?.charAt(0).toUpperCase() || '?')}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.profile?.display_name || row.profile?.username || 'Usuário removido'}
                </p>
                {row.profile?.username && (
                  <p style={{ color: '#555577', fontSize: 12, margin: 0 }}>@{row.profile.username}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => unblock(row.blocked_id)}
              disabled={unblockingId === row.blocked_id}
              style={{
                flexShrink: 0, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                color: '#8888aa', padding: '7px 14px', borderRadius: 50,
                cursor: unblockingId === row.blocked_id ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: "'Syne', sans-serif", opacity: unblockingId === row.blocked_id ? 0.6 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.4)'; e.currentTarget.style.color = '#c8f23c' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' }}
            >
              {unblockingId === row.blocked_id ? '...' : 'Desbloquear'}
            </button>
          </div>
        ))}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}
