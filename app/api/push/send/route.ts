import { NextRequest,NextResponse } from 'next/server'
import { createClient as createRouteClient } from '@/lib/supabase/route-handler'
import { sendPushToUser } from '@/lib/push'
const UUID='[0-9a-fA-F-]{36}',MESSAGE_PATH=new RegExp(`^/messages/(${UUID})$`),POST_PATH=new RegExp(`^/post/(${UUID})$`)
async function canNotify(supabase:Awaited<ReturnType<typeof createRouteClient>>,senderId:string,recipientId:string,url:string){
 const message=url.match(MESSAGE_PATH)
 if(message){const{data}=await supabase.from('conversation_participants').select('user_id').eq('conversation_id',message[1]).in('user_id',[senderId,recipientId]);return new Set((data||[]).map(r=>r.user_id)).size===2}
 const post=url.match(POST_PATH)
 if(post){
  const postId=post[1],{data:p}=await supabase.from('posts').select('author_id').eq('id',postId).maybeSingle()
  if(p?.author_id===recipientId)return true
  const[{data:profile},{data:comments}]=await Promise.all([
   supabase.from('profiles').select('username').eq('id',recipientId).maybeSingle(),
   supabase.from('comments').select('content,created_at').eq('post_id',postId).eq('author_id',senderId).order('created_at',{ascending:false}).limit(5)
  ])
  const username=profile?.username?.toLowerCase();if(!username)return false
  return (comments||[]).some(c=>typeof c.content==='string'&&c.content.toLowerCase().includes(`@${username}`))
 }
 return false
}
export async function POST(request:NextRequest){
 const supabase=await createRouteClient(),{data:{user},error:authError}=await supabase.auth.getUser()
 if(authError||!user)return NextResponse.json({error:'Não autenticado'},{status:401})
 const body=await request.json().catch(()=>null),recipientId=typeof body?.recipientId==='string'?body.recipientId:null,title=typeof body?.title==='string'?body.title.trim().slice(0,90):null,text=typeof body?.body==='string'?body.body.trim().slice(0,180):null,url=typeof body?.url==='string'&&body.url.startsWith('/')?body.url:null
 if(!recipientId||!title||!text||!url)return NextResponse.json({error:'Parâmetros inválidos'},{status:400})
 if(recipientId===user.id)return NextResponse.json({ok:true})
 if(!(await canNotify(supabase,user.id,recipientId,url)))return NextResponse.json({error:'Destino não autorizado.'},{status:403})
 try{await sendPushToUser(recipientId,{title,body:text,url})}catch(e){console.error('Falha ao enviar push:',e);return NextResponse.json({error:'Falha ao enviar'},{status:500})}
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}})
}
