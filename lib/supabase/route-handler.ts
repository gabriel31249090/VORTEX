import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client pra usar dentro de app/api/**/route.ts — identifica o usuário
// logado a partir dos cookies da requisição (sessão normal, respeitando
// RLS). Diferente de lib/supabase/server.ts, que usa a service role e
// ignora RLS de propósito.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Chamado de dentro de uma Route Handler — se não der pra setar
            // cookie aqui, não tem problema, só afeta refresh automático de sessão.
          }
        },
      },
    }
  )
}
