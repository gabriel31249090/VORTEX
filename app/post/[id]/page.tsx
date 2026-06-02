'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Post = {
  id: string
  title: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

type Comment = {
  id: string
  content: string
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

export default function PostPage() {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const postId = params.id as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: postData } = await supabase
        .from('posts')
        .select('id, title, content, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url)')
        .eq('id', postId)
        .single()

      setPost(postData as any)

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, content, created_at, author_id, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      setComments((commentsData as any) || [])
      setLoading(false)
    }
    load()
  }, [postId])

  async function handleComment() {
    if (!newComment.trim() || !userId) return
    setSubmitting(true)

    const { data, error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: userId,
      content: newComment.trim()
    }).select('id, content, created_at, author_id, profiles(username, avatar_url)').single()

    if (!error && data) {
      setComments(prev => [...prev, data as any])
      await supabase.from('posts').update({ comments_count: (post?.comments_count || 0) + 1 }).eq('id', postId)
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev)
      setNewComment('')
    }
    setSubmitting(false)
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
      <p className="text-zinc-500">Carregando...</p>
    </div>
  )

  if (!post) return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
      <p className="text-zinc-500">Post não encontrado.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/feed')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
          <span className="text-white font-bold">Post</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Post */}
        <div className="bg-[#141416] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#c8f23c] flex items-center justify-center text-black text-xs font-bold">
              {getInitial(post.profiles?.username || '?')}
            </div>
            <span className="text-zinc-400 text-sm">
              <span className="text-white font-medium">@{post.profiles?.username || 'usuário'}</span>
              {' · '}{timeAgo(post.created_at)}
            </span>
          </div>
          <h1 className="text-white font-bold text-xl mb-2">{post.title}</h1>
          {post.content && <p className="text-zinc-300 text-sm leading-relaxed">{post.content}</p>}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            <span className="text-zinc-500 text-sm">▲ {post.likes_count} curtidas</span>
            <span className="text-zinc-500 text-sm">💬 {post.comments_count} comentários</span>
          </div>
        </div>

        {/* Caixa de comentário */}
        <div className="bg-[#141416] border border-zinc-800 rounded-2xl p-4">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={3}
            className="w-full bg-transparent text-zinc-300 placeholder-zinc-600 focus:outline-none resize-none text-sm"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleComment}
              disabled={submitting || !newComment.trim()}
              className="bg-[#c8f23c] text-black text-sm font-bold px-4 py-1.5 rounded-full hover:bg-[#d4f554] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </div>

        {/* Comentários */}
        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-center text-zinc-600 text-sm py-6">Nenhum comentário ainda. Seja o primeiro!</p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="bg-[#141416] border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#c8f23c] flex items-center justify-center text-black text-xs font-bold">
                  {getInitial(comment.profiles?.username || '?')}
                </div>
                <span className="text-zinc-400 text-xs">
                  <span className="text-white font-medium">@{comment.profiles?.username || 'usuário'}</span>
                  {' · '}{timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="text-zinc-300 text-sm">{comment.content}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}