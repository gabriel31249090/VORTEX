'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
type CropTarget = 'avatar' | 'banner' | null

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

function PlanBadge({ plan }: { plan: PlanId }) {
  if (plan === 'boost') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(200,242,60,0.12)', border: '1px solid rgba(200,242,60,0.3)', color: '#c8f23c', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 50, boxShadow: '0 0 8px rgba(200,242,60,0.2)' }}>⚡ BOOST</span>
  )
  if (plan === 'mega') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 50, boxShadow: '0 0 8px rgba(167,139,250,0.2)' }}>👑 MEGA</span>
  )
  return null
}

// ── CROP MODAL ──────────────────────────────────────────────────────────────
function CropModal({
  src, target, accentColor, onConfirm, onCancel,
}: {
  src: string
  target: CropTarget
  accentColor: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const isAvatar = target === 'avatar'
  const OUT_W = isAvatar ? 400 : 1200
  const OUT_H = isAvatar ? 400 : 400

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 })
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 1, h: 1 })
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const CROP_W = isAvatar ? 220 : 460
  const CROP_H = isAvatar ? 220 : 154

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      const scaleX = CROP_W / img.naturalWidth
      const scaleY = CROP_H / img.naturalHeight
      const initZoom = Math.max(scaleX, scaleY)
      setZoom(initZoom)
      setImgDisplaySize({ w: img.naturalWidth * initZoom, h: img.naturalHeight * initZoom })
      setPos({ x: 0, y: 0 })
    }
    img.src = src
  }, [src])

  useEffect(() => {
    setImgDisplaySize({ w: imgNaturalSize.w * zoom, h: imgNaturalSize.h * zoom })
  }, [zoom, imgNaturalSize])

  function clamp(p: { x: number; y: number }, dw: number, dh: number) {
    const maxX = 0
    const minX = CROP_W - dw
    const maxY = 0
    const minY = CROP_H - dh
    return {
      x: Math.min(maxX, Math.max(minX, p.x)),
      y: Math.min(maxY, Math.max(minY, p.y)),
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    const newPos = clamp(
      { x: dragStart.current.px + dx, y: dragStart.current.py + dy },
      imgDisplaySize.w, imgDisplaySize.h
    )
    setPos(newPos)
  }

  function onMouseUp() { setDragging(false) }

  const lastTouch = useRef({ x: 0, y: 0 })
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    lastTouch.current = { x: t.clientX, y: t.clientY }
    dragStart.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y }
    setDragging(true)
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const t = e.touches[0]
    const dx = t.clientX - dragStart.current.mx
    const dy = t.clientY - dragStart.current.my
    const newPos = clamp(
      { x: dragStart.current.px + dx, y: dragStart.current.py + dy },
      imgDisplaySize.w, imgDisplaySize.h
    )
    setPos(newPos)
  }
  function onTouchEnd() { setDragging(false) }

  function handleZoom(val: number) {
    const minZoom = Math.max(CROP_W / imgNaturalSize.w, CROP_H / imgNaturalSize.h)
    const newZoom = Math.max(minZoom, Math.min(4, val))
    const newDW = imgNaturalSize.w * newZoom
    const newDH = imgNaturalSize.h * newZoom
    setZoom(newZoom)
    setPos(p => clamp(p, newDW, newDH))
  }

  function handleConfirm() {
    const canvas = document.createElement('canvas')
    canvas.width = OUT_W
    canvas.height = OUT_H
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      const scaleToNatural = imgNaturalSize.w / imgDisplaySize.w
      const srcX = (-pos.x) * scaleToNatural
      const srcY = (-pos.y) * scaleToNatural
      const srcW = CROP_W * scaleToNatural
      const srcH = CROP_H * scaleToNatural

      if (isAvatar) {
        ctx.beginPath()
        ctx.arc(OUT_W / 2, OUT_H / 2, OUT_W / 2, 0, Math.PI * 2)
        ctx.clip()
      }
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H)
      canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.92)
    }
    img.src = src
  }

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#111118', border: `1px solid ${accentColor}44`,
        borderRadius: 20, padding: 24, zIndex: 301,
        width: Math.max(CROP_W + 48, 340), fontFamily: "'Syne', sans-serif",
        boxShadow: `0 0 40px ${accentColor}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 15, margin: 0 }}>
            {isAvatar ? '📷 Ajustar foto de perfil' : '🖼️ Ajustar banner'}
          </h3>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <p style={{ color: '#555577', fontSize: 12, marginBottom: 14 }}>
          Arraste para reposicionar • Use o slider para dar zoom
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width: CROP_W, height: CROP_H,
              borderRadius: isAvatar ? '50%' : 12,
              overflow: 'hidden',
              cursor: dragging ? 'grabbing' : 'grab',
              position: 'relative',
              border: `2px solid ${accentColor}66`,
              boxShadow: `0 0 20px ${accentColor}33`,
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <img
              ref={imgRef}
              src={src}
              draggable={false}
              style={{
                position: 'absolute',
                left: pos.x, top: pos.y,
                width: imgDisplaySize.w,
                height: imgDisplaySize.h,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ color: '#555577', fontSize: 16 }}>🔍</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.01}
            value={zoom}
            onChange={e => handleZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor }}
          />
          <span style={{ color: '#555577', fontSize: 12, minWidth: 36 }}>{Math.round(zoom * 100)}%</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8888aa', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 50, border: 'none', background: accentColor, color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: `0 0 16px ${accentColor}44` }}>
            ✓ Confirmar
          </button>
        </div>
      </div>
    </>
  )
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
  const [messageLoading, setMessageLoading] = useState(false)

  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedByThem, setBlockedByThem] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null)
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerIsVideo, setBannerIsVideo] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<CropTarget>(null)
  const [pendingAvatarSrc, setPendingAvatarSrc] = useState<string | null>(null)
  const [pendingBannerSrc, setPendingBannerSrc] = useState<string | null>(null)

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

        const { data: blockRows } = await supabase
          .from('blocked_users')
          .select('blocker_id, blocked_id')
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${profileData.id}),and(blocker_id.eq.${profileData.id},blocked_id.eq.${user.id})`)
        const rows = blockRows || []
        setIsBlocked(rows.some((r: any) => r.blocker_id === user.id))
        setBlockedByThem(rows.some((r: any) => r.blocker_id === profileData.id))
      }

      const { data: postsData } = await supabase
        .from('posts').select('id, title, content, likes_count, comments_count, created_at')
        .eq('author_id', profileData.id)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
      setPosts(postsData || [])

      const { data: memberData } = await supabase
        .from('community_members').select('role, community:community_id(id, name, slug, description)')
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
      setIsFollowing(false); setFollowersCount(c => c - 1)
      toast('Você deixou de seguir @' + profile.username)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      setIsFollowing(true); setFollowersCount(c => c + 1)
      toast.success('Seguindo @' + profile.username)
    }
    setFollowLoading(false)
  }

  async function handleBlock() {
    if (!currentUserId || !profile) return
    setBlockLoading(true)
    if (isBlocked) {
      await supabase.from('blocked_users').delete()
        .eq('blocker_id', currentUserId).eq('blocked_id', profile.id)
      setIsBlocked(false)
      toast('Você desbloqueou @' + profile.username)
    } else {
      const { error } = await supabase.from('blocked_users')
        .insert({ blocker_id: currentUserId, blocked_id: profile.id })
      if (error) {
        toast.error('Não foi possível bloquear esse usuário.')
        setBlockLoading(false)
        return
      }
      // Bloquear desfaz o "seguir" nos dois sentidos, pra não sobrar rastro
      await supabase.from('follows').delete()
        .or(`and(follower_id.eq.${currentUserId},following_id.eq.${profile.id}),and(follower_id.eq.${profile.id},following_id.eq.${currentUserId})`)
      setIsFollowing(false)
      setIsBlocked(true)
      toast.success('Você bloqueou @' + profile.username)
    }
    setShowMoreMenu(false)
    setBlockLoading(false)
  }

  // Fecha o menu "···" ao clicar fora dele
  useEffect(() => {
    if (!showMoreMenu) return
    function onClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showMoreMenu])

  // Busca conversa 1:1 existente com esse usuário, ou cria uma nova, e navega até ela
  async function handleMessage() {
    if (!currentUserId) { router.push('/login'); return }
    if (!profile) return
    if (isBlocked || blockedByThem) {
      toast.error('Você não pode enviar mensagem pra esse usuário.')
      return
    }
    setMessageLoading(true)

    try {
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const myConvIds = (myConvs || []).map((c: any) => c.conversation_id)

      if (myConvIds.length > 0) {
        const { data: sharedConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id, conversations!inner(is_group)')
          .eq('user_id', profile.id)
          .in('conversation_id', myConvIds)

        const existing = (sharedConvs || []).find((c: any) => c.conversations?.is_group === false)
        if (existing) {
          router.push(`/messages/${existing.conversation_id}`)
          return
        }
      }

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ is_group: false, created_by: currentUserId })
        .select('id')
        .single()

      if (error || !newConv) { toast.error('Erro ao iniciar conversa.'); return }

      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: currentUserId },
        { conversation_id: newConv.id, user_id: profile.id },
      ])

      router.push(`/messages/${newConv.id}`)
    } finally {
      setMessageLoading(false)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const plan = profile?.plan || 'free'
    const limitMB = PLAN_LIMITS[plan].avatar

    if (file.type === 'image/gif' && plan !== 'mega') {
      toast.error('GIF no avatar é exclusivo do plano 👑 MEGA BOOST!'); return
    }
    if (file.size > limitMB * 1024 * 1024) {
      toast.error(`Avatar deve ter no máximo ${limitMB}MB (plano ${plan.toUpperCase()})`); return
    }

    if (file.type === 'image/gif') {
      setAvatarBlob(file)
      setAvatarPreview(URL.createObjectURL(file))
      return
    }

    const url = URL.createObjectURL(file)
    setPendingAvatarSrc(url)
    setCropSrc(url)
    setCropTarget('avatar')
    e.target.value = ''
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const plan = profile?.plan || 'free'
    const limitMB = PLAN_LIMITS[plan].banner
    const isVid = file.type.startsWith('video/')
    const isGifFile = file.type === 'image/gif'

    if ((isVid || isGifFile) && plan !== 'mega') {
      toast.error('Vídeo e GIF no banner são exclusivos do plano 👑 MEGA BOOST!'); return
    }

    const effectiveLimit = isVid ? (plan === 'mega' ? 50 : limitMB) : limitMB
    if (file.size > effectiveLimit * 1024 * 1024) {
      toast.error(`Banner deve ter no máximo ${effectiveLimit}MB (plano ${plan.toUpperCase()})`); return
    }

    if (isVid || isGifFile) {
      setBannerFile(file)
      setBannerPreview(URL.createObjectURL(file))
      setBannerIsVideo(isVid)
      e.target.value = ''
      return
    }

    const url = URL.createObjectURL(file)
    setPendingBannerSrc(url)
    setCropSrc(url)
    setCropTarget('banner')
    e.target.value = ''
  }

  function handleCropConfirm(blob: Blob) {
    if (cropTarget === 'avatar') {
      setAvatarBlob(blob)
      setAvatarPreview(URL.createObjectURL(blob))
    } else {
      setBannerBlob(blob)
      setBannerFile(null)
      setBannerPreview(URL.createObjectURL(blob))
      setBannerIsVideo(false)
    }
    setCropSrc(null)
    setCropTarget(null)
  }

  function handleCropCancel() {
    setCropSrc(null)
    setCropTarget(null)
  }

  async function uploadBlob(blob: Blob, bucket: string, userId: string, filename: string): Promise<string | null> {
    const ext = blob.type === 'image/gif' ? 'gif' : 'jpg'
    const path = `${userId}/${filename}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type })
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function uploadFile(file: File, bucket: string, userId: string, filename: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${filename}.${ext}`
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

    if (avatarBlob) {
      setUploadingAvatar(true)
      const filename = avatarBlob.type === 'image/gif' ? 'avatar_gif' : 'avatar'
      const url = await uploadBlob(avatarBlob, 'avatars', profile.id, filename)
      if (url) avatar_url = url
      setUploadingAvatar(false)
    }

    if (bannerBlob) {
      setUploadingBanner(true)
      const url = await uploadBlob(bannerBlob, 'banners', profile.id, 'banner')
      if (url) banner_url = url
      setUploadingBanner(false)
    } else if (bannerFile) {
      setUploadingBanner(true)
      const isVid = bannerFile.type.startsWith('video/')
      const isGifFile = bannerFile.type === 'image/gif'
      const bucket = isVid ? 'media' : 'banners'
      const filename = isVid ? 'banner_video' : isGifFile ? 'banner_gif' : 'banner'
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
    setAvatarBlob(null); setBannerBlob(null); setBannerFile(null)
    setAvatarPreview(null); setBannerPreview(null); setBannerIsVideo(false)
    setEditMode(false); setSaving(false)
    toast.success('Perfil atualizado!')
  }

  function handleCancel() {
    setEditMode(false)
    setAvatarBlob(null); setBannerBlob(null); setBannerFile(null)
    setAvatarPreview(null); setBannerPreview(null); setBannerIsVideo(false)
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setAccentColor(profile?.accent_color || '#c8f23c')
    setCropSrc(null); setCropTarget(null)
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

  const activeColor = hasAccent && profile?.accent_color ? profile.accent_color : plan === 'mega' ? '#a78bfa' : '#c8f23c'
  const previewColor = hasAccent ? accentColor : activeColor
  const planBorderColor = hasAccent ? `${previewColor}55` : 'rgba(255,255,255,0.08)'
  const planGlow = hasAccent ? `0 0 30px ${previewColor}22` : 'none'
  const currentBannerIsVideo = bannerIsVideo || (currentBanner ? isVideo(currentBanner) : false)
  const avatarAccept = isMega ? 'image/*' : 'image/jpeg,image/png,image/webp'
  const bannerAccept = isMega ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp'

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

      {cropSrc && cropTarget && (
        <CropModal
          src={cropSrc}
          target={cropTarget}
          accentColor={previewColor}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${activeColor}33` }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 'max(16px, calc(220px + 32px))' }}>
          <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}>← Voltar</button>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>@{profile.username}</span>
          {plan !== 'free' && <PlanBadge plan={plan} />}
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', paddingLeft: 'max(16px, calc(220px + 32px))', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#111118', border: `1px solid ${planBorderColor}`, borderRadius: 16, overflow: 'hidden', boxShadow: planGlow, transition: 'box-shadow 0.3s, border-color 0.3s' }}>

          {hasAccent && (
            <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${previewColor}88, transparent)`, transition: 'background 0.3s' }} />
          )}

          {/* Banner */}
          <div
            onClick={() => editMode && bannerInputRef.current?.click()}
            style={{ height: 120, position: 'relative', cursor: editMode ? 'pointer' : 'default', overflow: 'hidden', background: currentBanner ? 'none' : hasAccent ? `linear-gradient(135deg, ${previewColor}22, ${previewColor}08)` : 'linear-gradient(135deg, rgba(200,242,60,0.1), rgba(200,242,60,0.03))', borderBottom: `1px solid ${planBorderColor}`, transition: 'background 0.3s' }}
          >
            {currentBanner && currentBannerIsVideo ? (
              <video src={currentBanner} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : currentBanner ? (
              <img src={currentBanner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : null}
            {editMode && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 18 }}>🖼️</span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{uploadingBanner ? 'Enviando...' : isMega ? 'Alterar banner (imagem, GIF ou vídeo)' : 'Alterar banner'}</span>
                {isMega && !uploadingBanner && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>👑 GIF e vídeo disponíveis no seu plano</span>}
              </div>
            )}
            <input ref={bannerInputRef} type="file" accept={bannerAccept} style={{ display: 'none' }} onChange={handleBannerChange} />
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -52, marginBottom: 16 }}>
              {/* Avatar */}
              <div
                onClick={() => editMode && avatarInputRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: '50%', background: currentAvatar ? 'none' : hasAccent ? `linear-gradient(135deg, ${previewColor}, ${previewColor}99)` : 'linear-gradient(135deg, #c8f23c, #8ab82a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 30, border: `4px solid #111118`, boxShadow: hasAccent ? `0 0 20px ${previewColor}66` : '0 0 10px rgba(200,242,60,0.15)', cursor: editMode ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', flexShrink: 0, transition: 'box-shadow 0.3s' }}
              >
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
                <input ref={avatarInputRef} type="file" accept={avatarAccept} style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>

              {isOwner && !editMode && (
                <button onClick={() => setEditMode(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8888aa', padding: '7px 16px', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}66`; e.currentTarget.style.color = activeColor }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' }}>
                  Editar perfil
                </button>
              )}
              {isOwner && editMode && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCancel} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8888aa', padding: '7px 14px', borderRadius: 50, cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif" }}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving} style={{ background: previewColor, color: '#000', fontWeight: 700, padding: '7px 16px', borderRadius: 50, border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif", boxShadow: `0 0 12px ${previewColor}55`, opacity: saving ? 0.7 : 1, transition: 'background 0.3s' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
              {!isOwner && blockedByThem && (
                <div style={{ padding: '7px 16px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.08)', color: '#555577', fontSize: 13, fontFamily: "'Syne', sans-serif" }}>
                  Indisponível
                </div>
              )}

              {!isOwner && !blockedByThem && isBlocked && (
                <button onClick={handleBlock} disabled={blockLoading}
                  style={{ background: 'transparent', border: '1px solid rgba(255,60,60,0.35)', color: '#ff6060', padding: '7px 16px', borderRadius: 50, cursor: blockLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", opacity: blockLoading ? 0.6 : 1 }}>
                  {blockLoading ? '...' : '🚫 Desbloquear'}
                </button>
              )}

              {!isOwner && !blockedByThem && !isBlocked && (
                <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  <button
                    onClick={handleMessage}
                    disabled={messageLoading}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#8888aa', padding: '7px 16px', borderRadius: 50,
                      cursor: messageLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700,
                      fontFamily: "'Syne', sans-serif", transition: 'all 0.2s', opacity: messageLoading ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}66`; e.currentTarget.style.color = activeColor }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' }}
                  >
                    {messageLoading ? '...' : '✉ Mensagem'}
                  </button>
                  <button onClick={handleFollow} disabled={followLoading}
                    style={{ background: isFollowing ? 'transparent' : activeColor, border: isFollowing ? '1px solid rgba(255,255,255,0.12)' : 'none', color: isFollowing ? '#8888aa' : '#000', padding: '7px 18px', borderRadius: 50, cursor: followLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s', opacity: followLoading ? 0.6 : 1, boxShadow: isFollowing ? 'none' : `0 0 12px ${activeColor}55` }}
                    onMouseEnter={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'rgba(255,60,60,0.4)'; e.currentTarget.style.color = '#ff6060' } }}
                    onMouseLeave={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' } }}>
                    {followLoading ? '...' : isFollowing ? 'Seguindo ✓' : 'Seguir'}
                  </button>
                  <div ref={moreMenuRef} style={{ position: 'relative' }}>
                    <button onClick={() => setShowMoreMenu(v => !v)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8888aa', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 16, fontFamily: "'Syne', sans-serif", lineHeight: '1' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${activeColor}66`; e.currentTarget.style.color = activeColor }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' }}>
                      ⋯
                    </button>
                    {showMoreMenu && (
                      <div style={{ position: 'absolute', top: '120%', right: 0, background: '#18181f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 6, minWidth: 170, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        <button onClick={handleBlock} disabled={blockLoading}
                          style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ff6060', padding: '8px 10px', borderRadius: 8, cursor: blockLoading ? 'wait' : 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif" }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,60,60,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {blockLoading ? '...' : `🚫 Bloquear @${profile.username}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {editMode && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: '#555577', fontSize: 12, margin: 0 }}>
                  Clique no avatar ou banner para alterar • Máx. {limitLabel} (plano {plan.toUpperCase()})
                </p>
                {isMega && <p style={{ color: '#a78bfa', fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>👑 MEGA: avatar aceita GIF • banner aceita GIF e vídeo (MP4/WebM)</p>}
              </div>
            )}

            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nome de exibição"
                  style={{ background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14, outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', width: '100%' }}
                  onFocus={e => (e.target.style.borderColor = `${previewColor}66`)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio..." rows={3}
                  style={{ background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14, outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none', boxSizing: 'border-box', width: '100%' }}
                  onFocus={e => (e.target.style.borderColor = `${previewColor}66`)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />

                {hasAccent && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ color: '#8888aa', fontSize: 12, fontWeight: 600 }}>🎨 Cor de destaque</span>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: previewColor, border: '2px solid rgba(255,255,255,0.2)', boxShadow: `0 0 8px ${previewColor}88`, transition: 'background 0.2s' }} />
                      <span style={{ color: previewColor, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{previewColor}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {ACCENT_COLORS.map(color => (
                        <button key={color} onClick={() => setAccentColor(color)} style={{ width: 28, height: 28, borderRadius: '50%', background: color, cursor: 'pointer', flexShrink: 0, border: accentColor === color ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)', boxShadow: accentColor === color ? `0 0 10px ${color}` : 'none', transition: 'all 0.15s' }} title={color} />
                      ))}
                      <label style={{ position: 'relative', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a28', flexShrink: 0 }}>
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
                  <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 20, margin: 0 }}>{profile.display_name || profile.username}</h1>
                  <PlanBadge plan={plan} />
                </div>
                <p style={{ color: '#555577', fontSize: 14, marginBottom: 8 }}>@{profile.username}</p>
                {profile.bio && <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>}
                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                  <span onClick={() => router.push(`/profile/${profile.username}/follows?tab=followers`)} style={{ color: '#555577', fontSize: 13, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = activeColor)} onMouseLeave={e => (e.currentTarget.style.color = '#555577')}>
                    <span style={{ color: '#f0f0f8', fontWeight: 700 }}>{followersCount}</span> seguidores
                  </span>
                  <span onClick={() => router.push(`/profile/${profile.username}/follows?tab=following`)} style={{ color: '#555577', fontSize: 13, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = activeColor)} onMouseLeave={e => (e.currentTarget.style.color = '#555577')}>
                    <span style={{ color: '#f0f0f8', fontWeight: 700 }}>{followingCount}</span> seguindo
                  </span>
                  <span style={{ color: '#555577', fontSize: 13 }}><span style={{ color: '#f0f0f8', fontWeight: 700 }}>{posts.length}</span> posts</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#111118', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['posts', 'communities'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: tab === t ? `${activeColor}22` : 'transparent', color: tab === t ? activeColor : '#555577' }}>
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
                onMouseLeave={e => { e.currentTarget.style.borderColor = hasAccent ? `${activeColor}33` : 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}>
                <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{post.title}</h2>
                {post.content && <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{post.content}</p>}
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
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}>
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