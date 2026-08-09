import webpush from 'web-push'
import { createServiceClient } from './supabase/server'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error('Chaves VAPID não configuradas no ambiente.')
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contato@vortex.app',
    publicKey,
    privateKey
  )
  vapidConfigured = true
}

type PushPayload = { title: string; body: string; url?: string }

export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureVapid()
  const supabase = createServiceClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expirada/revogada pelo navegador — limpa do banco.
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Erro ao enviar push:', err)
        }
      }
    })
  )
}
