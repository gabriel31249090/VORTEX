'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  created_at: string
}

type Post = {
  id: string
  title: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const username = params.username as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (!profileData) { setLoading(false); return }

      setProfile(profileData)
      setDisplayName(profileData.display_name || '')
      setBio(profileData.bio || '')
      setIsOwner(user?.id === profileData.id)

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, likes_count, comments_count, created_at')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false })

      setPosts(postsData || [])
      setLoading(false)
    }
    load()
  }, [username])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      display_name: displayName,
      bio: bio
    }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, display_name: displayName, bio } : prev)
    setEditMode(false)
    setSaving(false)
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
      <p className="text-zinc-500">Carregando...</p>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
      <p className="text-zinc-500">Usuário não encontrado.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push('/feed')} className="text-zinc-400 hover:text-white transition-colors">
            ← Voltar
          </button>
          <span className="text-white font-bold">@{profile.username}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Banner */}
        <div className="bg-[#141416] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-[#c8f23c]/20 to-zinc-800" />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-8 mb-4">
              <div className="w-16 h-16 rounded-full bg-[#c8f23c] flex items-center justify-center text-black text-2xl font-black border-4 border-[#141416]">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              {isOwner && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-zinc-400 text-sm border border-zinc-700 px-3 py-1 rounded-full hover:border-zinc-500 transition-colors"
                >
                  Editar perfil
                </button>
              )}
              {isOwner && editMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="text-zinc-400 text-sm border border-zinc-700 px-3 py-1 rounded-full hover:border-zinc-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#c8f23c] text-black text-sm font-bold px-3 py-1 rounded-full hover:bg-[#d4f554] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3">
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nome de exibição"
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c8f23c] text-sm"
                />
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Bio..."
                  rows={3}
                  className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c8f23c] text-sm resize-none"
                />
              </div>
            ) : (
              <>
                <h1 className="text-white font-bold text-xl">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-zinc-500 text-sm">@{profile.username}</p>
                {profile.bio && <p className="text-zinc-400 text-sm mt-2">{profile.bio}</p>}
                <p className="text-zinc-600 text-xs mt-2">{posts.length} publicações</p>
              </>
            )}
          </div>
        </div>

        {/* Posts do usuário */}
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-center text-zinc-600 text-sm py-6">Nenhuma publicação ainda.</p>
          )}
          {posts.map(post => (
            <article
              key={post.id}
              onClick={() => router.push(`/post/${post.id}`)}
              className="bg-[#141416] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-600 transition-colors cursor-pointer"
            >
              <h2 className="text-white font-semibold mb-1">{post.title}</h2>
              {post.content && <p className="text-zinc-400 text-sm line-clamp-2">{post.content}</p>}
              <div className="flex items-center gap-4 mt-3">
                <span className="text-zinc-600 text-xs">▲ {post.likes_count}</span>
                <span className="text-zinc-600 text-xs">💬 {post.comments_count}</span>
                <span className="text-zinc-600 text-xs">{timeAgo(post.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}