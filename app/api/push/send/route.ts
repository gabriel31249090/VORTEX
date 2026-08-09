import { NextRequest, NextResponse } from 'next/server'
import { createClient as createRouteClient } from '@/lib/supabase/route-handler'
import { sendPushToUser } from '@/lib/push'

// Exige sessão válida (evita chamada anônima), mas confia no client
// autenticado pra dizer quem é o destinatário — mesmo nível de confiança
// que o resto do app hoje (ex: inserts em notifications feitos direto
// pelo client). Se abuso virar problema, dá pra endurecer depois
// verificando a relação (ex: se o remetente realmente participa da
// conversa antes de mandar o push).
export async function POST(request: NextRequest) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const recipientId = typeof body?.recipientId === 'string' ? body.recipientId : null
  const title = typeof body?.title === 'string' ? body.title : null
  const text = typeof body?.body === 'string' ? body.body : null
  const url = typeof body?.url === 'string' ? body.url : '/'

  if (!recipientId || !title || !text) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  if (recipientId === user.id) {
    return NextResponse.json({ ok: true })
  }

  try {
    await sendPushToUser(recipientId, { title, body: text, url })
  } catch (err) {
    console.error('Falha ao enviar push:', err)
    return NextResponse.json({ error: 'Falha ao enviar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
