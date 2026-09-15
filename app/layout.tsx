import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import AdPopup from './components/AdPopup'
import ServiceWorkerRegister from './components/ServiceWorkerRegister'
import OnboardingGate from './components/OnboardingGate'
import PageTransition from '@/components/PageTransition'
import './globals.css'
import './styles/interactions.css'

const SITE_URL=process.env.NEXT_PUBLIC_SITE_URL||'https://vortextalkanything.vercel.app'
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',colorScheme:'dark',themeColor:'#0a0a0f'}
export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  applicationName:'VORTEX',
  title:{default:'VORTEX — sua rede, no seu ritmo',template:'%s · VORTEX'},
  description:'Rede social open source com comunidades, stories, mensagens e feed cronológico.',
  alternates:{canonical:'/'},
  manifest:'/manifest.json',
  appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'VORTEX'},
  openGraph:{type:'website',locale:'pt_BR',siteName:'VORTEX',url:'/',title:'VORTEX — sua rede, no seu ritmo',description:'Comunidades, stories, mensagens e conteúdo em um fluxo que você controla.'},
  twitter:{card:'summary_large_image',title:'VORTEX — sua rede, no seu ritmo',description:'Comunidades, stories, mensagens e conteúdo em um fluxo que você controla.'},
  robots:{index:true,follow:true},
}
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>
    <ServiceWorkerRegister/>
    <OnboardingGate><PageTransition>{children}</PageTransition></OnboardingGate>
    <AdPopup/>
    <Toaster position="bottom-center" toastOptions={{
      style:{background:'#111118',color:'#f0f0f8',border:'1px solid rgba(200,242,60,0.2)',fontFamily:"'Syne', sans-serif",fontSize:'14px',borderRadius:'12px'},
      success:{iconTheme:{primary:'#c8f23c',secondary:'#000'}},
      error:{iconTheme:{primary:'#ff4466',secondary:'#fff'}}
    }}/>
  </body></html>
}
