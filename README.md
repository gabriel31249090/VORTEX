# VORTEX — Lote de polimento (responsivo + perf + visual)

Pacote com 9 arquivos que juntos matam o "look de vibe coding" do site,
deixam ele **mais leve** (substitui o BlackHoleBackground pesado no feed por um
gradiente CSS zero-JS) e **totalmente responsivo** (bento colapsa em mobile,
nav ganha hamburger menu, grids empilham).

## 📦 Arquivos

| Arquivo | O que faz |
|---|---|
| `app/globals.css` | Overhaul visual: grain overlay, scrollbar slim, selection verde, smooth scroll, bento responsivo, mobile menu utilities, vignette. **Substitui o anterior inteiro.** |
| `app/components/BackgroundGradient.tsx` | **NOVO.** Fundo CSS-only (0kb JS, 0 WebGL). Substitui o BlackHoleBackground pesado no feed. Variantes: feed / profile / messages / community / subtle. |
| `app/components/BlackHoleBackground.tsx` | **Otimizado.** Auto-detecta mobile e reduz partículas (1800 vs 4500), pausa render quando aba tá escondida (Page Visibility API), cleanup completo com WebGL lose context, DPR cap agressivo em mobile. Default reduzido de 8000 → 4500. |
| `app/components/MobileMenu.tsx` | **NOVO.** Menu hamburger fullscreen, scroll lock, fecha com Esc, focus trap. |
| `app/components/LandingNav.tsx` | Nav com hamburger no mobile, logo com dot pulsante, hover states melhores. |
| `app/components/LandingHero.tsx` | Grid 1.2fr/1fr, melhor hierarquia tipográfica, vignette pra legibilidade, stats em linha. |
| `app/components/LandingFeatures.tsx` | Bento colapsa pra 1 coluna no mobile via `.vtx-bento`, badge com uppercase tracking, hierarchy forte. |
| `app/components/LandingShowcase.tsx` | Grid responsivo auto-fit, melhor contraste, mockup de poll com barra animada. |
| `app/components/LandingFooter.tsx` | Grid 4 col desktop → 2 col tablet → 1 col mobile, link do GitHub estilizado. |
| `app/feed/page.tsx` | **Troca BlackHoleBackground → BackgroundGradient.** Adiciona SkeletonCard pra loading state, EmptyState pra vazio. Mobile-first, sem 3D pesado. |
| `README.md` | Este arquivo. |

## 🚀 Como aplicar

Roda os comandos de dentro de `C:\dev\vortex`:

```powershell
Expand-Archive -Path "$HOME\Downloads\vortex-polish.zip" -DestinationPath C:\dev\vortex -Force ; git add . ; git commit -m "update" ; git push
```

Tudo de uma vez. O zip extrai direto na raiz do projeto sobrescrevendo os
arquivos certos. Os caminhos internos do zip batem com `app/`.

## 🛠️ Comandos separados (se preferir)

```powershell
# 1. Extrair
Expand-Archive -Path "$HOME\Downloads\vortex-polish.zip" -DestinationPath C:\dev\vortex -Force

# 2. Commit + push
git add . ; git commit -m "update" ; git push
```

Lembrando que seu PowerShell não aceita `&&` — por isso o `;`.

## ✅ O que esperar depois do deploy

- O site carrega **muito mais rápido** no feed (sem WebGL).
- A bateria do mobile agradece — antes o BlackHole rodava em todo scroll, agora
  só nas landing/login/register.
- O bento do `/` (seções de features) vira lista vertical no celular.
- O nav ganha ☰ no celular que abre menu fullscreen.
- Grain overlay SVG aparece em todo o site (4% opacidade, mix-blend overlay) —
  detalhe que mata o "render limpo de IA".
- O scrollbar fica slim (8px) com thumb verde no hover.
- Selection de texto fica verde neon.

## 🔍 O que NÃO mexe

- Não tem mudança de SQL — banco de dados intacto.
- Não muda comportamento de auth / login / signup.
- Não altera API do BlackHoleBackground (mesma props: `intensity`, `particleCount`,
  `discColor`, `jetColor`, `cinematic`).

## ⚠️ Observações

- Se você ver "Warning: Prop `style` did not match" no console durante o dev, é
  cache do Next. Mata o `.next/` e reinicia: `Remove-Item -Recurse .next ; npm run dev`
- Os warnings de LF/CRLF que aparecem depois do `git add` são cosmético,
  pode ignorar.
