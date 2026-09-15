'use client'
import { useEffect,useRef,useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowRight,Orbit } from 'lucide-react'
import { fadeInUp,shakeError } from '@/lib/animations'
import OAuthButtons from '../components/OAuthButtons'
const ScrambleText=dynamic(()=>import('../components/ScrambleText'),{ssr:false})
export default function LoginPage(){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false)
 const router=useRouter(),supabase=createClient(),cardRef=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(cardRef.current)fadeInUp(cardRef.current,{duration:500})},[])
 useEffect(()=>{if(error&&cardRef.current)shakeError(cardRef.current)},[error])
 async function handleLogin(){if(!email.trim()||!password){setError('Preencha email e senha.');return}setLoading(true);setError('');const{error:e}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(e)setError('Email ou senha incorretos.');else router.push('/feed');setLoading(false)}
 return <main className="vtx-auth-page">
  <div className="vtx-login-atmosphere" aria-hidden="true"><div className="vtx-space-aura vtx-space-aura--green"/><div className="vtx-space-aura vtx-space-aura--purple"/><div className="vtx-space-orbit vtx-space-orbit--one"/><div className="vtx-space-orbit vtx-space-orbit--two"/></div>
  <section className="vtx-auth-shell">
   <Link href="/" className="vtx-auth-brand"><span className="vtx-auth-mark"><Orbit size={24}/></span><ScrambleText text="VORTEX" as="span" trigger="mount" duration={0.9} color="#c8f23c" glitchColor="#f0f0f8" className="vtx-login-logo"/></Link>
   <p className="vtx-auth-kicker">Bem-vindo de volta</p>
   <div ref={cardRef} className="vtx-auth-card" style={{opacity:0}}><OAuthButtons/>
    <label className="vtx-field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></label>
    <label className="vtx-field"><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&handleLogin()}/></label>
    {error&&<p className="vtx-form-error" role="alert">{error}</p>}
    <button onClick={handleLogin} disabled={loading} className="neon-btn vtx-auth-submit">{loading?'Entrando…':<>Entrar <ArrowRight size={17}/></>}</button>
    <p className="vtx-auth-switch">Não tem conta? <Link href="/register">Criar conta</Link></p>
   </div>
  </section>
 </main>
}
