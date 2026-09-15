import Link from 'next/link'
import { ArrowRight, ExternalLink, MessageCircle, Orbit, ShieldCheck, Users } from 'lucide-react'
export default function LandingHero(){
 return <section className="landing-hero">
  <div className="vtx-space-scene" aria-hidden="true">
   <div className="vtx-space-aura vtx-space-aura--green"/><div className="vtx-space-aura vtx-space-aura--purple"/>
   <div className="vtx-space-orbit vtx-space-orbit--one"/><div className="vtx-space-orbit vtx-space-orbit--two"/>
   <div className="vtx-space-core"><Orbit size={34} strokeWidth={1.4}/></div>
   <i className="vtx-space-star vtx-space-star--1"/><i className="vtx-space-star vtx-space-star--2"/>
   <i className="vtx-space-star vtx-space-star--3"/><i className="vtx-space-star vtx-space-star--4"/>
  </div>
  <div aria-hidden="true" className="landing-hero-overlay"/>
  <div className="container-vtx vtx-hero-grid landing-hero-inner">
   <div className="landing-hero-copy">
    <div className="landing-hero-pill"><span className="landing-hero-pill-dot"/>VORTEX · comunidades, stories e DMs</div>
    <h1 className="landing-hero-title">Sua internet.<br/><span className="landing-hero-title-accent">Seu ritmo. Seu VORTEX.</span></h1>
    <p className="landing-hero-copytext">Uma rede social open source para conversar, publicar e encontrar comunidades sem abrir mão de um feed cronológico e de uma experiência que coloca você no controle.</p>
    <div className="landing-hero-actions">
     <Link href="/register" className="neon-btn landing-hero-cta">Criar conta grátis <ArrowRight size={17}/></Link>
     <a href="https://github.com/gabriel31249090/VORTEX" target="_blank" rel="noreferrer" className="landing-hero-cta landing-hero-cta-secondary"><ExternalLink size={17}/> Ver código</a>
    </div>
    <div className="vtx-hero-proof"><span><ShieldCheck size={16}/> Privacidade em foco</span><span><Users size={16}/> Comunidades</span><span><MessageCircle size={16}/> Mensagens em tempo real</span></div>
   </div>
   <aside aria-hidden="true" className="landing-hero-visual">
    <div className="landing-hero-visual-card surface glass vtx-product-preview">
     <div className="vtx-preview-topline"><span className="landing-hero-visual-pill">VORTEX LIVE</span><span className="vtx-preview-status"><i/> conectado</span></div>
     <h2 className="landing-hero-visual-title">Um feed que parece seu.</h2>
     <p className="landing-hero-visual-copy">Stories, comunidades e conversas organizados sem transformar cada clique em uma disputa por atenção.</p>
     <div className="vtx-preview-stack"><div><Users size={18}/><span>Comunidades que você escolheu</span></div><div><MessageCircle size={18}/><span>DMs em ordem cronológica</span></div><div><ShieldCheck size={18}/><span>Controles de privacidade claros</span></div></div>
    </div>
    <div className="landing-hero-visual-badge">Open source · feito para pessoas</div>
   </aside>
  </div>
 </section>
}
