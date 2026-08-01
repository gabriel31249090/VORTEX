'use client'

/**
 * useAnimatedCounter — smoothly animates a number changing (e.g. like count)
 * using the Anime.js already installed in the project, instead of pulling in
 * framer-motion just for a digit-flip effect.
 *
 * Usage:
 *   const display = useAnimatedCounter(post.likes_count)
 *   <span>{display}</span>
 */

import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

export function useAnimatedCounter(value: number, duration = 420) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const proxyRef = useRef({ v: value })

  useEffect(() => {
    if (prevRef.current === value) return
    const proxy = proxyRef.current
    proxy.v = prevRef.current

    animate(proxy, {
      v: value,
      duration,
      easing: 'easeOutQuad',
      update: () => setDisplay(Math.round(proxy.v)),
      complete: () => setDisplay(value),
    })

    prevRef.current = value
  }, [value, duration])

  return display
}

export default useAnimatedCounter
