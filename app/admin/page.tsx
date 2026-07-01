'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/app/components/Nav'
import toast from 'react-hot-toast'

type PlanId = 'free' | 'boost' | 'mega'

type PlanRequest = {
  id: string
  user_id: string
  plan: PlanId
  status: string
  receipt_url: string
  created_at: string
  profiles: {
    username: string
    display_name: string
    avatar_url: string
    plan: PlanId
  }
}

type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string
  plan: PlanId
  is_admin: boolean
  created_at: string
}

const PLAN_COLORS: Record<PlanId, string> = {
  free: '#8888aa',
  boost: '#c8f23c',
  mega: '#a78bfa',
}

const PLAN_BADGES: Record<PlanId, string> = {
  free: '',
  boost: '⚡',
  mega: '👑',
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests')

  const [requests, setRequests] = useState<PlanRequest[]>([])
  const [requestsFilter, setRequestsFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [users, setUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'requests') fetchRequests()
    else fetchUsers()
  }, [isAdmin, activeTab, requestsFilter])

  async function checkAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      router.push('/feed')
      return
    }

    setAdminId(user.id)
    setIsAdmin(true)
    setLoading(false)
  }

  async function fetchRequests() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('plan_requests')
      .select(`
        *,
        profiles (username, display_name, avatar_url, plan)
      `)
      .eq('status', requestsFilter)
      .order('created_at', { ascending: false })

    if (!error && data) setRequests(data as PlanRequest[])
  }

  async function fetchUsers() {
    const supabase = createClient()
    const query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, plan, is_admin, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data, error } = await query
    if (!error && data) setUsers(data as Profile[])
  }

  async function handleRequest(requestId: string, userId: string, plan: PlanId, action: 'approved' | 'rejected') {
    setProcessingId(requestId)
    const supabase = createClient()

    try {
      const { error: reqError } = await supabase
        .from('plan_requests')
        .update({ status: action })
        .eq('id', requestId)

      if (reqError) throw reqError

      if (action === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan })
          .eq('id', userId)

        if (profileError) throw profileError

        // Notifica o usuário que o plano foi aprovado
        await supabase.from('notifications').insert({
          user_id: userId,
          actor_id: adminId,
          type: 'plan_approved',
          plan: plan,
        })
      }

      toast.success(action === 'approved' ? '✓ Plano aprovado!' : 'Pedido rejeitado.')
      fetchRequests()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar pedido.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleSetPlan(userId: string, plan: PlanId) {
    setUpdatingUser(userId)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan })
        .eq('id', userId)

      if (error) throw error

      // Notifica também quando o admin seta o plano manualmente
      if (plan !== 'free') {
        await supabase.from('notifications').insert({
          user_id: userId,
          actor_id: adminId,
          type: 'plan_approved',
          plan: plan,
        })
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
      toast.success(`Plano atualizado para ${plan.toUpperCase()}!`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar plano.')
    } finally {
      setUpdatingUser(null)
    }
  }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c8f23c', fontFamily: "'Syne', sans-serif", fontSize: 16 }}>Verificando acesso...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '48px 24px 100px',
        paddingLeft: 'max(24px, calc(220px + 32px))',
      }} className="admin-main">

        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(200,242,60,0.08)',
            border: '1px solid rgba(200,242,60,0.2)',
            borderRadius: 50, padding: '5px 16px', marginBottom: 16,
          }}>
            <span style={{ color: '#c8f23c', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
              🛡️ PAINEL ADMIN
            </span>
          </div>
          <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 32, margin: 0, letterSpacing: '-0.5px' }}>
            Administração VORTEX
          </h1>
        </div>

        <div style={{
          display: 'flex', gap: 4,
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: 4, marginBottom: 32,
          width: 'fit-content',
        }}>
          {(['requests', 'users'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: activeTab === tab ? 'rgba(200,242,60,0.12)' : 'transparent',
                color: activeTab === tab ? '#c8f23c' : '#555577',
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tab === 'requests' ? '📋 Pedidos de Plano' : '👥 Usuários'}
            </button>
          ))}
        </div>

        {activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['pending', 'approved', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setRequestsFilter(s)}
                  style={{
                    padding: '7px 18px', borderRadius: 50, border: '1px solid',
                    borderColor: requestsFilter === s
                      ? s === 'pending' ? 'rgba(255,200,0,0.4)'
                        : s === 'approved' ? 'rgba(200,242,60,0.4)'
                        : 'rgba(255,68,68,0.4)'
                      : 'rgba(255,255,255,0.06)',
                    background: requestsFilter === s
                      ? s === 'pending' ? 'rgba(255,200,0,0.08)'
                        : s === 'approved' ? 'rgba(200,242,60,0.08)'
                        : 'rgba(255,68,68,0.08)'
                      : 'transparent',
                    color: requestsFilter === s
                      ? s === 'pending' ? '#ffc800'
                        : s === 'approved' ? '#c8f23c'
                        : '#ff4444'
                      : '#555577',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {s === 'pending' ? '⏳ Pendentes' : s === 'approved' ? '✓ Aprovados' : '✕ Rejeitados'}
                </button>
              ))}
            </div>

            {requests.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 0',
                color: '#333355', fontSize: 14,
              }}>
                Nenhum pedido {requestsFilter === 'pending' ? 'pendente' : requestsFilter === 'approved' ? 'aprovado' : 'rejeitado'}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {requests.map(req => (
                  <div key={req.id} style={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16, padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: '#1a1a28',
                      border: '2px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {req.profiles?.avatar_url ? (
                        <img src={req.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555577', fontSize: 18 }}>
                          {req.profiles?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>
                          {req.profiles?.display_name || req.profiles?.username}
                        </span>
                        <span style={{ color: '#555577', fontSize: 13 }}>@{req.profiles?.username}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          color: PLAN_COLORS[req.profiles?.plan || 'free'],
                          fontSize: 12, fontWeight: 600,
                        }}>
                          Plano atual: {req.profiles?.plan?.toUpperCase() || 'FREE'}
                        </span>
                        <span style={{ color: '#333355', fontSize: 12 }}>→</span>
                        <span style={{
                          color: PLAN_COLORS[req.plan],
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {PLAN_BADGES[req.plan]} {req.plan.toUpperCase()}
                        </span>
                        <span style={{ color: '#333355', fontSize: 11 }}>
                          {new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <a
                      href={req.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#8888aa', fontSize: 12, fontWeight: 600,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                    >
                      📎 Ver comprovante
                    </a>

                    {requestsFilter === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleRequest(req.id, req.user_id, req.plan, 'rejected')}
                          disabled={processingId === req.id}
                          style={{
                            padding: '8px 18px', borderRadius: 50,
                            border: '1px solid rgba(255,68,68,0.3)',
                            background: 'rgba(255,68,68,0.06)',
                            color: '#ff4444', fontFamily: "'Syne', sans-serif",
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            transition: 'all 0.15s', opacity: processingId === req.id ? 0.5 : 1,
                          }}
                        >
                          ✕ Rejeitar
                        </button>
                        <button
                          onClick={() => handleRequest(req.id, req.user_id, req.plan, 'approved')}
                          disabled={processingId === req.id}
                          style={{
                            padding: '8px 18px', borderRadius: 50,
                            border: 'none',
                            background: '#c8f23c',
                            color: '#000', fontFamily: "'Syne', sans-serif",
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            transition: 'all 0.15s', opacity: processingId === req.id ? 0.5 : 1,
                            boxShadow: '0 0 16px rgba(200,242,60,0.3)',
                          }}
                        >
                          {processingId === req.id ? '...' : '✓ Aprovar'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div style={{ marginBottom: 24, position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: '#555577', fontSize: 16, pointerEvents: 'none',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar por username ou nome..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px 12px 44px',
                  background: '#111118',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, color: '#f0f0f8',
                  fontFamily: "'Syne', sans-serif", fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredUsers.map(user => (
                <div key={user.id} style={{
                  background: '#111118',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#1a1a28',
                    border: '2px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555577', fontSize: 16 }}>
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>
                        {user.display_name || user.username}
                      </span>
                      <span style={{ color: '#555577', fontSize: 12 }}>@{user.username}</span>
                      {user.is_admin && (
                        <span style={{
                          background: 'rgba(200,242,60,0.1)',
                          border: '1px solid rgba(200,242,60,0.2)',
                          color: '#c8f23c', fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 50,
                        }}>ADMIN</span>
                      )}
                    </div>
                    <div style={{
                      color: PLAN_COLORS[user.plan || 'free'],
                      fontSize: 11, fontWeight: 600, marginTop: 2,
                    }}>
                      {PLAN_BADGES[user.plan || 'free']} {(user.plan || 'free').toUpperCase()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['free', 'boost', 'mega'] as PlanId[]).map(p => (
                      <button
                        key={p}
                        onClick={() => user.plan !== p && handleSetPlan(user.id, p)}
                        disabled={updatingUser === user.id}
                        style={{
                          padding: '6px 14px', borderRadius: 50,
                          border: `1px solid ${user.plan === p ? PLAN_COLORS[p] : 'rgba(255,255,255,0.08)'}`,
                          background: user.plan === p ? `rgba(${p === 'boost' ? '200,242,60' : p === 'mega' ? '167,139,250' : '136,136,170'},0.12)` : 'transparent',
                          color: user.plan === p ? PLAN_COLORS[p] : '#555577',
                          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11,
                          cursor: user.plan === p ? 'default' : 'pointer',
                          transition: 'all 0.15s',
                          opacity: updatingUser === user.id ? 0.5 : 1,
                        }}
                      >
                        {PLAN_BADGES[p]} {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#333355', fontSize: 14 }}>
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        @media (max-width: 767px) {
          .admin-main { padding-left: 24px !important; }
        }
      `}</style>
    </div>
  )
}