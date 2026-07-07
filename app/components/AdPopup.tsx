'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import RippleButton from './RippleButton'

type Ad = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string
}

export default function AdPopup() {
  const [ad, setAd] = useState<Ad | null>(null)
  const [visible, setVisible] = useState(false)
  const [userPlan, setUserPlan] = useState<string | null>(null)

  useEffect(() => {
    // Só mostra 1x por sessão
    const seen = sessionStorage.getItem('vortex_popup_seen')
    if (seen) return

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('plan').eq('id', user.id).single()

      // BOOST e MEGA não veem anúncios
      if (profile?.plan === 'boost' || profile?.plan === 'mega') return
      setUserPlan(profile?.plan || 'free')

      const { data: ads } = await supabase
        .from('ads')
        .select('id, title, description, image_url, link_url')
        .eq('type', 'popup')
        .eq('active', true)
        .limit(10)

      if (!ads || ads.length === 0) return

      // Escolhe um anúncio aleatório
      const picked = ads[Math.floor(Math.random() * ads.length)]
      setAd(picked)

      // Delay de 2s antes de mostrar
      setTimeout(() => setVisible(true), 2000)
    }
    load()
  }, [])

  function handleClose() {
    setVisible(false)
    sessionStorage.setItem('vortex_popup_seen', '1')
  }

  function handleClick() {
    handleClose()
  }

  if (!visible || !ad) return null

  return (
    <>
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}
      />
      <div className="vtx-card" style={{
        position: 'fixed', bottom: 24, right: 24,
        width: 320, zIndex: 401,
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: "'Syne', sans-serif",
      }}>
        {/* Label de anúncio */}
        <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#333355', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>PATROCINADO</span>
          <RippleButton
            onClick={handleClose}
            className="vtx-btn"
            rippleColor="rgba(255,255,255,0.25)"
            style={{ background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 16, padding: '2px 4px', lineHeight: 1, borderRadius: 6 }}
          >✕</RippleButton>
        </div>

        {/* Imagem */}
        {ad.image_url && (
          <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
            <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
          </a>
        )}

        {/* Conteúdo */}
        <div style={{ padding: '14px 16px 16px' }}>
          <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, margin: '0 0 6px', lineHeight: 1.4 }}>{ad.title}</p>
          {ad.description && <p style={{ color: '#8888aa', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{ad.description}</p>}
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="vtx-btn-ghost"
            style={{
              display: 'block', width: '100%', padding: '10px 0',
              background: 'rgba(200,242,60,0.1)',
              border: '1px solid rgba(200,242,60,0.25)',
              borderRadius: 50, color: '#c8f23c',
              textAlign: 'center', textDecoration: 'none',
              fontSize: 13, fontWeight: 700,
              boxSizing: 'border-box',
              transition: 'all 0.2s',
            }}
          >
            Saiba mais →
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </>
  )
}