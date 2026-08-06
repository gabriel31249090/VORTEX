'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Nav from '@/app/components/Nav'
import toast from 'react-hot-toast'
import Image from 'next/image'

type PlanId = 'free' | 'boost' | 'mega'
type AdType = 'popup' | 'feed'

type PlanRequest = {
  id: string
  user_id: string
  plan: PlanId
  status: string
  receipt_url: string
  created_at: string
  profiles: { username: string; display_name: string; avatar_url: string; plan: PlanId }
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

type ModerationPost = {
  id: string
  title: string
  content: string
  author_id: string
  moderation_reason: string | null
  moderation_details: Record<string, unknown> | null
  created_at: string
  profiles: { username: string; display_name: string; avatar_url: string | null }[] | null
}

type FeedbackMessage = {
  id: number
  user_id: string | null
  category: string
  subject: string | null
  message: string
  status: string
  created_at: string
}

type Ad = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string
  type: AdType
  active: boolean
  created_at: string
}

const PLAN_COLORS: Record<PlanId, string> = { free: '#8888aa', boost: '#c8f23c', mega: '#a78bfa' }
const PLAN_BADGES: Record<PlanId, string> = { free: '', boost: '⚡', mega: '👑' }

const EMPTY_AD = { title: '', description: '', image_url: '', link_url: '', type: 'feed' as AdType }

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'requests' | 'moderation' | 'users' | 'ads' | 'feedback'>('requests')

  // Plan requests
  const [requests, setRequests] = useState<PlanRequest[]>([])
  const [requestsFilter, setRequestsFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Users
  const [users, setUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  // Moderation
  const [moderationPosts, setModerationPosts] = useState<ModerationPost[]>([])
  const [moderationLoadingId, setModerationLoadingId] = useState<string | null>(null)
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([])
  const [feedbackLoadingId, setFeedbackLoadingId] = useState<number | null>(null)
  const [feedbackFilter, setFeedbackFilter] = useState<'new' | 'resolved'>('new')

  // Ads
  const [ads, setAds] = useState<Ad[]>([])
  const [adsFilter, setAdsFilter] = useState<'all' | 'popup' | 'feed'>('all')
  const [showAdForm, setShowAdForm] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [adForm, setAdForm] = useState(EMPTY_AD)
  const [savingAd, setSavingAd] = useState(false)
  const [uploadingAdImage, setUploadingAdImage] = useState(false)
  const adImageRef = useRef<HTMLInputElement>(null)

  useEffect(() => { checkAdmin() }, [])

  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'requests') fetchRequests()
    else if (activeTab === 'moderation') fetchModerationPosts()
    else if (activeTab === 'users') fetchUsers()
    else if (activeTab === 'ads') fetchAds()
    else if (activeTab === 'feedback') fetchFeedback()
  }, [isAdmin, activeTab, requestsFilter, feedbackFilter])

  async function fetchModerationPosts() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, author_id, moderation_reason, moderation_details, created_at, profiles(username, display_name, avatar_url)')
      .eq('moderation_status', 'review')
      .order('created_at', { ascending: false })

    if (!error && data) setModerationPosts(data as ModerationPost[])
  }

  async function fetchFeedback() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('feedback')
      .select('id, user_id, category, subject, message, status, created_at')
      .eq('status', feedbackFilter)
      .order('created_at', { ascending: false })

    if (!error && data) setFeedbackMessages(data as FeedbackMessage[])
  }

  async function handleFeedbackAction(feedbackId: number, action: 'resolved') {
    setFeedbackLoadingId(feedbackId)
    const supabase = createClient()
    const { error } = await supabase.from('feedback').update({ status: action }).eq('id', feedbackId)

    if (error) {
      toast.error('Erro ao atualizar o feedback.')
      setFeedbackLoadingId(null)
      return
    }

    await fetchFeedback()
    setFeedbackLoadingId(null)
    toast.success('Feedback marcado como resolvido.')
  }

  async function handleModerationAction(postId: string, action: 'approved' | 'rejected') {
    setModerationLoadingId(postId)
    const supabase = createClient()
    const { error } = await supabase.from('posts').update({
      moderation_status: action,
      moderation_reason: action === 'approved' ? 'Aprovado manualmente' : 'Rejeitado manualmente',
    }).eq('id', postId)

    if (error) {
      toast.error('Erro ao atualizar status de moderação.')
      setModerationLoadingId(null)
      return
    }

    await fetchModerationPosts()
    setModerationLoadingId(null)
    toast.success(action === 'approved' ? 'Post aprovado.' : 'Post rejeitado.')
  }

  async function checkAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) { router.push('/feed'); return }
    setAdminId(user.id)
    setIsAdmin(true)
    setLoading(false)
  }

  async function fetchRequests() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('plan_requests')
      .select('*, profiles (username, display_name, avatar_url, plan)')
      .eq('status', requestsFilter)
      .order('created_at', { ascending: false })
    if (!error && data) setRequests(data as PlanRequest[])
  }

  async function fetchUsers() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, plan, is_admin, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error && data) setUsers(data as Profile[])
  }

  async function fetchAds() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setAds(data as Ad[])
  }

  async function handleRequest(requestId: string, userId: string, plan: PlanId, action: 'approved' | 'rejected') {
    setProcessingId(requestId)
    const supabase = createClient()
    try {
      const { error: reqError } = await supabase.from('plan_requests').update({ status: action }).eq('id', requestId)
      if (reqError) throw reqError
      if (action === 'approved') {
        const { error: profileError } = await supabase.from('profiles').update({ plan }).eq('id', userId)
        if (profileError) throw profileError
        await supabase.from('notifications').insert({ user_id: userId, actor_id: adminId, type: 'plan_approved', plan })
      }
      toast.success(action === 'approved' ? '✓ Plano aprovado!' : 'Pedido rejeitado.')
      fetchRequests()
    } catch (err) { console.error(err); toast.error('Erro ao processar pedido.') }
    finally { setProcessingId(null) }
  }

  async function handleSetPlan(userId: string, plan: PlanId) {
    setUpdatingUser(userId)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId)
      if (error) throw error
      if (plan !== 'free') {
        await supabase.from('notifications').insert({ user_id: userId, actor_id: adminId, type: 'plan_approved', plan })
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
      toast.success(`Plano atualizado para ${plan.toUpperCase()}!`)
    } catch (err) { console.error(err); toast.error('Erro ao atualizar plano.') }
    finally { setUpdatingUser(null) }
  }

  // ── ADS ──────────────────────────────────────────────────────────────────

  async function handleAdImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return }
    setUploadingAdImage(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `ads/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('posts').upload(path, file, { upsert: false })
    if (error) { toast.error('Erro ao fazer upload da imagem'); setUploadingAdImage(false); return }
    const { data } = supabase.storage.from('posts').getPublicUrl(path)
    setAdForm(f => ({ ...f, image_url: data.publicUrl }))
    setUploadingAdImage(false)
    toast.success('Imagem enviada!')
  }

  async function handleSaveAd() {
    if (!adForm.title.trim()) { toast.error('Título é obrigatório'); return }
    if (!adForm.link_url.trim()) { toast.error('Link é obrigatório'); return }
    setSavingAd(true)
    const supabase = createClient()
    try {
      const payload = {
        title: adForm.title.trim(),
        description: adForm.description?.trim() || null,
        image_url: adForm.image_url?.trim() || null,
        link_url: adForm.link_url.trim(),
        type: adForm.type,
      }
      if (editingAd) {
        const { error } = await supabase.from('ads').update(payload).eq('id', editingAd.id)
        if (error) throw error
        toast.success('Anúncio atualizado!')
      } else {
        const { error } = await supabase.from('ads').insert({ ...payload, active: true })
        if (error) throw error
        toast.success('Anúncio criado!')
      }
      setShowAdForm(false)
      setEditingAd(null)
      setAdForm(EMPTY_AD)
      fetchAds()
    } catch (err) { console.error(err); toast.error('Erro ao salvar anúncio.') }
    finally { setSavingAd(false) }
  }

  async function handleToggleAd(ad: Ad) {
    const supabase = createClient()
    const { error } = await supabase.from('ads').update({ active: !ad.active }).eq('id', ad.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, active: !a.active } : a))
    toast.success(ad.active ? 'Anúncio pausado' : 'Anúncio ativado!')
  }

  async function handleDeleteAd(adId: string) {
    if (!confirm('Tem certeza que quer deletar esse anúncio?')) return
    const supabase = createClient()
    const { error } = await supabase.from('ads').delete().eq('id', adId)
    if (error) { toast.error('Erro ao deletar'); return }
    setAds(prev => prev.filter(a => a.id !== adId))
    toast.success('Anúncio deletado!')
  }

  function openEditAd(ad: Ad) {
    setEditingAd(ad)
    setAdForm({ title: ad.title, description: ad.description || '', image_url: ad.image_url || '', link_url: ad.link_url, type: ad.type })
    setShowAdForm(true)
  }

  function cancelAdForm() {
    setShowAdForm(false)
    setEditingAd(null)
    setAdForm(EMPTY_AD)
  }

  const filteredAds = ads.filter(a => adsFilter === 'all' || a.type === adsFilter)
  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#c8f23c', fontFamily: "'Syne', sans-serif", fontSize: 16 }}>Verificando acesso...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 100px', paddingLeft: 'max(24px, calc(220px + 32px))' }} className="admin-main">

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,242,60,0.08)', border: '1px solid rgba(200,242,60,0.2)', borderRadius: 50, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ color: '#c8f23c', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>🛡️ PAINEL ADMIN</span>
          </div>
          <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 32, margin: 0, letterSpacing: '-0.5px' }}>Administração VORTEX</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 4, marginBottom: 32, width: 'fit-content' }}>
          {(['requests', 'moderation', 'users', 'ads', 'feedback'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '9px 22px', borderRadius: 10, border: 'none',
              background: activeTab === tab ? 'rgba(200,242,60,0.12)' : 'transparent',
              color: activeTab === tab ? '#c8f23c' : '#555577',
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {tab === 'requests'
                ? '📋 Pedidos de Plano'
                : tab === 'moderation'
                ? '🛡️ Revisar Moderação'
                : tab === 'users'
                ? '👥 Usuários'
                : tab === 'feedback'
                ? '📝 SAC / Feedback'
                : '📢 Anúncios'}
            </button>
          ))}
        </div>

        {/* ── ABA PEDIDOS ── */}
        {activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['pending', 'approved', 'rejected'] as const).map(s => (
                <button key={s} onClick={() => setRequestsFilter(s)} style={{
                  padding: '7px 18px', borderRadius: 50, border: '1px solid',
                  borderColor: requestsFilter === s ? s === 'pending' ? 'rgba(255,200,0,0.4)' : s === 'approved' ? 'rgba(200,242,60,0.4)' : 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.06)',
                  background: requestsFilter === s ? s === 'pending' ? 'rgba(255,200,0,0.08)' : s === 'approved' ? 'rgba(200,242,60,0.08)' : 'rgba(255,68,68,0.08)' : 'transparent',
                  color: requestsFilter === s ? s === 'pending' ? '#ffc800' : s === 'approved' ? '#c8f23c' : '#ff4444' : '#555577',
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {s === 'pending' ? '⏳ Pendentes' : s === 'approved' ? '✓ Aprovados' : '✕ Rejeitados'}
                </button>
              ))}
            </div>

            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333355', fontSize: 14 }}>
                Nenhum pedido {requestsFilter === 'pending' ? 'pendente' : requestsFilter === 'approved' ? 'aprovado' : 'rejeitado'}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {requests.map(req => (
                  <div key={req.id} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a28', border: '2px solid rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      {req.profiles?.avatar_url
                        ? <Image src={req.profiles.avatar_url} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555577', fontSize: 18 }}>{req.profiles?.username?.[0]?.toUpperCase() || '?'}</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>{req.profiles?.display_name || req.profiles?.username}</span>
                        <span style={{ color: '#555577', fontSize: 13 }}>@{req.profiles?.username}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ color: PLAN_COLORS[req.profiles?.plan || 'free'], fontSize: 12, fontWeight: 600 }}>Plano atual: {req.profiles?.plan?.toUpperCase() || 'FREE'}</span>
                        <span style={{ color: '#333355', fontSize: 12 }}>→</span>
                        <span style={{ color: PLAN_COLORS[req.plan], fontSize: 12, fontWeight: 700 }}>{PLAN_BADGES[req.plan]} {req.plan.toUpperCase()}</span>
                        <span style={{ color: '#333355', fontSize: 11 }}>{new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8888aa', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>📎 Ver comprovante</a>
                    {requestsFilter === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleRequest(req.id, req.user_id, req.plan, 'rejected')} disabled={processingId === req.id} style={{ padding: '8px 18px', borderRadius: 50, border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)', color: '#ff4444', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: processingId === req.id ? 0.5 : 1 }}>✕ Rejeitar</button>
                        <button onClick={() => handleRequest(req.id, req.user_id, req.plan, 'approved')} disabled={processingId === req.id} style={{ padding: '8px 18px', borderRadius: 50, border: 'none', background: '#c8f23c', color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: processingId === req.id ? 0.5 : 1, boxShadow: '0 0 16px rgba(200,242,60,0.3)' }}>{processingId === req.id ? '...' : '✓ Aprovar'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA MODERAÇÃO ── */}
        {activeTab === 'moderation' && (
          <div>
            <div style={{ marginBottom: 24, color: '#8888aa', fontSize: 13 }}>
              Aqui você vê posts em estado <strong>review</strong>. Aprove ou rejeite manualmente para liberar ou ocultar o conteúdo.
            </div>

            {moderationPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333355', fontSize: 14 }}>
                Nenhum post aguardando revisão.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {moderationPosts.map(post => {
                  const authorProfile = post.profiles?.[0] || null
                  return (
                    <div key={post.id} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <h3 style={{ margin: 0, color: '#f0f0f8', fontSize: 16 }}>{post.title || 'Sem título'}</h3>
                          <div style={{ color: '#555577', fontSize: 12, marginTop: 4 }}>
                            {authorProfile ? `@${authorProfile.username}` : 'Usuário desconhecido'} · {new Date(post.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button onClick={() => handleModerationAction(post.id, 'rejected')} disabled={moderationLoadingId === post.id} style={{ padding: '9px 18px', borderRadius: 50, border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)', color: '#ff4444', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: moderationLoadingId === post.id ? 0.5 : 1 }}>✕ Rejeitar</button>
                          <button onClick={() => handleModerationAction(post.id, 'approved')} disabled={moderationLoadingId === post.id} style={{ padding: '9px 18px', borderRadius: 50, border: 'none', background: '#c8f23c', color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: moderationLoadingId === post.id ? 0.5 : 1, boxShadow: '0 0 16px rgba(200,242,60,0.3)' }}>✓ Aprovar</button>
                        </div>
                      </div>
                      <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{post.content || 'Sem conteúdo.'}</p>
                      {post.moderation_reason && (
                        <div style={{ color: '#555577', fontSize: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px' }}>
                          <strong>Motivo automático:</strong> {post.moderation_reason}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA FEEDBACK ── */}
        {activeTab === 'feedback' && (
          <div>
            <div style={{ marginBottom: 24, color: '#8888aa', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>Visualize e resolva mensagens enviadas pelo SAC / Feedback.</div>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                {(['new', 'resolved'] as const).map(status => (
                  <button key={status} onClick={() => setFeedbackFilter(status)} style={{
                    padding: '7px 18px', borderRadius: 50, border: '1px solid',
                    borderColor: feedbackFilter === status ? status === 'new' ? 'rgba(255,200,0,0.4)' : 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.06)',
                    background: feedbackFilter === status ? status === 'new' ? 'rgba(255,200,0,0.08)' : 'rgba(200,242,60,0.08)' : 'transparent',
                    color: feedbackFilter === status ? status === 'new' ? '#ffc800' : '#c8f23c' : '#555577',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {status === 'new' ? '🆕 Novos' : '✓ Resolvidos'}
                  </button>
                ))}
              </div>
            </div>

            {feedbackMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333355', fontSize: 14 }}>
                Nenhuma mensagem {feedbackFilter === 'new' ? 'nova' : 'resolvida'}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {feedbackMessages.map(item => (
                  <div key={item.id} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ color: '#f0f0f8', fontSize: 15, fontWeight: 700 }}>{item.subject || 'Sem assunto'}</span>
                          <span style={{ color: '#555577', fontSize: 12, fontWeight: 600 }}>{item.category}</span>
                        </div>
                        <div style={{ color: '#555577', fontSize: 12, marginTop: 4 }}>ID do usuário: {item.user_id || 'Anônimo'}</div>
                      </div>
                      <span style={{ color: item.status === 'new' ? '#ffc800' : '#c8f23c', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{item.status}</span>
                    </div>
                    <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <span style={{ color: '#555577', fontSize: 11 }}>{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                      {item.status === 'new' && (
                        <button onClick={() => handleFeedbackAction(item.id, 'resolved')} disabled={feedbackLoadingId === item.id} style={{ padding: '9px 18px', borderRadius: 50, border: 'none', background: '#c8f23c', color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: feedbackLoadingId === item.id ? 0.5 : 1, boxShadow: '0 0 16px rgba(200,242,60,0.3)' }}>
                          {feedbackLoadingId === item.id ? '...' : 'Marcar como resolvido'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA USUÁRIOS ── */}
        {activeTab === 'users' && (
          <div>
            <div style={{ marginBottom: 24, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#555577', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
              <input type="text" placeholder="Buscar por username ou nome..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ width: '100%', padding: '12px 16px 12px 44px', background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredUsers.map(user => (
                <div key={user.id} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a1a28', border: '2px solid rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    {user.avatar_url ? <Image src={user.avatar_url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555577', fontSize: 16 }}>{user.username?.[0]?.toUpperCase() || '?'}</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>{user.display_name || user.username}</span>
                      <span style={{ color: '#555577', fontSize: 12 }}>@{user.username}</span>
                      {user.is_admin && <span style={{ background: 'rgba(200,242,60,0.1)', border: '1px solid rgba(200,242,60,0.2)', color: '#c8f23c', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>ADMIN</span>}
                    </div>
                    <div style={{ color: PLAN_COLORS[user.plan || 'free'], fontSize: 11, fontWeight: 600, marginTop: 2 }}>{PLAN_BADGES[user.plan || 'free']} {(user.plan || 'free').toUpperCase()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['free', 'boost', 'mega'] as PlanId[]).map(p => (
                      <button key={p} onClick={() => user.plan !== p && handleSetPlan(user.id, p)} disabled={updatingUser === user.id} style={{ padding: '6px 14px', borderRadius: 50, border: `1px solid ${user.plan === p ? PLAN_COLORS[p] : 'rgba(255,255,255,0.08)'}`, background: user.plan === p ? `rgba(${p === 'boost' ? '200,242,60' : p === 'mega' ? '167,139,250' : '136,136,170'},0.12)` : 'transparent', color: user.plan === p ? PLAN_COLORS[p] : '#555577', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, cursor: user.plan === p ? 'default' : 'pointer', opacity: updatingUser === user.id ? 0.5 : 1 }}>
                        {PLAN_BADGES[p]} {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#333355', fontSize: 14 }}>Nenhum usuário encontrado.</div>}
            </div>
          </div>
        )}

        {/* ── ABA ANÚNCIOS ── */}
        {activeTab === 'ads' && (
          <div>
            {/* Header da aba */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'feed', 'popup'] as const).map(f => (
                  <button key={f} onClick={() => setAdsFilter(f)} style={{
                    padding: '7px 16px', borderRadius: 50, border: '1px solid',
                    borderColor: adsFilter === f ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.06)',
                    background: adsFilter === f ? 'rgba(200,242,60,0.08)' : 'transparent',
                    color: adsFilter === f ? '#c8f23c' : '#555577',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>
                    {f === 'all' ? 'Todos' : f === 'feed' ? '📰 Feed' : '💬 Popup'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setEditingAd(null); setAdForm(EMPTY_AD); setShowAdForm(true) }} style={{ padding: '9px 20px', borderRadius: 50, border: 'none', background: '#c8f23c', color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 16px rgba(200,242,60,0.3)' }}>
                + Novo anúncio
              </button>
            </div>

            {/* Formulário de criação/edição */}
            {showAdForm && (
              <div style={{ background: '#111118', border: '1px solid rgba(200,242,60,0.2)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <h3 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 16, margin: '0 0 20px' }}>
                  {editingAd ? '✏️ Editar anúncio' : '+ Novo anúncio'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Tipo */}
                  <div>
                    <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>TIPO</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['feed', 'popup'] as AdType[]).map(t => (
                        <button key={t} onClick={() => setAdForm(f => ({ ...f, type: t }))} style={{
                          padding: '8px 20px', borderRadius: 50, border: '1px solid',
                          borderColor: adForm.type === t ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.08)',
                          background: adForm.type === t ? 'rgba(200,242,60,0.1)' : 'transparent',
                          color: adForm.type === t ? '#c8f23c' : '#555577',
                          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>
                          {t === 'feed' ? '📰 Entre posts (feed)' : '💬 Pop-up'}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: '#444466', fontSize: 11, marginTop: 6 }}>
                      {adForm.type === 'feed' ? 'Aparece entre posts no feed, a cada 40 posts.' : 'Aparece como pop-up ao entrar no site (1x por sessão).'}
                    </p>
                  </div>

                  {/* Título */}
                  <div>
                    <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>TÍTULO *</label>
                    <input value={adForm.title} onChange={e => setAdForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Conheça o produto X" style={{ width: '100%', padding: '10px 14px', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIÇÃO</label>
                    <textarea value={adForm.description} onChange={e => setAdForm(f => ({ ...f, description: e.target.value }))} placeholder="Texto opcional do anúncio..." rows={2} style={{ width: '100%', padding: '10px 14px', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {/* Imagem */}
                  <div>
                    <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>IMAGEM</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => adImageRef.current?.click()} disabled={uploadingAdImage} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#8888aa', fontFamily: "'Syne', sans-serif", fontSize: 12, cursor: 'pointer' }}>
                        {uploadingAdImage ? '⏳ Enviando...' : '📎 Upload imagem'}
                      </button>
                      {adForm.image_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 48, height: 32, position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Image src={adForm.image_url} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
                          </div>
                          <button onClick={() => setAdForm(f => ({ ...f, image_url: '' }))} style={{ background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                      )}
                    </div>
                    <input ref={adImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAdImageUpload} />
                  </div>

                  {/* Link */}
                  <div>
                    <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>LINK DE DESTINO *</label>
                    <input value={adForm.link_url} onChange={e => setAdForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://exemplo.com" style={{ width: '100%', padding: '10px 14px', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {/* Botões */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={cancelAdForm} style={{ padding: '10px 20px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8888aa', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleSaveAd} disabled={savingAd} style={{ padding: '10px 24px', borderRadius: 50, border: 'none', background: '#c8f23c', color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 16px rgba(200,242,60,0.3)', opacity: savingAd ? 0.6 : 1 }}>
                      {savingAd ? '⏳ Salvando...' : editingAd ? '✓ Salvar alterações' : '✓ Criar anúncio'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de anúncios */}
            {filteredAds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333355', fontSize: 14 }}>
                {showAdForm ? '' : 'Nenhum anúncio ainda. Clique em "+ Novo anúncio" para começar.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredAds.map(ad => (
                  <div key={ad.id} style={{ background: '#111118', border: `1px solid ${ad.active ? 'rgba(200,242,60,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: ad.active ? 1 : 0.6 }}>

                    {/* Imagem preview */}
                    {ad.image_url ? (
                      <div style={{ width: 64, height: 44, position: 'relative', borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Image src={ad.image_url} alt="" fill sizes="64px" style={{ objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: 64, height: 44, borderRadius: 8, background: '#1a1a28', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {ad.type === 'popup' ? '💬' : '📰'}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>{ad.title}</span>
                        <span style={{ background: ad.type === 'popup' ? 'rgba(96,165,250,0.12)' : 'rgba(200,242,60,0.08)', border: `1px solid ${ad.type === 'popup' ? 'rgba(96,165,250,0.3)' : 'rgba(200,242,60,0.2)'}`, color: ad.type === 'popup' ? '#60a5fa' : '#c8f23c', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>
                          {ad.type === 'popup' ? 'POP-UP' : 'FEED'}
                        </span>
                        <span style={{ background: ad.active ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${ad.active ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`, color: ad.active ? '#34d399' : '#555577', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>
                          {ad.active ? '● ATIVO' : '○ PAUSADO'}
                        </span>
                      </div>
                      {ad.description && <p style={{ color: '#8888aa', fontSize: 12, margin: '0 0 4px' }}>{ad.description}</p>}
                      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#555577', fontSize: 11, textDecoration: 'none' }}>🔗 {ad.link_url}</a>
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => openEditAd(ad)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#8888aa', fontFamily: "'Syne', sans-serif", fontSize: 12, cursor: 'pointer' }}>✏️ Editar</button>
                      <button onClick={() => handleToggleAd(ad)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${ad.active ? 'rgba(255,200,0,0.3)' : 'rgba(52,211,153,0.3)'}`, background: ad.active ? 'rgba(255,200,0,0.06)' : 'rgba(52,211,153,0.06)', color: ad.active ? '#ffc800' : '#34d399', fontFamily: "'Syne', sans-serif", fontSize: 12, cursor: 'pointer' }}>
                        {ad.active ? '⏸ Pausar' : '▶ Ativar'}
                      </button>
                      <button onClick={() => handleDeleteAd(ad.id)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.04)', color: '#ff4444', fontFamily: "'Syne', sans-serif", fontSize: 12, cursor: 'pointer' }}>🗑 Deletar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        @media (max-width: 767px) { .admin-main { padding-left: 24px !important; } }
      `}</style>
    </div>
  )
}