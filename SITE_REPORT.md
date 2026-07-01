# Relatório do site VORTEX

## Visão geral
O VORTEX é uma rede social construída com Next.js App Router e Supabase. O site oferece autenticação, feed de posts, criação de conteúdo multimídia, comunidades, perfis, planos pagos, notificações e painel administrativo.

## Tecnologias usadas
- Next.js 16.2.7 (App Router)
- React 19.2.4
- Supabase (auth, database, realtime, storage)
- react-hot-toast
- lucide-react
- Zustand (dependência presente)
- Tailwind CSS (instalado, mas a maior parte do estilo é inline)

## Arquitetura principal
- `app/layout.tsx`: layout global, fonts e `Toaster`
- `app/page.tsx`: redireciona para `/login`
- `lib/supabase.ts`: cliente Supabase usando `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `app/components/Nav.tsx`: sidebar desktop com navegação, notificações e menu do usuário
- `app/components/BottomNav.tsx`: navegação mobile inferior

## Rotas e funcionalidades
### Autenticação
- `/login`: login por email/senha
- `/register`: cadastro com validação e criação de perfil

### Feed
- `/feed`: feed principal com abas `Geral` e `Seguindo`
- Infinite scroll com `IntersectionObserver`
- Atualização em tempo real para novos posts
- Likes e compartilhamento de post

### Publicação
- `/post/new`: criação de post com conteúdo e upload de mídia
- Editor de texto simples com formatação básica
- Suporte a imagens, vídeos, áudio e GIFs
- Possibilidade de publicar dentro de uma comunidade

### Post individual
- `/post/[id]`: visualização de post e comentários
- comentários encadeados e respostas
- autocompletar de menções com `@username`
- exclusão de comentários e posts pelo autor

### Perfil de usuário
- `/profile/[username]`: mostra perfil do usuário, posts, comunidade e seguidores
- Botão seguir/deixar de seguir
- Destaque de plano do usuário (`free`, `boost`, `mega`)

### Comunidades
- `/communities`: lista, busca, criação e gerenciamento de comunidades
- `/community/[slug]`: página da comunidade com feed, membros, estatísticas e moderação

### Busca
- `/search`: pesquisa de posts, usuários e comunidades
- result tabs com filtros e destaques

### Notificações
- `/notifications`: lista de notificações, marcação como lido e limpeza de notificações

### Salvos
- `/saved`: posts salvos de cada usuário

### Configurações
- `/settings`: edição de perfil, avatar, banner, bio, logout

### Planos
- `/pricing`: seleção de plano `free`, `boost`, `mega`
- grava pedidos em `plan_requests`
- upload de comprovante de pagamento

### Administração
- `/admin`: painel acessível somente a admins
- valida `is_admin` em perfil
- aprova ou rejeita pedidos de plano
- lista usuários e altera planos manualmente

## Modelo de dados estimado
- `profiles`: usuários e planos
- `posts`: posts com mídia e contagem de interações
- `comments`: comentários e respostas
- `likes`: likes de posts
- `follows`: seguidores / seguindo
- `notifications`: notificações do usuário
- `saved_posts`: posts salvos
- `communities`: comunidades públicas e privadas
- `community_members`: membros de comunidades
- `plan_requests`: pedidos de upgrade de plano

## UX e estilo
- UI escura com tons verde-limão e roxo
- Tipografia `Syne`
- Muitas animações e efeitos visuais em cards e botões
- Foco em experiência social e fluxo de criação de conteúdo

## Pontos fortes
- Rede social funcional com feed, comunidades, notificações e planos
- Uso consistente de Supabase para auth, dados e realtime
- Proteção de rotas com redirecionamento para login
- Painel admin e gerenciamento de planos

## Oportunidades de melhoria
- Extrair estilos inline para componentes ou classes reutilizáveis
- Melhor tratamento de erros e estados de carregamento
- Refatorar lógica de data fetching para hooks ou abstrações reutilizáveis
- Consolidar uso de `Zustand` se for necessário para estado global

## Conclusão
O VORTEX é um app bem estruturado e completo para uma rede social. A implementação cobre os principais fluxos sociais, monetização e administração, com foco em conteúdo multimídia e experiência do usuário.
