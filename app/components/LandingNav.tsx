'use client'
import Link from 'next/link'
import { ExternalLink, Menu } from 'lucide-react'
import { useEffect,useState } from 'react'
import MobileMenu from './MobileMenu'
export default function LandingNav(){
 const[scrolled,setScrolled]=useState(false),[menuOpen,setMenuOpen]=useState(false)
 useEffect(()=>{const fn=()=>setScrolled(window.scrollY>24);fn();window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn)},[])
 const links=[{label:'Recursos',href:'#features'},{label:'Como funciona',href:'#showcase'},{label:'Preços',href:'/pricing'}]
 return <><header className={`landing-nav ${scrolled?'landing-nav--scrolled':''}`}><div className="landing-nav-inner container-vtx">
  <Link href="/" className="landing-brand"><span className="vtx-brand-orbit" aria-hidden="true"/>VORTEX<span className="landing-brand-accent">.</span></Link>
  <nav className="landing-nav-desktop" aria-label="Navegação principal">{links.map(l=><Link key={l.href} href={l.href} className="landing-nav-link">{l.label}</Link>)}
   <a href="https://github.com/gabriel31249090/VORTEX" target="_blank" rel="noreferrer" className="landing-nav-link vtx-nav-github"><ExternalLink size={16}/> GitHub</a>
   <div className="landing-nav-actions"><Link href="/login" className="landing-nav-login">Entrar</Link><Link href="/register" className="neon-btn landing-nav-register">Criar conta</Link></div>
  </nav>
  <button className="landing-nav-mobile tap-highlight" onClick={()=>setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen}><Menu size={23}/></button>
 </div></header>
 <MobileMenu open={menuOpen} onClose={()=>setMenuOpen(false)} links={[...links,{label:'Entrar',href:'/login'},{label:'Criar conta',href:'/register'}]}/></>
}
