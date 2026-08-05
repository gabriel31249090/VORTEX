# VORTEX

**VORTEX** é uma rede social moderna com identidade escura e neon, construída para oferecer experiência de feed social, perfis, comunidades, mensagens em tempo real e monetização por planos.

---

## Visão geral

O projeto combina recursos de aplicativos sociais com UX interativa e performance moderna:

- Feed com recursos sociais (curtidas, comentários e stories)
- Comunidades com conteúdo privado e público
- Mensagens diretas e conversas individuais
- Busca, notificações e sistema de bloqueio
- Planos pagos com anúncios e camadas de recursos
- Painel administrativo para gerenciamento de reports

---

## Tecnologias

- Next.js 16.2.7 (App Router)
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Supabase (Autenticação, Postgres, Storage, Realtime)
- Zustand (estado global)
- Three.js (efeitos visuais)
- Anime.js (microinterações)
- Lucide React (ícones)

---

## Recursos principais

### Funcionalidades do usuário

- Cadastro e login com autenticação Supabase
- Perfil de usuário com seguidores e informações sociais
- Feed com posts, likes, comentários e stories
- Página de posts única com conteúdo dinâmico
- Salvar posts para leitura futura
- Notificações em tempo real
- Busca por usuários, posts e comunidades
- Configurações de perfil e bloqueio de usuários

### Comunidades e mensagens

- Navegação por comunidades e páginas de comunidade
- Direct messages entre usuários
- Chat individual com histórico de conversas
- Página de mensagens e tela de conversa

### Monetização e administração

- Planos em camadas (Free / Boost / Mega Boost)
- Sistema de anúncios e vantagens por plano
- Área administrativa para relatórios e moderação

---

## Estrutura do projeto

- `app/` — rotas e páginas com App Router do Next.js
- `app/components/` — componentes reutilizáveis de layout e UI
- `lib/` — utilitários e cliente Supabase
- `public/` — recursos estáticos
- `supabase/migrations/` — migrations SQL para o banco de dados

---

## Rotas visíveis

O projeto contém páginas principais como:

- `/` — landing page
- `/feed` — feed principal
- `/login` — login
- `/register` — cadastro
- `/messages` — lista de conversas
- `/messages/[id]` — conversa individual
- `/notifications` — notificações
- `/post/[id]` — post individual
- `/post/new` — criador de post
- `/profile/[username]` — perfil de usuário
- `/profile/[username]/follows` — seguidores / seguindo
- `/communities` — lista de comunidades
- `/community/[slug]` — comunidade específica
- `/saved` — conteúdo salvo
- `/search` — busca global
- `/settings` — configurações de conta
- `/settings/blocked` — usuários bloqueados
- `/admin` — painel administrativo
- `/admin/reports` — relatórios de moderação

---

## Como rodar localmente

Pré-requisitos:

- Node.js 20+
- Conta/projeto no [Supabase](https://supabase.com/)

Passos:

```bash
git clone https://github.com/gabriel31249090/VORTEX.git
cd VORTEX
npm install
cp .env.example .env.local
```

Preencha as variáveis do `.env.local` com os valores do seu projeto Supabase.

```bash
npm run dev
```

Abra em `http://localhost:3000`.

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima pública do Supabase |
| `OPENAI_API_KEY` | Chave da API OpenAI para moderação automática (opcional) |

> Caso o projeto use mais variáveis internas, configure-as conforme necessário no `.env.local`.

---

## Banco de dados e migrations

As migrations estão em `supabase/migrations/`.

Use o SQL Editor do Supabase ou a CLI para aplicar:

```bash
supabase db push
```

> Se preferir, execute cada arquivo SQL manualmente no editor de banco de dados.

---

## Scripts úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia o app em modo produção |
| `npm run lint` | Roda o ESLint para checar código |

---

## Deploy

O projeto é compatível com deploy na Vercel.

1. Conecte o repositório ao Vercel
2. Configure as mesmas variáveis de ambiente do `.env.local`
3. Defina o comando de build como `npm run build`
4. Execute o deploy

---

## Notas finais

Este projeto foi construído com foco em experiência de usuário, estética escura/neon e integração com Supabase para backend e dados em tempo real.

Se quiser alterações específicas no README (por exemplo, detalhar API, diagramas ou contribuições), posso ajustar este texto para você.
