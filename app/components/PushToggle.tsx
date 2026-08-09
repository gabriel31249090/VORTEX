'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checar() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
      setSupported(true)
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }
    checar()
  }, [])

  async function ativar() {
    if (!VAPID_PUBLIC_KEY) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.')
      return
    }
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setLoading(false); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const json = sub.toJSON()
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        { onConflict: 'endpoint' }
      )

      setSubscribed(true)
    } catch (err) {
      console.error('Erro ao ativar notificações:', err)
    }
    setLoading(false)
  }

  async function desativar() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Erro ao desativar notificações:', err)
    }
    setLoading(false)
  }

  if (!supported) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600 }}>🔔 Notificações push</p>
        <p style={{ color: '#555577', fontSize: 13 }}>
          {subscribed ? 'Ativadas neste dispositivo' : 'Avisos de mensagens e menções mesmo com o app fechado'}
        </p>
      </div>
      <button
        onClick={subscribed ? desativar : ativar}
        disabled={loading}
        style={{
          background: subscribed ? 'transparent' : '#c8f23c',
          color: subscribed ? '#8888aa' : '#000',
          border: subscribed ? '1px solid rgba(255,255,255,0.15)' : 'none',
          fontWeight: 700, padding: '8px 16px', borderRadius: 50,
          cursor: loading ? 'wait' : 'pointer', fontSize: 13,
          fontFamily: "'Syne', sans-serif", opacity: loading ? 0.6 : 1, flexShrink: 0,
        }}
      >
        {loading ? '...' : subscribed ? 'Desativar' : 'Ativar'}
      </button>
    </div>
  )
}
