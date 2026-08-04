# VORTEX — Lote Landing Page

Landing page real pra substituir o redirect de `app/page.tsx`. Vem com:

- `app/page.tsx` — novo, server component, monta as seções
- `app/components/BlackHoleBackground.tsx` — **versão reescrita** (shader GPU, event horizon, photon ring, doppler beaming, lensing, jets helicoidais) — substitui o antigo
- `app/components/LandingNav.tsx` — nav fixa, vira sólida ao rolar
- `app/components/LandingHero.tsx` — hero com o BH em background + grain overlay
- `app/components/FeatureCard.tsx` — card reutilizável do bento grid
- `app/components/LandingFeatures.tsx` — seção bento (6 colunas, layout assimétrico)
- `app/components/LandingShowcase.tsx` — mockups de feed (texto / imagem / poll) com reveal on scroll
- `app/components/LandingCTA.tsx` — CTA final
- `app/components/LandingFooter.tsx` — footer

## Como aplicar

Extrai o zip direto na raiz do projeto (`C:\dev\vortex`). Os caminhos internos batem com a estrutura `app/`, então os arquivos vão parar nos lugares certos e sobrescrevem o que precisar (BH antigo + page.tsx).

```powershell
Expand-Archive -Path "$HOME\Downloads\vortex-landing.zip" -DestinationPath C:\dev\vortex -Force
```

Depois commita:

```powershell
git add . ; git commit -m "update" ; git push
```

## O que esperar

- `/` agora mostra a landing (com o BH no hero, grain overlay sutil, bento grid de features, mockups de feed, CTA, footer).
- O `app/components/BlackHoleBackground.tsx` antigo é substituído. A API continua a mesma (`<BlackHoleBackground intensity={0.4} particleCount={2500} />`), então o que já usa o componente (`/login`, `/feed`) continua funcionando — só renderiza muito melhor.
- Sem auth check no server (a `lib/supabase.ts` atual é só client-side). Quem tá logado clica em "Ir para o feed" no hero.

## Próximo lote

Quando quiser, bora pra:
1. Remover o BH do feed e perfis (substituir por gradiente sutil)
2. Posts fixados (SQL + UI no perfil)
3. (Mais features do tier 1 que eu listei antes)
