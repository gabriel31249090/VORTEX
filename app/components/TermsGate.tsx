'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// Sobe junto com a constante TERMS_VERSION de app/register/page.tsx —
// se os Termos/Privacidade mudarem de forma relevante, sobe esse número
// pra pedir o aceite de novo de quem já tinha aceitado uma versão antiga.
const TERMS_VERSION = '1.0'

export default function TermsGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [precisaAceitar, setPrecisaAceitar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let ativo = true

    async function checar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (ativo) { setChecking(false); setPrecisaAceitar(false) }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('terms_accepted_at, terms_version')
        .eq('id', user.id)
        .single()

      if (!ativo) return
      const jaAceitou = !!profile?.terms_accepted_at && profile.terms_version === TERMS_VERSION
      setPrecisaAceitar(!jaAceitou)
      setChecking(false)
    }

    checar()

    const { data: listener } = supabase.auth.onAuthStateChange(() => checar())
    return () => { ativo = false; listener.subscription.unsubscribe() }
  }, [])

  async function aceitar() {
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      }).eq('id', user.id)
    }
    setPrecisaAceitar(false)
    setSalvando(false)
  }

  if (checking || !precisaAceitar) return <>{children}</>

  return (
    <>
      {children}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: 420, background: '#111118',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <h3 style={{ color: '#f0f0f8', fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
            Atualizamos nossos termos
          </h3>
          <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Pra continuar usando o VORTEX, você precisa ler e aceitar os{' '}
            <Link href="/termos" target="_blank" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" target="_blank" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
              Política de Privacidade
            </Link>.
          </p>
          <button
            onClick={aceitar}
            disabled={salvando}
            style={{
              width: '100%', background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '13px', borderRadius: 12, border: 'none', cursor: salvando ? 'wait' : 'pointer',
              fontSize: 15, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 20px rgba(200,242,60,0.3)', opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando ? 'Salvando...' : 'Li e aceito'}
          </button>
        </div>
      </div>
    </>
  )
}
