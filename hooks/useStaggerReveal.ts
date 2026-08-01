// hooks/useStaggerReveal.ts
// Anima a entrada dos filhos diretos de um container em cascata.
// Uso: posts do feed, campos do formulário de login/cadastro.
//
// const listRef = useStaggerReveal([posts.length]) // reroda quando o array muda
// <div ref={listRef}> {posts.map(...)} </div>

"use client"

import { useEffect, useRef } from "react"
import { staggerFadeInUp } from "@/lib/animations"

export function useStaggerReveal(deps: React.DependencyList = [], staggerMs = 60) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const children = Array.from(el.children) as Element[]
    if (children.length === 0) return
    staggerFadeInUp(children, { staggerMs })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return containerRef
}
