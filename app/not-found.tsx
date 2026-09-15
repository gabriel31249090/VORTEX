import Link from 'next/link'
import { ArrowLeft,Orbit } from 'lucide-react'
export default function NotFound(){return <main className="vtx-system-state"><span className="vtx-system-mark"><Orbit size={28}/></span><span className="vtx-system-code">404</span><h1>Esse ponto do VORTEX não existe.</h1><p>O link pode ter mudado ou o conteúdo pode não estar mais disponível.</p><Link href="/" className="neon-btn vtx-system-action"><ArrowLeft size={17}/> Voltar ao início</Link></main>}
