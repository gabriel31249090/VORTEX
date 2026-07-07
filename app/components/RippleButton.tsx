'use client'

// components/RippleButton.tsx
// Botão com efeito de ondulação (ripple) ao clicar, estilo Material Design.
// Uso: troca <button {...props}> por <RippleButton {...props}> — aceita
// todas as props normais de <button> (onClick, style, className, disabled, etc.)
// e adiciona o efeito por cima sem mudar nenhum comportamento.

import { useState, useRef, type ButtonHTMLAttributes, type MouseEvent } from 'react'

type Ripple = { id: number; x: number; y: number; size: number }

type RippleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  rippleColor?: string
}

export default function RippleButton({
  onClick,
  rippleColor = 'rgba(255,255,255,0.45)',
  style,
  children,
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const idRef = useRef(0)

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    idRef.current += 1
    const id = idRef.current
    setRipples(prev => [...prev, { id, x, y, size }])

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 650)

    onClick?.(e)
  }

  return (
    <button
      {...props}
      onClick={handleClick}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {children}
      {ripples.map(r => (
        <span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            borderRadius: '50%',
            background: rippleColor,
            transform: 'scale(0)',
            animation: 'vtx-ripple-anim 0.6s ease-out',
            pointerEvents: 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes vtx-ripple-anim {
          to { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </button>
  )
}