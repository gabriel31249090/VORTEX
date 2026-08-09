'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// Sobe junto com a constante de mesmo nome em app/register/page.tsx —
// se os Termos/Privacidade mudarem de forma relevante, sobe esse número
// pra pedir o aceite de novo de quem já tinha aceitado uma versão antiga.
const TERMS_VERSION = '1.0'

function calcularIdade(dataNascimento: string) {
  const hoje = new Date()
  const nascimento = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  if (aindaNaoFezAniversario) idade--
  return idade
}

type Faltando = { username: boolean; birthDate: boolean; termos: boolean }

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '12px 16px', color: '#f0f0f8', fontSize: 14,
  outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box',
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [faltando, setFaltando] = useState<Faltando | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [error, setError] = useState('')
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let ativo = true

    async function checar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (ativo) { setChecking(false); setFaltando(null) }
        return
      }
      if (ativo) setUserId(user.id)

      // maybeSingle: usuário recém-logado via OAuth pode ainda não ter
      // preenchido esses campos, mas a linha em profiles já existe
      // (criada no signup/trigger) — por isso usamos update, não upsert.
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, birth_date, terms_accepted_at, terms_version')
        .eq('id', user.id)
        .maybeSingle()

      if (!ativo) return

      const precisa: Faltando = {
        username: !profile?.username,
        birthDate: !profile?.birth_date,
        termos: !profile?.terms_accepted_at || profile.terms_version !== TERMS_VERSION,
      }

      setFaltando(precisa.username || precisa.birthDate || precisa.termos ? precisa : null)
      setChecking(false)
    }

    checar()

    const { data: listener } = supabase.auth.onAuthStateChange(() => checar())
    return () => { ativo = false; listener.subscription.unsubscribe() }
  }, [])

  async function completar() {
    setError('')

    if (faltando?.username && username.trim().length < 3) {
      setError('Username deve ter pelo menos 3 caracteres.')
      return
    }
    if (faltando?.birthDate) {
      if (!birthDate) { setError('Informe sua data de nascimento.'); return }
      if (calcularIdade(birthDate) < 13) { setError('Você precisa ter pelo menos 13 anos para usar o VORTEX.'); return }
    }
    if (faltando?.termos && !aceitouTermos) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.')
      return
    }
    if (!userId) return

    setSalvando(true)

    const cleanUsername = username.trim().toLowerCase().replace(/\s/g, '')

    if (faltando?.username) {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', cleanUsername).single()
      if (existing) {
        setError('Este username já está em uso.')
        setSalvando(false)
        return
      }
    }

    const updates: Record<string, unknown> = {}
    if (faltando?.username) { updates.username = cleanUsername; updates.display_name = cleanUsername }
    if (faltando?.birthDate) updates.birth_date = birthDate
    if (faltando?.termos) { updates.terms_accepted_at = new Date().toISOString(); updates.terms_version = TERMS_VERSION }

    // update, não upsert: a linha em profiles sempre existe (criada no
    // signup), e upsert tentava um INSERT que travava em colunas
    // NOT NULL (como username) quando elas não estavam no payload.
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (updateError) {
      setError('Não deu pra salvar, tenta de novo.')
      setSalvando(false)
      return
    }

    setFaltando(null)
    setSalvando(false)
  }

  if (checking || !faltando) return <>{children}</>

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
            Falta pouco
          </h3>
          <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Pra continuar usando o VORTEX, precisamos de mais algumas informações.
          </p>

          {faltando.username && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="seunome"
                style={inputStyle}
              />
            </div>
          )}

          {faltando.birthDate && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
          )}

          {faltando.termos && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <input
                type="checkbox"
                id="onboarding-termos"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: '#c8f23c', cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor="onboarding-termos" style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
                Li e aceito os{' '}
                <Link href="/termos" target="_blank" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link href="/privacidade" target="_blank" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
                  Política de Privacidade
                </Link>
              </label>
            </div>
          )}

          {error && <p style={{ color: '#ff4466', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button
            onClick={completar}
            disabled={salvando}
            style={{
              width: '100%', background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '13px', borderRadius: 12, border: 'none', cursor: salvando ? 'wait' : 'pointer',
              fontSize: 15, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 20px rgba(200,242,60,0.3)', opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando ? 'Salvando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </>
  )
}
