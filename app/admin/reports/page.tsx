'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Nav from '../../components/Nav'

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam ou propaganda',
  sexual: 'Conteúdo sexual',
  odio: 'Discurso de ódio',
  violencia: 'Violência',
  assedio: 'Assédio ou bullying',
  fake_news: 'Informação falsa',
  outro: 'Outro motivo',
}

type Report = {
  id: string
  post_id: string
  reason: string
  details: string | null
  created_at: string
  reporter: { username: string } | null
  post: { id: string; title: string; content: string; profiles: { username: string } | null } | null
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()

      if (!profile?.is_admin) { router.replace('/feed'); return }

      setChecking(false)
      await loadReports()
    }
    init()
  }, [])

  async function loadReports() {
    setLoading(true)
    const { data, error } = await supabase
      .from('post_reports')
      .select('id, post_id, reason, details, created_at, reporter:profiles!post_reports_reporter_id_fkey(username), post:posts(id, title, content, profiles(username))')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setReports((data as any) || [])
    setLoading(false)
  }

  async function handleDismiss(reportId: string) {
    const { error } = await supabase.from('post_reports').delete().eq('id', reportId)
    if (error) { toast.error('Erro ao descartar denúncia.'); return }
    setReports(prev => prev.filter(r => r.id !== reportId))
    toast.success('Denúncia descartada.')
  }

  async function handleDeletePost(postId: string, reportId: string) {
    if (!confirm('Excluir este post permanentemente?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Erro ao excluir post.'); return }
    // Remove da tela todas as denúncias relacionadas a esse post (o post já sumiu, junto delas via cascade)
    setReports(prev => prev.filter(r => r.post_id !== postId))
    toast.success('Post excluído.')
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <h1 style={{ color: '#f0f0f8', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Denúncias de posts</h1>
        <p style={{ color: '#555577', fontSize: 14, marginBottom: 24 }}>
          {reports.length} denúncia{reports.length !== 1 ? 's' : ''} pendente{reports.length !== 1 ? 's' : ''}
        </p>

        {loading && <p style={{ color: '#555577' }}>Carregando...</p>}

        {!loading && reports.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <p>Nenhuma denúncia pendente.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => (
            <div key={r.id} style={{
              background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(255,68,102,0.12)', border: '1px solid rgba(255,68,102,0.4)',
                  color: '#ff4466', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 50,
                }}>
                  {REASON_LABELS[r.reason] || r.reason}
                </span>
                <span style={{ color: '#444466', fontSize: 12 }}>
                  denunciado por @{r.reporter?.username || '?'} · {new Date(r.created_at).toLocaleString('pt-BR')}
                </span>
              </div>

              {r.details && (
                <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 10, fontStyle: 'italic' }}>
                  "{r.details}"
                </p>
              )}

              {r.post ? (
                <div style={{ background: '#18181f', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <p style={{ color: '#555577', fontSize: 12, marginBottom: 4 }}>
                    post de @{r.post.profiles?.username || '?'}
                  </p>
                  <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{r.post.title}</p>
                  <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.5 }}>{r.post.content}</p>
                </div>
              ) : (
                <p style={{ color: '#444466', fontSize: 13, marginBottom: 14 }}>(post já foi removido)</p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleDismiss(r.id)}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', color: '#8888aa', cursor: 'pointer',
                    fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                  }}
                >
                  Descartar denúncia
                </button>
                {r.post && (
                  <button
                    onClick={() => handleDeletePost(r.post_id, r.id)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 10, border: 'none',
                      background: '#ff4466', color: '#fff', cursor: 'pointer',
                      fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 700,
                    }}
                  >
                    Excluir post
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}
