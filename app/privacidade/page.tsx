// app/privacidade/page.tsx
//
// Assume que a fonte Syne já está registrada globalmente (ex: via next/font/google
// no layout.tsx raiz, exposta como variável --font-syne) e disponível como
// classe utilitária `font-syne` no Tailwind, igual ao resto do VORTEX.
// Se ainda não estiver, troque `font-syne` por `font-sans` que funciona igual.

import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — VORTEX",
  description: "Como o VORTEX coleta, usa e protege os seus dados.",
};

const ULTIMA_ATUALIZACAO = "8 de agosto de 2026";

const EMAIL_CONTATO = "gabriel31249090@gmail.com";
const RESPONSAVEL = "Gabriel [seu nome completo], pessoa física responsável pelo VORTEX";

const SECOES = [
  { id: "quem-somos", titulo: "1. Quem somos" },
  { id: "dados-coletados", titulo: "2. Quais dados coletamos" },
  { id: "como-usamos", titulo: "3. Como usamos os seus dados" },
  { id: "compartilhamento", titulo: "4. Com quem compartilhamos" },
  { id: "base-legal", titulo: "5. Base legal (LGPD)" },
  { id: "seus-direitos", titulo: "6. Seus direitos" },
  { id: "retencao", titulo: "7. Por quanto tempo guardamos" },
  { id: "seguranca", titulo: "8. Segurança" },
  { id: "menores", titulo: "9. Menores de idade" },
  { id: "cookies", titulo: "10. Cookies e sessão" },
  { id: "alteracoes", titulo: "11. Alterações nesta política" },
  { id: "contato", titulo: "12. Contato" },
];

