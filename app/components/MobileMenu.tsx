'use client'
import { useEffect,useRef } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
type Props={open:boolean;onClose:()=>void;links:Array<{label:string;href:string}>}
export default function MobileMenu({open,onClose,links}:Props){
 const first=useRef<HTMLAnchorElement>(null)
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',key);const t=window.setTimeout(()=>first.current?.focus(),50);return()=>{window.clearTimeout(t);document.body.style.overflow=prev;document.removeEventListener('keydown',key)}},[open,onClose])
 return <nav className={`vtx-mobile-menu ${open?'is-open':''}`} aria-hidden={!open} aria-label="Menu principal">
  <div className="vtx-mobile-menu-head"><span className="landing-brand"><span className="vtx-brand-orbit" aria-hidden="true"/>VORTEX<span className="landing-brand-accent">.</span></span><button onClick={onClose} aria-label="Fechar menu" className="vtx-icon-button"><X size={20}/></button></div>
  {links.map((l,i)=><Link key={l.href} href={l.href} ref={i===0?first:undefined} onClick={onClose} className="tap-highlight">{l.label}</Link>)}
 </nav>
}
