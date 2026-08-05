import { moderateText } from '@/lib/moderation'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title : ''
  const content = typeof body?.content === 'string' ? body.content : ''

  if (!content && !title) {
    return NextResponse.json({ action: 'approve', reason: 'Sem conteúdo para revisar' })
  }

  const result = await moderateText(content, title)
  return NextResponse.json(result)
}
