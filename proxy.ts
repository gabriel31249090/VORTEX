import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isPublicPath } from '@/lib/routes'

function privateNoStore(response: NextResponse) {
  response.headers.set('Cache-Control','private, no-cache, no-store, must-revalidate')
  response.headers.set('Pragma','no-cache')
  response.headers.set('Expires','0')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublicPath(pathname)) return NextResponse.next()

  const response=NextResponse.next()
  const supabase=createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {cookies:{
      getAll(){return request.cookies.getAll()},
      setAll(items){items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}
    }}
  )
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){
    const url=new URL('/login',request.url)
    url.searchParams.set('next',pathname)
    return privateNoStore(NextResponse.redirect(url))
  }
  return privateNoStore(response)
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']}
