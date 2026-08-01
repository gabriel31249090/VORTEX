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
    <div style={{ width: "100%", height: fontSize * 1.4 }}>
      <ScrambleText
        words={text}
        color="#c8f23c"
        font={{
          fontFamily: "Syne",
          fontSize,
          fontWeight: 700,
          textAlign: "left",
          lineHeight: "1em",
          letterSpacing: "0.02em",
        }}
        enterAnimation={{
          mode: "oneLine",
          restState: "solid",
          replay: false,
          position: "above",
          scrambleIntensity: 80,
          ease: { type: "tween", duration: 1.4, ease: "easeOut" },
          flickerEnabled: false,
        }}
        hoverAnimation={{ type: "none" }}
      />
    </div>
  )
}
