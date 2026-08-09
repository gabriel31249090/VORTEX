import { createClient } from '@supabase/supabase-js'

// ATENÇÃO: esse client usa a service_role key e ignora RLS.
// Só pode ser importado dentro de código server-side (API routes),
// nunca em componentes 'use client'. Usado hoje só pra ler as
// push_subscriptions de OUTRO usuário na hora de mandar notificação
// (ex: destinatário de uma DM), algo que a RLS normal não deixaria
// o remetente fazer diretamente.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.')
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
