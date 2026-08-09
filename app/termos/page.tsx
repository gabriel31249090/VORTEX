// app/termos/page.tsx
//
// Mesma base visual da página de Política de Privacidade.
// Assume a fonte Syne já registrada globalmente como `font-syne`.

import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — VORTEX",
  description: "As regras de uso do VORTEX.",
};

const ULTIMA_ATUALIZACAO = "8 de agosto de 2026";

const EMAIL_CONTATO = "gabriel31249090@gmail.com";
const EMAIL_DENUNCIA = "gabriel31249090@gmail.com";

const SECOES = [
  { id: "aceitacao", titulo: "1. Aceitação dos termos" },
  { id: "elegibilidade", titulo: "2. Quem pode usar o VORTEX" },
  { id: "sua-conta", titulo: "3. Sua conta" },
  { id: "seu-conteudo", titulo: "4. Seu conteúdo" },
  { id: "conduta-proibida", titulo: "5. Conduta proibida" },
  { id: "denuncias", titulo: "6. Denúncias, bloqueio e moderação" },
  { id: "planos", titulo: "7. Planos e pagamentos" },
  { id: "anuncios", titulo: "8. Publicidade" },
  { id: "propriedade", titulo: "9. Propriedade intelectual" },
  { id: "garantias", titulo: "10. Isenção de garantias" },
  { id: "encerramento", titulo: "11. Encerramento de conta" },
  { id: "alteracoes", titulo: "12. Alterações nestes termos" },
  { id: "lei", titulo: "13. Lei aplicável" },
  { id: "contato", titulo: "14. Contato" },
];

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-black text-neutral-200">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <Link
          href="/"
          className="text-sm text-neutral-500 transition-colors hover:text-[#c8f23c]"
        >
          ← Voltar ao VORTEX
        </Link>

        <header className="mt-8 border-b border-neutral-800 pb-8">
          <p className="font-syne text-xs uppercase tracking-[0.3em] text-[#c8f23c]">
            Legal
          </p>
          <h1 className="font-syne mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Termos de Uso
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Ao criar uma conta ou usar o VORTEX, você concorda com estas
            regras. Leia com atenção — elas existem pra manter o VORTEX um
            lugar seguro pra todo mundo.
          </p>
          <p className="mt-4 text-xs text-neutral-600">
            Última atualização: {ULTIMA_ATUALIZACAO}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-[220px_1fr]">
          {/* Sumário */}
          <nav className="hidden md:block">
            <div className="sticky top-10">
              <p className="font-syne text-xs uppercase tracking-widest text-neutral-600">
                Sumário
              </p>
              <ul className="mt-4 space-y-2 border-l border-neutral-800 pl-4 text-sm">
                {SECOES.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-neutral-500 transition-colors hover:text-[#c8f23c]"
                    >
                      {s.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Conteúdo */}
          <article className="max-w-2xl space-y-14 text-[15px] leading-relaxed text-neutral-300">
            <section id="aceitacao">
              <h2 className="font-syne text-xl font-semibold text-white">
                1. Aceitação dos termos
              </h2>
              <p className="mt-3">
                Estes Termos de Uso formam um contrato entre você e o
                VORTEX. Ao marcar a caixa de aceite no cadastro, você
                confirma que leu, entendeu e concorda com estas regras e
                com a nossa{" "}
                <Link href="/privacidade" className="text-[#c8f23c] hover:underline">
                  Política de Privacidade
                </Link>
                . Se você não concorda, não use o VORTEX.
              </p>
            </section>

            <section id="elegibilidade">
              <h2 className="font-syne text-xl font-semibold text-white">
                2. Quem pode usar o VORTEX
              </h2>
              <p className="mt-3">
                O VORTEX é destinado a pessoas com 18 anos ou mais. Ao
                criar uma conta, você declara ter 18 anos ou mais e
                fornecer sua data de nascimento real no cadastro. Contas
                identificadas como pertencentes a menores de 18 anos serão
                removidas.
              </p>
            </section>

            <section id="sua-conta">
              <h2 className="font-syne text-xl font-semibold text-white">
                3. Sua conta
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>Você é responsável por manter sua senha em sigilo.</li>
                <li>
                  Você é responsável por tudo que acontece na sua conta,
                  incluindo conteúdo postado e mensagens enviadas.
                </li>
                <li>
                  Uma pessoa pode ter apenas uma conta, salvo autorização
                  expressa do VORTEX.
                </li>
                <li>
                  Avise imediatamente se suspeitar de acesso não autorizado
                  à sua conta.
                </li>
              </ul>
            </section>

            <section id="seu-conteudo">
              <h2 className="font-syne text-xl font-semibold text-white">
                4. Seu conteúdo
              </h2>
              <p className="mt-3">
                Você continua sendo o dono de tudo que publica no VORTEX —
                posts, fotos e mensagens. Ao publicar, você dá ao VORTEX uma
                licença não exclusiva, mundial e gratuita para hospedar,
                exibir e distribuir esse conteúdo dentro da plataforma, só
                para operar o serviço. Essa licença acaba quando você exclui
                o conteúdo ou sua conta.
              </p>
            </section>

            <section id="conduta-proibida">
              <h2 className="font-syne text-xl font-semibold text-white">
                5. Conduta proibida
              </h2>
              <p className="mt-3">É proibido usar o VORTEX para:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>
                  Postar discurso de ódio, discriminação ou incitação à
                  violência.
                </li>
                <li>Assediar, ameaçar ou fazer bullying com outro usuário.</li>
                <li>
                  Publicar nudez, conteúdo sexual explícito ou material
                  impróprio.
                </li>
                <li>
                  Qualquer conteúdo que exponha, sexualize ou explore
                  crianças e adolescentes — tolerância zero, com denúncia
                  imediata às autoridades competentes.
                </li>
                <li>Enviar spam, golpes ou tentativas de phishing.</li>
                <li>Se passar por outra pessoa ou marca.</li>
                <li>Publicar conteúdo que viole direitos autorais de terceiros.</li>
                <li>Usar bots ou automação para manipular curtidas, seguidores ou métricas.</li>
                <li>Praticar qualquer atividade ilegal sob a lei brasileira.</li>
              </ul>
            </section>

            <section id="denuncias">
              <h2 className="font-syne text-xl font-semibold text-white">
                6. Denúncias, bloqueio e moderação
              </h2>
              <p className="mt-3">
                Todo post e todo perfil no VORTEX tem uma opção de denúncia.
                Você também pode bloquear qualquer usuário para impedir que
                ele veja seu perfil ou fale com você. Denúncias graves
                (exploração infantil, ameaças de violência) podem ser
                enviadas também para{" "}
                <a
                  href={`mailto:${EMAIL_DENUNCIA}`}
                  className="text-[#c8f23c] hover:underline"
                >
                  {EMAIL_DENUNCIA}
                </a>
                .
              </p>
              <p className="mt-3">
                Dependendo da gravidade, o VORTEX pode remover conteúdo,
                emitir um aviso, suspender temporariamente ou banir
                permanentemente uma conta, sem aviso prévio em casos graves.
              </p>
            </section>

            <section id="planos">
              <h2 className="font-syne text-xl font-semibold text-white">
                7. Planos e pagamentos
              </h2>
              <p className="mt-3">
                O VORTEX oferece o plano gratuito Free e os planos pagos
                BOOST e MEGA BOOST, com benefícios adicionais dentro da
                plataforma. Pagamentos são feitos via Pix e processados por
                um provedor de pagamento terceiro.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>Assinaturas são renovadas conforme o período contratado.</li>
                <li>Você pode cancelar a renovação a qualquer momento nas configurações.</li>
                <li>
                  Reembolsos são avaliados caso a caso — entre em contato
                  em{" "}
                  <a
                    href={`mailto:${EMAIL_CONTATO}`}
                    className="text-[#c8f23c] hover:underline"
                  >
                    {EMAIL_CONTATO}
                  </a>
                  .
                </li>
              </ul>
            </section>

            <section id="anuncios">
              <h2 className="font-syne text-xl font-semibold text-white">
                8. Publicidade
              </h2>
              <p className="mt-3">
                O VORTEX pode exibir anúncios no feed e em pop-ups para
                usuários do plano Free, como parte do funcionamento
                gratuito da plataforma. Os planos BOOST e MEGA BOOST podem
                reduzir ou remover essa exibição.
              </p>
            </section>

            <section id="propriedade">
              <h2 className="font-syne text-xl font-semibold text-white">
                9. Propriedade intelectual
              </h2>
              <p className="mt-3">
                A marca VORTEX, seu logotipo, design e código são de
                propriedade do VORTEX. Você não pode copiar, modificar ou
                redistribuir a plataforma sem autorização.
              </p>
            </section>

            <section id="garantias">
              <h2 className="font-syne text-xl font-semibold text-white">
                10. Isenção de garantias
              </h2>
              <p className="mt-3">
                O VORTEX é fornecido "como está". Fazemos o possível para
                manter a plataforma no ar e segura, mas não garantimos
                operação ininterrupta ou livre de erros. Na máxima extensão
                permitida por lei, o VORTEX não se responsabiliza por danos
                indiretos decorrentes do uso da plataforma.
              </p>
            </section>

            <section id="encerramento">
              <h2 className="font-syne text-xl font-semibold text-white">
                11. Encerramento de conta
              </h2>
              <p className="mt-3">
                Você pode excluir sua conta a qualquer momento nas
                configurações. O VORTEX pode suspender ou encerrar contas
                que violem estes termos, especialmente a seção 5.
              </p>
            </section>

            <section id="alteracoes">
              <h2 className="font-syne text-xl font-semibold text-white">
                12. Alterações nestes termos
              </h2>
              <p className="mt-3">
                Podemos atualizar estes termos conforme o VORTEX evolui.
                Mudanças relevantes serão avisadas dentro do app antes de
                entrarem em vigor.
              </p>
            </section>

            <section id="lei">
              <h2 className="font-syne text-xl font-semibold text-white">
                13. Lei aplicável
              </h2>
              <p className="mt-3">
                Estes termos são regidos pelas leis da República Federativa
                do Brasil. Qualquer disputa será resolvida no foro do
                domicílio do usuário, conforme o Código de Defesa do
                Consumidor, quando aplicável.
              </p>
            </section>

            <section id="contato" className="pb-16">
              <h2 className="font-syne text-xl font-semibold text-white">
                14. Contato
              </h2>
              <p className="mt-3">
                Dúvidas sobre estes termos podem ser enviadas para{" "}
                <a
                  href={`mailto:${EMAIL_CONTATO}`}
                  className="text-[#c8f23c] hover:underline"
                >
                  {EMAIL_CONTATO}
                </a>
                .
              </p>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}
