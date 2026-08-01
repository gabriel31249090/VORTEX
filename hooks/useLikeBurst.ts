// hooks/useLikeBurst.ts
// Dispara uma animação de "pulso elástico" no elemento clicado (botão de curtir).
// Uso:
//   const burst = useLikeBurst()
//   <button ref={burst.ref} onClick={() => { burst.play(); handleLike() }}>

"use client"

import { useRef } from "react"
import { likeBurst } from "@/lib/animations"

export function useLikeBurst<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null)

  const play = () => {
    if (ref.current) likeBurst(ref.current)
  }

  return { ref, play }
}
