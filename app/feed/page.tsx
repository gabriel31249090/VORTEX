'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Post = {
  id: string
  title: string
  content: string
  type: string
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: {
    username: string
    avatar_url: string | null
  } | null
  communities: {
    name: string
    slug: string
  } | null
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, title, content, type, likes_count, comments_count, created_at, author_id,
          profiles(username, avatar_url),
          communities(name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) console.error(error)
      setPosts((data as any) || [])

      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)

      if (likes) setLikedPosts(new Set(likes.map((l: any) => l.post_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleLike(postId: string) {
    if (!userId) return
    const isLiked = likedPosts.has(postId)

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count - 1 }).eq('id', postId)
      setLikedPosts(prev => { const next = new Set(prev); next.delete(postId); return next })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p))
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      await supabase.from('posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count + 1 }).eq('id', postId)
      setLikedPosts(prev => new Set(prev).add(postId))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter text-white">◈ VORTEX</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/post/new')}
              className="bg-[#c8f23c] text-black text-sm font-bold px-4 py-1.5 rounded-full hover:bg-[#d4f554] transition-colors"
            >
              + Publicar
            </button>
            <button
              onClick={handleLogout}
              className="text-zinc-500 text-sm hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#141416] border border-zinc-800 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
                <div className="h-6 bg-zinc-800 rounded w-2/3 mb-2" />
                <div className="h-4 bg-zinc-800 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🌀</p>
            <p className="text-zinc-400">Nenhum post ainda. Seja o primeiro!</p>
          </div>
        )}

        {posts.map(post => (
          <article
            key={post.id}
            className="bg-[#141416] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#c8f23c] flex items-center justify-center text-black text-xs font-bold">
                {getInitial(post.profiles?.username || '?')}
              </div>
              <span className="text-zinc-400 text-sm">
                <span
                  className="text-white font-medium cursor-pointer hover:underline"
                  onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.profiles?.username}`) }}
                >
                  @{post.profiles?.username || 'usuário'}
                </span>
                {post.communities && (
                  <> em <span className="text-[#c8f23c]">v/{post.communities.name}</span></>
                )}
                {' · '}{timeAgo(post.created_at)}
              </span>
            </div>

            <div className="cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
              <h2 className="text-white font-semibold text-lg mb-1">{post.title}</h2>
              {post.content && (
                <p className="text-zinc-400 text-sm line-clamp-3">{post.content}</p>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  likedPosts.has(post.id)
                    ? 'text-[#c8f23c]'
                    : 'text-zinc-500 hover:text-[#c8f23c]'
                }`}
              >
                <span>▲</span>
                <span>{post.likes_count}</span>
              </button>
              <button
                onClick={() => router.push(`/post/${post.id}`)}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm"
              >
                <span>💬</span>
                <span>{post.comments_count}</span>
              </button>
              <button className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm">
                <span>↗</span>
                <span>Compartilhar</span>
              </button>
            </div>
          </article>
        ))}
      </main>
    </div>
  )
}