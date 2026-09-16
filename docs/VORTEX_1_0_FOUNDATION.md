# VORTEX 1.0 — Foundation Update

Release de consolidação antes do próximo ciclo de features.

## Produto e UX
- Feed com cursor pagination e botão de refresh, sem assinatura global de todos os posts.
- Busca fuzzy/indexada de posts, usuários e comunidades.
- Editor rich-text baseado em Selection/Range, sem document.execCommand.
- Chat com indicador de digitação e ✓/✓✓ de leitura.
- Imagens do feed usando Next Image.
- Suporte a prefers-reduced-motion e otimizações de renderização de cards.
- Limites de upload exibidos alinhados ao teto técnico atual do projeto.

## Segurança e dados
- RLS otimizada com initPlans para auth.uid().
- Helpers privilegiados movidos para schema private e APIs públicas reduzidas.
- Ownership obrigatório ao criar/editar posts.
- Policies de conversas, mensagens, planos, perfis, anúncios e reações consolidadas.
- Contadores de comentários/reposts sincronizados por triggers.
- Comprovantes Pix privados e abertos por signed URL de 60 segundos somente para admin.
- Policy de criação de notificações limitada a contextos válidos.
- CSP, HSTS e origens de imagem restritas.

## Plataforma
- sitemap.xml, robots.txt, Open Graph image e metadata por rota pública.
- Rotas privadas com no-store e X-Robots-Tag.
- Service Worker versionado.
- CI com typecheck, smoke tests e build.

## Supabase migrations
- 20260916130716_vortex_foundation_release.sql
- 20260916130832_vortex_policy_consolidation.sql
- 20260916131430_vortex_counter_and_notification_hardening.sql