export default function PoliticaDePrivacidadePage() {
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
            Política de Privacidade
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Esta política explica, em linguagem direta, quais dados o VORTEX
            coleta, por quê, e quais direitos você tem sobre eles — conforme
            a Lei Geral de Proteção de Dados (LGPD).
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
            <section id="quem-somos">
              <h2 className="font-syne text-xl font-semibold text-white">
                1. Quem somos
              </h2>
              <p className="mt-3">
                O VORTEX é uma rede social brasileira. Esta política se
                aplica a todo mundo que cria uma conta ou usa o VORTEX, seja
                pelo site ou pelo aplicativo Android. O responsável pelo
                tratamento dos dados descritos aqui é {RESPONSAVEL}.
              </p>
            </section>

            <section id="dados-coletados">
              <h2 className="font-syne text-xl font-semibold text-white">
                2. Quais dados coletamos
              </h2>
              <p className="mt-3">Coletamos três tipos de dados:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>
                  <span className="text-neutral-200">Dados de cadastro:</span>{" "}
                  nome, nome de usuário, e-mail e senha (armazenada de forma
                  criptografada, nunca em texto puro).
                </li>
                <li>
                  <span className="text-neutral-200">Conteúdo que você cria:</span>{" "}
                  posts, fotos, comentários e mensagens diretas enviadas a
                  outros usuários.
                </li>
                <li>
                  <span className="text-neutral-200">Dados de uso e assinatura:</span>{" "}
                  plano ativo (Free, BOOST ou MEGA BOOST), histórico de
                  pagamentos via Pix e informações técnicas básicas
                  (endereço IP, tipo de dispositivo, data/hora de acesso)
                  usadas para segurança e para impedir abuso.
                </li>
              </ul>
              <p className="mt-3">
                Não coletamos dados de cartão de crédito — os pagamentos via
                Pix são processados por um provedor de pagamento terceiro,
                que tem sua própria política de privacidade.
              </p>
            </section>

            <section id="como-usamos">
              <h2 className="font-syne text-xl font-semibold text-white">
                3. Como usamos os seus dados
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>Criar e manter sua conta e seu perfil público.</li>
                <li>Exibir seus posts e mensagens para os destinatários certos.</li>
                <li>Processar assinaturas dos planos BOOST e MEGA BOOST.</li>
                <li>Prevenir spam, fraude e uso indevido da plataforma.</li>
                <li>Responder denúncias e aplicar as Diretrizes de Conteúdo.</li>
                <li>
                  Cumprir obrigações legais, quando exigido por lei ou
                  ordem judicial.
                </li>
              </ul>
              <p className="mt-3">
                Não usamos seus dados para treinar modelos de terceiros nem
                vendemos seus dados para ninguém.
              </p>
            </section>

            <section id="compartilhamento">
              <h2 className="font-syne text-xl font-semibold text-white">
                4. Com quem compartilhamos
              </h2>
              <p className="mt-3">
                Compartilhamos dados apenas com os prestadores de serviço
                que operam a infraestrutura do VORTEX, todos sob contrato:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>
                  <span className="text-neutral-200">Supabase</span> —
                  banco de dados, autenticação e armazenamento de arquivos.
                </li>
                <li>
                  <span className="text-neutral-200">Vercel</span> —
                  hospedagem da aplicação.
                </li>
                <li>
                  <span className="text-neutral-200">Provedor de pagamento Pix</span>{" "}
                  — processamento das assinaturas.
                </li>
              </ul>
              <p className="mt-3">
                Conteúdo que você publica publicamente (posts, perfil) fica
                visível a outros usuários do VORTEX por natureza do produto
                — isso não é "compartilhamento com terceiros" no sentido da
                LGPD, é o próprio funcionamento da rede social.
              </p>
            </section>

            <section id="base-legal">
              <h2 className="font-syne text-xl font-semibold text-white">
                5. Base legal (LGPD)
              </h2>
              <p className="mt-3">
                Tratamos seus dados com base em três hipóteses legais do
                art. 7º da LGPD: (1) execução de contrato — para fornecer o
                serviço que você contratou ao criar a conta; (2)
                consentimento — para funcionalidades opcionais, como
                notificações; e (3) legítimo interesse — para prevenir
                fraude e abuso na plataforma.
              </p>
            </section>

            <section id="seus-direitos">
              <h2 className="font-syne text-xl font-semibold text-white">
                6. Seus direitos
              </h2>
              <p className="mt-3">Como titular dos dados, você pode a qualquer momento:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-400">
                <li>Confirmar se tratamos seus dados e acessá-los.</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                <li>Solicitar a exclusão da sua conta e dos seus dados.</li>
                <li>Pedir a portabilidade dos seus dados a outro serviço.</li>
                <li>Revogar consentimentos dados anteriormente.</li>
              </ul>
              <p className="mt-3">
                Você pode excluir sua conta diretamente nas configurações do
                VORTEX, ou solicitar qualquer um desses direitos pelo e-mail
                em{" "}
                <a
                  href={`mailto:${EMAIL_CONTATO}`}
                  className="text-[#c8f23c] hover:underline"
                >
                  {EMAIL_CONTATO}
                </a>
                . Respondemos em até 15 dias.
              </p>
            </section>

            <section id="retencao">
              <h2 className="font-syne text-xl font-semibold text-white">
                7. Por quanto tempo guardamos
              </h2>
              <p className="mt-3">
                Guardamos seus dados enquanto sua conta estiver ativa. Ao
                excluir a conta, removemos os dados pessoais e o conteúdo
                associado em até 30 dias, exceto o que formos obrigados a
                manter por lei (por exemplo, registros de pagamento, por
                exigência fiscal).
              </p>
            </section>

            <section id="seguranca">
              <h2 className="font-syne text-xl font-semibold text-white">
                8. Segurança
              </h2>
              <p className="mt-3">
                Usamos criptografia em trânsito (HTTPS) em toda a
                plataforma, senhas com hash e políticas de acesso a nível de
                linha (Row Level Security) no banco de dados, para que cada
                usuário só acesse o que tem permissão de acessar. Nenhum
                sistema é 100% imune a falhas, mas trabalhamos ativamente
                pra reduzir esse risco.
              </p>
            </section>

            <section id="menores">
              <h2 className="font-syne text-xl font-semibold text-white">
                9. Menores de idade
              </h2>
              <p className="mt-3">
                O VORTEX não é direcionado a menores de 18 anos e não
                coletamos intencionalmente dados de crianças. Se você é pai,
                mãe ou responsável e acredita que um menor forneceu dados ao
                VORTEX, entre em contato pelo e-mail abaixo para que
                possamos remover a conta.
              </p>
            </section>

            <section id="cookies">
              <h2 className="font-syne text-xl font-semibold text-white">
                10. Cookies e sessão
              </h2>
              <p className="mt-3">
                Usamos cookies e armazenamento local estritamente
                necessários para manter você conectado e lembrar suas
                preferências. Não usamos cookies de rastreamento
                publicitário de terceiros.
              </p>
            </section>

            <section id="alteracoes">
              <h2 className="font-syne text-xl font-semibold text-white">
                11. Alterações nesta política
              </h2>
              <p className="mt-3">
                Podemos atualizar esta política quando o VORTEX mudar. Se a
                mudança for relevante, avisaremos dentro do app antes de
                ela valer.
              </p>
            </section>

            <section id="contato" className="pb-16">
              <h2 className="font-syne text-xl font-semibold text-white">
                12. Contato
              </h2>
              <p className="mt-3">
                Dúvidas, solicitações ou reclamações sobre seus dados podem
                ser enviadas para{" "}
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
