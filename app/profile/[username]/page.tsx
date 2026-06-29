'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Nav from '../../components/Nav'

type PlanId = 'free' | 'boost' | 'mega'

type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  created_at: string
  plan: PlanId
  accent_color: string | null
}

type Post = {
  id: string
  title: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
}

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  role: string
}

type Tab = 'posts' | 'communities'

const PLAN_LIMITS: Record<PlanId, { avatar: number; banner: number; label: string }> = {
  free:  { avatar: 2,  banner: 2,  label: '2MB' },
  boost: { avatar: 10, banner: 10, label: '10MB' },
  mega:  { avatar: 50, banner: 50, label: '50MB' },
}

const ACCENT_COLORS = [
  '#c8f23c', '#a78bfa', '#60a5fa', '#f472b6', '#fb923c',
  '#34d399', '#f87171', '#facc15', '#22d3ee', '#e879f9',
]

function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)
}

function isGif(url: string) {
  return /\.gif(\?|$)/i.test(url)
}

function PlanBadge({ plan }: { plan: PlanId }) {
  if (plan === 'boost') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(200,242,60,0.12)', border: '1px solid rgba(200,242,60,0.3)',
      color: '#c8f23c', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 50,
      boxShadow: '0 0 8px rgba(200,242,60,0.2)',
    }}>⚡ BOOST</span>
  )
  if (plan === 'mega') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)',
      color: '#a78bfa', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 50,
      boxShadow: '0 0 8px rgba(167,139,250,0.2)',
    }}>👑 MEGA</span>
  )
  return null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('posts')

  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerIsVideo, setBannerIsVideo] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const [accentColor, setAccentColor] = useState<string>('#c8f23c')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const username = params.username as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('username', username).single()

      if (!profileData) { setLoading(false); return }

      setProfile(profileData)
      setDisplayName(profileData.display_name || '')
      setBio(profileData.bio || '')
      setAccentColor(profileData.accent_color || '#c8f23c')
      setIsOwner(user?.id === profileData.id)

      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
      ])
      setFollowersCount(followers || 0)
      setFollowingCount(following || 0)

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows').select('follower_id')
          .eq('follower_id', user.id).eq('following_id', profileData.id).single()
        setIsFollowing(!!followData)
      }

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, likes_count, comments_count, created_at')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false })
      setPosts(postsData || [])

      const { data: memberData } = await supabase
        .from('community_members')
        .select('role, community:community_id(id, name, slug, description)')
        .eq('user_id', profileData.id)
      if (memberData) {
        setCommunities(memberData.map((m: any) => ({ ...m.community, role: m.role })))
      }

      setLoading(false)
    }
    load()
  }, [username])

  async function handleFollow() {
    if (!currentUserId) { router.push('/login'); return }
    if (!profile) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowersCount(c => c - 1)
      toast('Você deixou de seguir @' + profile.username)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      setIsFollowing(true)
      setFollowersCount(c => c + 1)
      toast.success('Seguindo @' + profile.username)
    }
    setFollowLoading(false)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const plan = profile?.plan || 'free'
    const limitMB = PLAN_LIMITS[plan].avatar

    // GIF só para MEGA
    if (file.type === 'image/gif' && plan !== 'mega') {
      toast.error('GIF no avatar é exclusivo do plano 👑 MEGA BOOST!')
      return
    }

    if (file.size > limitMB * 1024 * 1024) {
      toast.error(`Avatar deve ter no máximo ${limitMB}MB (plano ${plan.toUpperCase()})`)
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const plan = profile?.plan || 'free'
    const limitMB = PLAN_LIMITS[plan].banner
    const isVid = file.type.startsWith('video/')
    const isGifFile = file.type === 'image/gif'

    // Vídeo/GIF no banner só para MEGA
    if ((isVid || isGifFile) && plan !== 'mega') {
      toast.error('Vídeo e GIF no banner são exclusivos do plano 👑 MEGA BOOST!')
      return
    }

    // Limite de vídeo no banner: usa limite de banner (50MB para MEGA)
    const videoLimitMB = plan === 'mega' ? 50 : limitMB
    const effectiveLimit = isVid ? videoLimitMB : limitMB

    if (file.size > effectiveLimit * 1024 * 1024) {
      toast.error(`Banner deve ter no máximo ${effectiveLimit}MB (plano ${plan.toUpperCase()})`)
      return
    }

    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setBannerIsVideo(isVid)
  }

  async function uploadFile(file: File, bucket: string, userId: string, filename?: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${filename || 'photo'}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    let avatar_url = profile.avatar_url
    let banner_url = profile.banner_url

    if (avatarFile) {
      setUploadingAvatar(true)
      // Nome do arquivo diferente para GIF vs imagem estática
      const filename = avatarFile.type === 'image/gif' ? 'avatar_gif' : 'photo'
      const url = await uploadFile(avatarFile, 'avatars', profile.id, filename)
      if (url) avatar_url = url
      setUploadingAvatar(false)
    }

    if (bannerFile) {
      setUploadingBanner(true)
      const isVid = bannerFile.type.startsWith('video/')
      const isGifFile = bannerFile.type === 'image/gif'
      const bucket = isVid ? 'media' : 'banners'
      const filename = isVid ? 'banner_video' : isGifFile ? 'banner_gif' : 'photo'
      const url = await uploadFile(bannerFile, bucket, profile.id, filename)
      if (url) banner_url = url
      setUploadingBanner(false)
    }

    const updateData: any = { display_name: displayName, bio, avatar_url, banner_url }
    if (profile.plan === 'boost' || profile.plan === 'mega') {
      updateData.accent_color = accentColor
    }

    await supabase.from('profiles').update(updateData).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, display_name: displayName, bio, avatar_url, banner_url, accent_color: accentColor } : prev)
    setAvatarFile(null); setBannerFile(null)
    setAvatarPreview(null); setBannerPreview(null)
    setBannerIsVideo(false)
    setEditMode(false); setSaving(false)
    toast.success('Perfil atualizado!')
  }

  function handleCancel() {
    setEditMode(false)
    setAvatarFile(null); setBannerFile(null)
    setAvatarPreview(null); setBannerPreview(null)
    setBannerIsVideo(false)
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setAccentColor(profile?.accent_color || '#c8f23c')
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  const currentAvatar = avatarPreview || profile?.avatar_url
  const currentBanner = bannerPreview || profile?.banner_url
  const plan = profile?.plan || 'free'
  const limitLabel = PLAN_LIMITS[plan].label
  const hasAccent = plan === 'boost' || plan === 'mega'
  const isMega = plan === 'mega'

  const activeColor = hasAccent && profile?.accent_color
    ? profile.accent_color
    : plan === 'mega' ? '#a78bfa' : '#c8f23c'

  const previewColor = hasAccent ? accentColor : activeColor
  const planBorderColor = hasAccent ? `${previewColor}55` : 'rgba(255,255,255,0.08)'
  const planGlow = hasAccent ? `0 0 30px ${previewColor}22` : 'none'

  // Determina se o banner atual é vídeo ou GIF animado
  const currentBannerIsVideo = bannerIsVideo || (currentBanner ? isVideo(currentBanner) : false)
  const currentBannerIsGif = !bannerIsVideo && (currentBanner ? isGif(currentBanner) : false)

  // Accept do input de avatar por plano
  const avatarAccept = isMega ? 'image/*' : 'image/jpeg,image/png,image/webp'
  // Accept do input de banner por plano
  const bannerAccept = isMega
    ? 'image/*,video/mp4,video/webm,video/quicktime'
    : 'image/jpeg,image/png,image/webp'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Carregando...</p>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Usuário não encontrado.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${activeColor}33`,
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 'max(16px, calc(220px + 32px))' }}>
          <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}>
            ← Voltar
          </button>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>@{profile.username}</span>
          {plan !== 'free' && <PlanBadge plan={plan} />}
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', paddingLeft: 'max(16px, calc(220px + 32px))', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: '#111118',
          border: `1px solid ${planBorderColor}`,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: planGlow,
          transition: 'box-shadow 0.3s, border-color 0.3s',
        }}>
          {/* Faixa de cor no topo */}
          {hasAccent && (
            <div style={{
              height: 3,
              background: `linear-gradient(90deg, transparent, ${previewColor}88, transparent)`,
              transition: 'background 0.3s',
            }} />
          )}

          {/* Banner */}
          <div
            onClick={() => editMode && bannerInputRef.current?.click()}
            style={{
              height: 120, position: 'relative',
              cursor: editMode ? 'pointer' : 'default',
              overflow: 'hidden',
              background: currentBanner ? 'none'
                : hasAccent
                ? `linear-gradient(135deg, ${previewColor}22, ${previewColor}08)`
                : 'linear-gradient(135deg, rgba(200,242,60,0.1), rgba(200,242,60,0.03))',
              borderBottom: `1px solid ${planBorderColor}`,
              transition: 'background 0.3s',
            }}
          >
            {/* Renderiza vídeo, GIF ou imagem no banner */}
            {currentBanner && currentBannerIsVideo ? (
              <video
                src={currentBanner}
                autoPlay loop muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : currentBanner ? (
              <img src={currentBanner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : null}

            {editMode && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 18 }}>🖼️</span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                  {uploadingBanner ? 'Enviando...' : isMega ? 'Alterar banner (imagem, GIF ou vídeo)' : 'Alterar banner'}
                </span>
                {isMega && !uploadingBanner && (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>👑 GIF e vídeo disponíveis no seu plano</span>
                )}
              </div>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept={bannerAccept}
              style={{ display: 'none' }}
              onChange={handleBannerChange}
            />
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -52, marginBottom: 16 }}>
              {/* Avatar */}
              <div
                onClick={() => editMode && avatarInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: currentAvatar ? 'none'
                    : hasAccent
                    ? `linear-gradient(135deg, ${previewColor}, ${previewColor}99)`
                    : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 800, fontSize: 30,
                  border: `4px solid #111118`,
                  boxShadow: hasAccent ? `0 0 20px ${previewColor}66` : '0 0 10px rgba(200,242,60,0.15)',
                  cursor: editMode ? 'pointer' : 'default',
                  position: 'relative', overflow: 'hidden', flexShrink: 0,
                  transition: 'box-shadow 0.3s',
                }}
              >
                {/* GIF no avatar usa img tag (anima normalmente) */}
                {currentAvatar
                  ? <img src={currentAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : profile.username.charAt(0).toUpperCase()
                }
                {editMode && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <span style={{ fontSize: 16 }}>📷</span>
                    {isMega && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>GIF OK</span>}
                  </div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept={avatarAccept}
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>

              {isOwner && !editMode && (
                <button onClick={() => setEditMode(true)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8888aa', padding: '7px 16px', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}66`; e.currentTarget.style.color = activeColor }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' }}
                >
                  Editar perfil
                </button>
              )}
              {isOwner && editMode && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCancel} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8888aa', padding: '7px 14px', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif" }}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ background: previewColor, color: '#000', fontWeight: 700, padding: '7px 16px', borderRadius: 50, border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif", boxShadow: `0 0 12px ${previewColor}55`, opacity: saving ? 0.7 : 1, transition: 'background 0.3s' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
              {!isOwner && (
                <button
                  onClick={handleFollow} disabled={followLoading}
                  style={{
                    background: isFollowing ? 'transparent' : activeColor,
                    border: isFollowing ? '1px solid rgba(255,255,255,0.12)' : 'none',
                    color: isFollowing ? '#8888aa' : '#000',
                    padding: '7px 18px', borderRadius: 50, cursor: followLoading ? 'wait' : 'pointer',
                    fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif",
                    transition: 'all 0.2s', opacity: followLoading ? 0.6 : 1,
                    boxShadow: isFollowing ? 'none' : `0 0 12px ${activeColor}55`,
                  }}
                  onMouseEnter={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'rgba(255,60,60,0.4)'; e.currentTarget.style.color = '#ff6060' } }}
                  onMouseLeave={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' } }}
                >
                  {followLoading ? '...' : isFollowing ? 'Seguindo ✓' : 'Seguir'}
                </button>
              )}
            </div>

            {editMode && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: '#555577', fontSize: 12, margin: 0 }}>
                  Clique no avatar ou banner para alterar • Máx. {limitLabel} (plano {plan.toUpperCase()})
                </p>
                {isMega && (
                  <p style={{ color: '#a78bfa', fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>
                    👑 MEGA: avatar aceita GIF • banner aceita GIF e vídeo (MP4/WebM)
                  </p>
                )}
              </div>
            )}

            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nome de exibição"
                  style={{ background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14, outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', width: '100%' }}
                  onFocus={e => (e.target.style.borderColor = `${previewColor}66`)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio..." rows={3}
                  style={{ background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14, outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none', boxSizing: 'border-box', width: '100%' }}
                  onFocus={e => (e.target.style.borderColor = `${previewColor}66`)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />

                {/* Seletor de cor — só BOOST/MEGA */}
                {hasAccent && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ color: '#8888aa', fontSize: 12, fontWeight: 600 }}>🎨 Cor de destaque</span>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: previewColor, border: '2px solid rgba(255,255,255,0.2)', boxShadow: `0 0 8px ${previewColor}88`, transition: 'background 0.2s' }} />
                      <span style={{ color: previewColor, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{previewColor}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {ACCENT_COLORS.map(color => (
                        <button key={color} onClick={() => setAccentColor(color)} style={{
                          width: 28, height: 28, borderRadius: '50%', background: color, cursor: 'pointer', flexShrink: 0,
                          border: accentColor === color ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                          boxShadow: accentColor === color ? `0 0 10px ${color}` : 'none', transition: 'all 0.15s',
                        }} title={color} />
                      ))}
                      <label style={{ position: 'relative', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a28', flexShrink: 0 }} title="Cor personalizada">
                        <span style={{ fontSize: 14 }}>+</span>
                        <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                      </label>
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${previewColor}44`, background: `${previewColor}08`, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s' }}>
                      <span style={{ fontSize: 13 }}>👁️</span>
                      <span style={{ color: previewColor, fontSize: 12, fontWeight: 600 }}>Preview: bordas, avatar e destaques ficarão nessa cor</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 20, margin: 0 }}>
                    {profile.display_name || profile.username}
                  </h1>
                  <PlanBadge plan={plan} />
                </div>
                <p style={{ color: '#555577', fontSize: 14, marginBottom: 8 }}>@{profile.username}</p>
                {profile.bio && <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>}
                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                  <span onClick={() => router.push(`/profile/${profile.username}/follows?tab=followers`)} style={{ color: '#555577', fontSize: 13, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = activeColor)} onMouseLeave={e => (e.currentTarget.style.color = '#555577')}>
                    <span style={{ color: '#f0f0f8', fontWeight: 700 }}>{followersCount}</span> seguidores
                  </span>
                  <span onClick={() => router.push(`/profile/${profile.username}/follows?tab=following`)} style={{ color: '#555577', fontSize: 13, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = activeColor)} onMouseLeave={e => (e.currentTarget.style.color = '#555577')}>
                    <span style={{ color: '#f0f0f8', fontWeight: 700 }}>{followingCount}</span> seguindo
                  </span>
                  <span style={{ color: '#555577', fontSize: 13 }}>
                    <span style={{ color: '#f0f0f8', fontWeight: 700 }}>{posts.length}</span> posts
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#111118', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['posts', 'communities'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: tab === t ? `${activeColor}22` : 'transparent',
              color: tab === t ? activeColor : '#555577',
            }}>
              {t === 'posts' ? `Posts (${posts.length})` : `Comunidades (${communities.length})`}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <>
            {posts.length === 0 && <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>Nenhuma publicação ainda.</p>}
            {posts.map(post => (
              <article key={post.id} onClick={() => router.push(`/post/${post.id}`)}
                style={{ background: '#111118', border: hasAccent ? `1px solid ${activeColor}33` : '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}66`; e.currentTarget.style.boxShadow = `0 0 20px ${activeColor}11` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = hasAccent ? `${activeColor}33` : 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{post.title}</h2>
                {post.content && (
                  <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                    {post.content}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ color: '#333355', fontSize: 12 }}>▲ {post.likes_count}</span>
                  <span style={{ color: '#333355', fontSize: 12 }}>💬 {post.comments_count}</span>
                  <span style={{ color: '#333355', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
                </div>
              </article>
            ))}
          </>
        )}

        {tab === 'communities' && (
          <>
            {communities.length === 0 && <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>Nenhuma comunidade ainda.</p>}
            {communities.map(c => (
              <div key={c.id} onClick={() => router.push(`/community/${c.slug}`)}
                style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}44`; e.currentTarget.style.boxShadow = `0 0 20px ${activeColor}08` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: hasAccent ? `linear-gradient(135deg, ${activeColor}, ${activeColor}88)` : 'linear-gradient(135deg, #c8f23c, #8ab82a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 18, boxShadow: `0 0 10px ${activeColor}44` }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>v/{c.name}</h2>
                    {c.role === 'owner' && <span style={{ background: `${activeColor}22`, color: activeColor, fontSize: 10, padding: '2px 8px', borderRadius: 50, fontWeight: 700 }}>dono</span>}
                  </div>
                  {c.description && <p style={{ color: '#8888aa', fontSize: 13, marginTop: 3 }}>{c.description}</p>}
                </div>
                <span style={{ color: '#333355', fontSize: 18 }}>→</span>
              </div>
            ))}
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder, textarea::placeholder { color: #333355; }
        @media (max-width: 767px) { main, header > div { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}