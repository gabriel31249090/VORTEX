import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/route-handler'

function normalizeReceiptPath(value: string) {
  if (!value.startsWith('http')) return value
  try {
    const url = new URL(value)
    const markers = [
      '/storage/v1/object/public/receipts/',
      '/storage/v1/object/sign/receipts/',
    ]
    for (const marker of markers) {
      const index = url.pathname.indexOf(marker)
      if (index >= 0) return decodeURIComponent(url.pathname.slice(index + marker.length))
    }
  } catch {}
  return value
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const { id } = await params
  const { data: planRequest, error: requestError } = await supabase
    .from('plan_requests')
    .select('receipt_path, receipt_url')
    .eq('id', id)
    .maybeSingle()

  if (requestError || !planRequest) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }

  const storedPath = planRequest.receipt_path || planRequest.receipt_url
  if (!storedPath) {
    return NextResponse.json({ error: 'Comprovante não encontrado.' }, { status: 404 })
  }

  const path = normalizeReceiptPath(storedPath)
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 60)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Não foi possível abrir o comprovante.' }, { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl)
}
