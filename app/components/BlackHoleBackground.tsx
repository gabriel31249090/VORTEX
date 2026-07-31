'use client'

/**
 * BlackHoleBackground — animated Three.js particle background for VORTEX.
 *
 * Renders an accretion disc + relativistic jets as a full-bleed background,
 * tuned to the VORTEX palette (neon green core/disc, purple jets).
 *
 * Usage:
 *   import dynamic from 'next/dynamic'
 *   const BlackHoleBackground = dynamic(() => import('@/components/BlackHoleBackground'), { ssr: false })
 *   ...
 *   <div style={{ position: 'relative', minHeight: '100vh' }}>
 *     <BlackHoleBackground intensity={0.4} particleCount={2500} />
 *     <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
 *   </div>
 *
 * Requires: npm install three
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type BlackHoleBackgroundProps = {
  className?: string
  /** Total particles across disc + jets. Lower this on mobile for performance. */
  particleCount?: number
  /** 0–1, scales point opacity/brightness. */
  intensity?: number
  /** Hue (0–1) for the disc/core. Defaults to VORTEX green (#c8f23c). */
  discHue?: number
  /** Hue (0–1) for the jets. Defaults to VORTEX purple (#8b5cf6). */
  jetHue?: number
}

export default function BlackHoleBackground({
  className,
  particleCount = 4000,
  intensity = 1,
  discHue = 0.205,
  jetHue = 0.717,
}: BlackHoleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    )
    camera.position.set(0, 6, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.appendChild(renderer.domElement)

    const count = particleCount
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.85 * intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Fixed shape controls — expose as props later if you want live tuning
    const pull = 5.0
    const spin = 2.2
    const discSize = 28.0

    const color = new THREE.Color()
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.color as THREE.BufferAttribute

    function computeFrame(time: number) {
      const tSpin = time * spin
      for (let i = 0; i < count; i++) {
        const total = count
        const pType = i % 4
        let rad = 0
        let angle = 0
        let px = 0
        let py = 0
        let pz = 0
        let h = discHue
        let s = 0.85
        let l = 0.5

        if (pType === 0) {
          const rIdx = i / (total * 0.25)
          rad = 1.5 + rIdx * 2.0
          angle = rIdx * 100.0 - tSpin * (10.0 / (rad + 0.1))
          px = Math.cos(angle) * rad
          py = (Math.random() - 0.5) * 0.2
          pz = Math.sin(angle) * rad
          h = discHue + rIdx * 0.015
          s = 0.9
          l = 0.16 / (rad + 0.1)
        } else if (pType === 1) {
          const rIdx = (i - total * 0.25) / (total * 0.5)
          const ringRad = 4.0 + rIdx * discSize
          angle = rIdx * 40.0 - tSpin * (15.0 / (ringRad + 0.1))
          px = Math.cos(angle) * ringRad
          py = Math.sin(angle * 2.0) * (2.0 / (ringRad + 0.1)) * Math.sin(time)
          pz = Math.sin(angle) * ringRad
          h = discHue - rIdx * 0.02
          s = 0.8
          l = 0.55 * (1.0 - rIdx)
        } else {
          const rIdx = (i - total * 0.75) / (total * 0.25)
          const jetZ = 3.0 + rIdx * 36.0
          const jetRad = 0.2 + rIdx * 3.5
          angle = rIdx * 20.0 + time * 8.0
          const side = pType === 2 ? 1.0 : -1.0
          px = Math.cos(angle) * jetRad
          py = jetZ * side
          pz = Math.sin(angle) * jetRad
          h = jetHue + rIdx * 0.02
          s = 0.85
          l = 0.6 * (1.0 - rIdx)
        }

        const dist = Math.sqrt(px * px + py * py + pz * pz) + 0.001
        const warp = 1.0 - Math.min(1.0, pull / dist)
        const fx = px * warp
        const fy = py * warp
        const fz = pz * warp

        posAttr.setXYZ(i, fx, fy, fz)
        color.setHSL(((h % 1) + 1) % 1, s, Math.max(0, Math.min(1, l)))
        colAttr.setXYZ(i, color.r, color.g, color.b)
      }
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
    }

    let frameId = 0
    const clock = new THREE.Clock()

    function animate() {
      const time = clock.getElapsedTime()
      computeFrame(time)
      scene.rotation.y = time * 0.025
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    if (reducedMotion) {
      // Render a single static frame instead of looping.
      computeFrame(0)
      renderer.render(scene, camera)
    } else {
      animate()
    }

    function handleResize() {
      if (!container) return
      camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [particleCount, intensity, discHue, jetHue])

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  )
}
