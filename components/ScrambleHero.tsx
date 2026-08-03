// components/ScrambleHero.tsx
// Wrapper do ScrambleText já configurado com a identidade visual do VORTEX
// (accent #c8f23c, fonte Syne). Uso sugerido: título/logo na tela de login.
//
// <ScrambleHero text="VORTEX" fontSize={64} />

"use client"

import ScrambleText from "@/app/components/ScrambleText"

export default function ScrambleHero({
  text = "VORTEX",
  fontSize = 64,
}: {
  text?: string
  fontSize?: number
}) {
  return (
    <div
      style={{
        width: "100%",
        height: fontSize * 1.4,
        fontFamily: "Syne",
        fontSize,
        fontWeight: 700,
        textAlign: "left",
        lineHeight: "1em",
        letterSpacing: "0.02em",
      }}
    >
      <ScrambleText
        text={text}
        color="#c8f23c"
        glitchColor="#c8f23c"
        duration={1.4}
        trigger="inView"
      />
    </div>
  )
}
