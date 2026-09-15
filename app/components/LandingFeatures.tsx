import { Clock, Image, MessageCircle, Shield, Smile, Sparkles, Users } from 'lucide-react'
import FeatureCard from './FeatureCard'
export default function LandingFeatures(){
 const features=[
  {col:'1 / 4',row:'1 / 3',title:'Comunidades',desc:'Crie e participe de espaços por interesse, com regras, moderação e identidade próprias.',icon:Users,accent:'green' as const},
  {col:'4 / 7',row:'1 / 2',title:'Stories por 24 horas',desc:'Compartilhe momentos rápidos sem transformar tudo em um arquivo permanente.',icon:Clock,accent:'purple' as const},
  {col:'4 / 7',row:'2 / 3',title:'DMs cronológicas',desc:'Conversas diretas e grupos em ordem natural, sem recomendações de contatos no meio do caminho.',icon:MessageCircle,accent:'green' as const},
  {col:'1 / 3',row:'3 / 5',title:'Feed multimídia',desc:'Texto, imagem e vídeo em cards claros, responsivos e pensados para leitura rápida.',icon:Image,accent:'purple' as const},
  {col:'3 / 5',row:'3 / 4',title:'Experiência sem atrito',desc:'Publicar, reagir, salvar e compartilhar com menos passos e feedback visual consistente.',icon:Sparkles,accent:'green' as const},
  {col:'3 / 5',row:'4 / 5',title:'Reações expressivas',desc:'Mais contexto para responder ao conteúdo sem depender de um único botão de like.',icon:Smile,accent:'purple' as const},
  {col:'5 / 7',row:'3 / 5',title:'Privacidade legível',desc:'Controles, bloqueios e decisões de produto pensados para serem entendidos, não escondidos.',icon:Shield,accent:'green' as const},
 ]
 return <section id="features" className="landing-features container-vtx">
  <div className="landing-features-header"><div className="landing-features-pill">Recursos essenciais</div><h2 className="landing-features-title">Menos ruído. <span className="landing-features-title-muted">Mais controle.</span></h2><p className="landing-features-copy">Uma experiência social consistente do desktop ao celular, com cada sistema servindo a uma função clara.</p></div>
  <div className="vtx-bento">{features.map(f=><FeatureCard key={f.title} {...f}/>)}</div>
 </section>
}
