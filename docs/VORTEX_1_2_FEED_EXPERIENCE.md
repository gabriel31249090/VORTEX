# VORTEX 1.2 — Feed Experience Update

Refinamento baseado na visualização real do VORTEX 1.1 em desktop.

## Layout
- Shell do feed ocupa melhor monitores de 1366–1600px.
- Coluna central passa a crescer de forma responsiva.
- Right rail usa largura adaptativa e continua presente em resoluções intermediárias.
- Breakpoints foram reequilibrados para reduzir espaço morto sem esmagar o conteúdo.

## Feed sorting
- Recentes: ordem cronológica.
- Em alta: engajamento ponderado por recência.
- Mais votados: pontuação combinando votos, comentários e republicações.
- Ordenação executada no PostgreSQL por `feed_page_v2`.
- Cursor composto por score, timestamp e post ID.
- Preferência de ordenação persistida no navegador.

## Stories
- Barra reduzida para aproximadamente metade da altura anterior.
- Avatares compactos.
- Estado vazio não cria mais um painel alto.
- Labels são removidas no mobile para preservar espaço.

## Descoberta
- Nova RPC `feed_discovery`.
- Comunidades ranqueadas por membros e atividade recente.
- Sugestões de perfis excluem usuário atual, pessoas já seguidas e bloqueios.
- O fim do feed virou uma seção de descoberta.
- Feeds vazios também apresentam caminhos para encontrar conteúdo.

## Right rail
- Hero menor.
- Ranking de comunidades.
- Contagem de membros e atividade recente.
- Sugestões de pessoas.
- Atalhos compactados.

## Posts
- Título, trecho e ações ganharam pequenos ajustes de legibilidade.
- Hover e bordas ficaram mais discretos.
- Densidade aumentada sem retornar ao visual de cards gigantes.
