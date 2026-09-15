import type { LucideIcon } from 'lucide-react'
type Props={title:string;desc:string;icon:LucideIcon;accent:'green'|'purple';col:string;row:string}
const COLORS={green:'var(--green)',purple:'var(--purple)'} as const
export default function FeatureCard({title,desc,icon:Icon,accent,col,row}:Props){
 return <article className="vtx-feature-card feature-card" style={{gridColumn:col,gridRow:row,'--accent-color':COLORS[accent]} as React.CSSProperties}>
  <div aria-hidden className="feature-card-glow"/>
  <div className="feature-card-body"><div className="feature-card-icon" aria-hidden="true"><Icon size={24} strokeWidth={1.8}/></div><h3 className="feature-card-title">{title}</h3></div>
  <p className="feature-card-desc">{desc}</p>
 </article>
}
