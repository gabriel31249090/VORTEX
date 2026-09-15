'use client'
import { RefreshCw,TriangleAlert } from 'lucide-react'
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="vtx-system-state"><span className="vtx-system-mark vtx-system-mark--error"><TriangleAlert size={26}/></span><h1>Algo saiu da órbita.</h1><p>O VORTEX encontrou um erro inesperado. Você pode tentar carregar esta área novamente.</p><button onClick={reset} className="neon-btn vtx-system-action"><RefreshCw size={17}/> Tentar novamente</button></main>}
