import { LoaderCircle,Orbit } from 'lucide-react'
export default function Loading(){return <div className="vtx-system-state" role="status" aria-live="polite"><span className="vtx-system-mark"><Orbit size={24}/></span><LoaderCircle className="vtx-system-spinner" size={22}/><p>Carregando VORTEX…</p></div>}
