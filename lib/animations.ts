// lib/animations.ts
// Presets de animação do VORTEX (Anime.js v4).
// Centraliza timing/easing pra manter a mesma "linguagem" de movimento
// em login, feed e qualquer outra página.

import { animate, stagger } from "animejs"

export const VORTEX_EASE = {
  in: "easeInQuad",
  out: "easeOutQuad",
  inOut: "easeInOutQuad",
} as const

// Entrada suave de baixo pra cima (usar em cards, formulários, títulos)
export function fadeInUp(target: string | Element | Element[], opts?: { delay?: number; duration?: number }) {
  return animate(target, {
    opacity: [0, 1],
    translateY: [16, 0],
    duration: opts?.duration ?? 420,
    delay: opts?.delay ?? 0,
    easing: VORTEX_EASE.out,
  })
}

// Entrada em cascata pra listas (posts do feed, campos do form)
export function staggerFadeInUp(targets: string | Element[], opts?: { staggerMs?: number; duration?: number }) {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [16, 0],
    duration: opts?.duration ?? 420,
    delay: stagger(opts?.staggerMs ?? 60),
    easing: VORTEX_EASE.out,
  })
}

// Pulso rápido (curtir post, confirmar ação) — usa a cor accent do VORTEX
export function likeBurst(target: string | Element) {
  return animate(target, {
    scale: [1, 1.35, 1],
    duration: 380,
    easing: "easeOutElastic(1, .6)",
  })
}

// Shake leve (erro de login/validação)
export function shakeError(target: string | Element) {
  return animate(target, {
    translateX: [0, -8, 8, -6, 6, -3, 3, 0],
    duration: 420,
    easing: "easeInOutSine",
  })
}
