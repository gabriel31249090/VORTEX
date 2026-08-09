import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/route-handler'

// Pra onde o Supabase redireciona depois do login com GitHub/Google.
// Troca o código de autorização por uma sessão de verdade (cookies).
// Depois disso, quem loga pela primeira vez cai no OnboardingGate
// (username/data de nascimento/termos), porque ainda não tem linha
// em profiles.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
