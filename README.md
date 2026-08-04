# VORTEX

Rede social moderna — feed, perfis, comunidades, mensagens em tempo real e monetização por planos, com identidade visual escura e neon.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) — autenticação, banco de dados (Postgres) e storage
- Tailwind CSS 4
- Zustand (estado global) · Three.js (efeitos visuais) · Anime.js (microinteracoes)

## Funcionalidades

- Autenticação e perfis com sistema de seguir
- Feed com scroll infinito, curtidas, comentários aninhados e stories
- Comunidades e mensagens diretas (Supabase Realtime)
- Notificações e busca
- Bloqueio de usuários
- Planos em camadas (Free / Boost / Mega Boost) com sistema de anúncios
- Painel administrativo

## Rodando localmente

Pré-requisitos: Node.js 20+ e uma conta/projeto no [Supabase](https://supabase.com/).

```bash
git clone https://github.com/gabriel31249090/VORTEX.git
cd VORTEX
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima (pública) do projeto Supabase |

### Banco de dados

As migrations SQL ficam em [`supabase/migrations/`](./supabase/migrations), em ordem cronológica. Rode cada uma no SQL Editor do seu projeto Supabase (ou via `supabase db push` se estiver usando a Supabase CLI).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | Roda o ESLint |

## Deploy

O projeto está configurado para deploy na [Vercel](https://vercel.com/) — basta conectar o repositório e configurar as mesmas variáveis de ambiente acima no painel do projeto.
