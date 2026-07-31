"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { animate } from "animejs"

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayChildren, setDisplayChildren] = useState(children)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current === pathname) {
      setDisplayChildren(children)
      return
    }

    const el = containerRef.current
    if (!el) {
      setDisplayChildren(children)
      prevPathname.current = pathname
      return
    }

    // Saida: fade + leve movimento pra cima
    animate(el, {
      opacity: [1, 0],
      translateY: [0, -12],
      duration: 220,
      easing: "easeInQuad",
      complete: () => {
        setDisplayChildren(children)
        prevPathname.current = pathname

        // Entrada: fade + vem de baixo
        animate(el, {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 320,
          easing: "easeOutQuad",
        })
      },
    })
  }, [pathname, children])

  return (
    <div ref={containerRef} style={{ opacity: 1 }}>
      {displayChildren}
    </div>
  )
}
