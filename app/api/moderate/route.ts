import { moderateText } from '@/lib/moderation'
import { createClient } from '@/lib/supabase/route-handler'
import { NextRequest,NextResponse } from 'next/server'
const MAX_TITLE=300,MAX_CONTENT=50000,MAX_REQUEST=70000
export async function POST(request:NextRequest){
 const len=Number(request.headers.get('content-length')||'0')
 if(Number.isFinite(len)&&len>MAX_REQUEST)return NextResponse.json({error:'Conteúdo muito grande.'},{status:413})
 const supabase=await createClient();const{data:{user},error:authError}=await supabase.auth.getUser()
 if(authError||!user)return NextResponse.json({error:'Não autenticado.'},{status:401})
 const body=await request.json().catch(()=>null),title=typeof body?.title==='string'?body.title.trim():'',content=typeof body?.content==='string'?body.content.trim():''
 if(title.length>MAX_TITLE||content.length>MAX_CONTENT)return NextResponse.json({error:'Conteúdo excede o limite permitido.'},{status:413})
 if(!content&&!title)return NextResponse.json({action:'approve',reason:'Sem conteúdo para revisar'})
 return NextResponse.json(await moderateText(content,title),{headers:{'Cache-Control':'private, no-store'}})
}
