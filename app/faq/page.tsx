'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Nav from '@/app/components/Nav'
import toast from 'react-hot-toast'

const FAQ_ITEMS = [
  {
    question: 'Como faço para enviar um feedback ou reportar um problema?',
    answer: 'Use o formulário ao lado para nos contar o que está funcionando ou o que precisa melhorar. Nossa equipe revisa essas mensagens regularmente.'
  },
  {
    question: 'O que acontece depois que envio uma sugestão?',
    answer: 'Seu feedback vai direto para o painel administrativo. Mensagens novas aparecem na aba de SAC / Feedback e podem ser marcadas como resolvidas.'
  },
  {
    question: 'Como funciona a moderação de posts?',
    answer: 'O VORTEX aplica uma revisão automática e, em caso de conteúdo ambíguo, envia o post para revisão manual do administrador.'
  },
  {
    question: 'Posso usar o SAC para pedir novas funcionalidades?',
    answer: 'Sim! Sugestões de produto, melhorias de interface, bugs e dúvidas são todas bem-vindas.'
  },
]

const CATEGORY_OPTIONS = [
  { value: 'sugestão', label: 'Sugestão' },
  { value: 'bug', label: 'Bug' },
  { value: 'dúvida', label: 'Dúvida' },
  { value: 'elogio', label: 'Elogio' },
  { value: 'outro', label: 'Outro' },
]

export default function FAQPage() {
  const [category, setCategory] = useState('sugestão')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!message.trim()) {
      toast.error('Escreva sua mensagem antes de enviar.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    const userId = data?.user?.id || null

    if (userError) {
      console.error('Supabase auth error', userError)
      toast.error('Erro ao verificar usuário. Tente novamente.')
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      category,
      subject: subject.trim() || null,
      message: message.trim(),
      status: 'new',
    })

    if (error) {
      const errorText = error.message || JSON.stringify(error, null, 2)
      console.error('Feedback insert error', error)
      console.error('Feedback insert error details', errorText)
      toast.error(errorText || 'Erro ao enviar o feedback. Tente novamente.')
      setIsSubmitting(false)
      return
    }

    toast.success('Mensagem enviada! Obrigado pelo seu feedback.')
    setCategory('sugestão')
    setSubject('')
    setMessage('')
    setSent(true)
    setIsSubmitting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05050b', color: '#f0f0f8', fontFamily: "'Syne', sans-serif" }}>
      <Nav />
      <main className="faq-main" style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 120px', paddingLeft: 'max(24px, calc(220px + 32px))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(200,242,60,0.08)', border: '1px solid rgba(200,242,60,0.18)', borderRadius: 999, padding: '8px 14px', width: 'fit-content' }}>
              <span style={{ color: '#c8f23c', fontWeight: 700, fontSize: 12 }}>🛠️ SAC & FAQ</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 42px)', margin: 0, fontWeight: 800, lineHeight: 1.1 }}>Precisa de ajuda? Envie seu feedback.</h1>
            <p style={{ margin: 0, color: '#b8b8c8', maxWidth: 680, fontSize: 16, lineHeight: 1.75 }}>
              Use esta página para fazer perguntas, reportar bugs ou sugerir melhorias. Vamos usar seu retorno para tornar o VORTEX mais seguro e mais divertido para todo mundo.
            </p>
          </section>

          <div className="faq-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 18 }}>
              {FAQ_ITEMS.map(item => (
                <div key={item.question} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8f8ff' }}>{item.question}</h2>
                  <p style={{ margin: '12px 0 0', color: '#a5a5b8', fontSize: 14, lineHeight: 1.8 }}>{item.answer}</p>
                </div>
              ))}
            </div>

            <aside style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ color: '#c8f23c', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>FORMA DE CONTATO</div>
                  <p style={{ margin: '10px 0 0', color: '#a5a5b8', fontSize: 14, lineHeight: 1.7 }}>
                    Envie sua mensagem e nossa equipe verá no painel administrativo.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                  <label style={{ display: 'grid', gap: 8, fontSize: 13, color: '#e2e2eb' }}>
                    Categoria
                    <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a11', color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14 }}>
                      {CATEGORY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: 8, fontSize: 13, color: '#e2e2eb' }}>
                    Assunto (opcional)
                    <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Sugestão de UX" style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a11', color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14 }} />
                  </label>

                  <label style={{ display: 'grid', gap: 8, fontSize: 13, color: '#e2e2eb' }}>
                    Mensagem
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder="Conte o problema ou sugestão com detalhes..." style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a11', color: '#f0f0f8', fontFamily: "'Syne', sans-serif", fontSize: 14, resize: 'vertical' }} />
                  </label>

                  <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '14px 18px', borderRadius: 16, border: 'none', background: '#c8f23c', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 18px rgba(200,242,60,0.2)' }}>
                    {isSubmitting ? 'Enviando...' : 'Enviar mensagem'}
                  </button>

                  {sent && <div style={{ color: '#a5f58b', fontSize: 13 }}>Obrigado! Seu feedback foi enviado com sucesso.</div>}
                </form>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 767px) {
          .faq-main { padding-left: 16px !important; }
        }
        @media (max-width: 860px) {
          .faq-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
