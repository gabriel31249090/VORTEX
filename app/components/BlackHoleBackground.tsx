'use client'

/**
 * BlackHoleBackground — shader-driven Three.js black hole for VORTEX.
 *
 * Camadas:
 *   - Event horizon        (esfera preta no centro)
 *   - Photon sphere        (anel brilhante — "Einstein ring" do Interstellar)
 *   - Accretion disc       (espiral com Doppler beaming, animado na GPU)
 *   - Relativistic jets    (fluxo helicoidal, animado na GPU)
 *   - Starfield de fundo   (estrelas distantes, dá profundidade)
 *
 * Tudo roda num vertex shader. A cada frame o JS só atualiza UM uniform
 * (uTime). Antes: 4000 partículas × 3 trig calls por frame em JS.
 * Agora: 8000+ partículas custam o mesmo que 500 no CPU.
 *
 * Uso:
 *   import dynamic from 'next/dynamic'
 *   const BlackHoleBackground = dynamic(
 *     () => import('@/components/BlackHoleBackground'),
 *     { ssr: false }
 *   )
 *
 *   <div style={{ position: 'relative', minHeight: '100vh' }}>
 *     <BlackHoleBackground />
 *     <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
 *   </div>
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type BlackHoleBackgroundProps = {
  className?: string
  /** Total de partículas (todas as camadas). Default 8000. */
  particleCount?: number
  /** 0–1, brilho global. */
  intensity?: number
  /** Cor do disco + photon ring (default VORTEX green). */
  discColor?: string
  /** Cor dos jatos (default VORTEX purple). */
  jetColor?: string
  /** Se true, mantém rotação da câmera mais dramática. */
  cinematic?: boolean
}

const VERTEX = /* glsl */ `
  attribute float aRadius;     // raio orbital base
  attribute float aAngle0;     // ângulo inicial 0..TAU
  attribute float aHeight;     // pequeno offset Y (espessura do disco)
  attribute float aType;       // 0=core, 1=disc, 2=jet
  attribute float aSize;       // tamanho base do ponto
  attribute float aSide;       // +1 / -1 pros jatos
  attribute float aSeed;       // 0..1, random seed

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntensity;
  uniform float uPull;
  uniform float uDiscSpeed;
  uniform float uJetSpeed;
  uniform float uCinematic;

  varying float vBrightness;
  varying float vDoppler;
  varying float vType;
  varying float vRadius;
  varying float vAngle;
  varying float vHeight;

  #define TAU 6.28318530718
  #define PI  3.14159265359

  void main() {
    float angle;
    vec3 pos;
    float brightness = 1.0;
    float doppler = 0.5;

    if (aType < 0.5) {
      // ── CORE ── halo denso perto do horizonte
      angle = aAngle0 + uTime * 0.4;
      float r = 0.5 + aRadius * 0.6;
      pos = vec3(cos(angle) * r, aHeight * 0.05, sin(angle) * r);
      brightness = 2.0;
    } else if (aType < 1.5) {
      // ── DISC ── rotação kepleriana (mais rápido perto do centro)
      float speed = uDiscSpeed / pow(aRadius + 0.6, 0.65);
      angle = aAngle0 + uTime * speed;
      pos = vec3(cos(angle) * aRadius, aHeight, sin(angle) * aRadius);
      brightness = 1.4 / (aRadius * 0.16 + 0.45);
      // Doppler beaming: lado se aproximando da câmera fica mais brilhante
      // Câmera tá em (0, 7, 26); lado brilhante = ângulo próximo de π/2
      // (partícula em +x movendo em +z = "vem pra câmera")
      doppler = clamp(0.35 + 0.65 * (0.5 + 0.5 * cos(angle - 1.2)), 0.0, 1.0);
    } else {
      // ── JETS ── fluxo helicoidal subindo pelos polos
      float cycle = mod(aSeed * 36.0 + uTime * uJetSpeed, 36.0);
      float y = (2.5 + cycle) * aSide;
      float jetR = 0.25 + cycle * 0.14 + aRadius * 0.3;
      float swirl = cycle * 1.4 + aAngle0 * 3.0;
      pos = vec3(cos(swirl) * jetR, y, sin(swirl) * jetR);
      brightness = (1.0 - cycle / 36.0) * 1.6;
      doppler = 0.7;
    }

    // Gravitational lensing warp perto do horizonte
    float dist = length(pos) + 0.001;
    float warp = 1.0 - min(1.0, uPull / dist);
    pos *= warp;

    // Lensing fake: parte de trás do disco "sobe" por cima da sombra
    if (aType > 0.5 && aType < 1.5 && abs(pos.y) < 0.6) {
      float bend = smoothstep(6.0, 22.0, dist) * sign(pos.y + 0.001) * 0.45;
      pos.y += bend * abs(sin(angle + 1.57));
    }

    // Cinematic: micro-ondulação na câmera virtual (só nos uniforms visuais)
    pos += vec3(
      sin(uTime * 0.13 + aAngle0) * 0.05 * uCinematic,
      cos(uTime * 0.11) * 0.04 * uCinematic,
      0.0
    );

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Tamanho do ponto: atenua pela distância, dá boost pelo Doppler
    gl_PointSize = aSize * uPixelRatio * (340.0 / -mv.z) * (0.7 + doppler * 0.7);

    vBrightness = brightness * uIntensity;
    vDoppler = doppler;
    vType = aType;
    vRadius = aRadius;
    vAngle = angle;
    vHeight = aHeight;
  }
`

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vBrightness;
  varying float vDoppler;
  varying float vType;
  varying float vRadius;
  varying float vAngle;
  varying float vHeight;

  uniform vec3 uDiscColor;
  uniform vec3 uCoreColor;
  uniform vec3 uJetColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Ponto redondo com falloff suave + hot center
    float alpha = smoothstep(0.5, 0.0, d);
    alpha = pow(alpha, 1.6);
    float hot = pow(1.0 - d * 2.0, 4.0);

    vec3 color;
    float t = vType;

    if (t < 0.5) {
      // CORE — quase branco-esverdeado
      color = uCoreColor + vec3(0.3, 0.4, 0.2) * hot;
    } else if (t < 1.5) {
      // DISC — Doppler shift: lado escuro fica alaranjado/vermelho
      // (redshift), lado brilhante fica branco-esverdeado (blueshift)
      float shift = vDoppler;
      vec3 cool = uDiscColor * 0.18 + vec3(0.3, 0.08, 0.0);   // redshift quente
      vec3 hotC = uDiscColor * 1.6 + vec3(0.5, 0.5, 0.3);     // blueshift branco
      color = mix(cool, hotC, shift);
      // Próximo do plano médio = mais quente
      color += vec3(0.12, 0.06, 0.0) * (1.0 - clamp(abs(vHeight) * 3.0, 0.0, 1.0));
    } else {
      // JET — roxo/violeta, mais brilhante perto da base
      color = uJetColor + vec3(0.4, 0.2, 0.6) * hot * 0.5;
      color *= 0.5 + (1.0 - vRadius) * 0.7;
    }

    gl_FragColor = vec4(color * vBrightness, alpha * vBrightness * 0.95);
  }
`

export default function BlackHoleBackground({
  className,
  particleCount = 8000,
  intensity = 1,
  discColor = '#c8f23c',
  jetColor = '#8b5cf6',
  cinematic = true,
}: BlackHoleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const w = container.clientWidth
    const h = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, w / Math.max(h, 1), 0.1, 2000)
    camera.position.set(0, 7, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // ── EVENT HORIZON (esfera preta) ───────────────────────────────
    const horizonGeo = new THREE.SphereGeometry(1.6, 64, 64)
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const horizon = new THREE.Mesh(horizonGeo, horizonMat)
    scene.add(horizon)

    // ── PHOTON SPHERE (anel brilhante logo após o horizonte) ───────
    const photonGeo = new THREE.TorusGeometry(2.3, 0.08, 16, 220)
    const photonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(discColor).multiplyScalar(2.2),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const photon = new THREE.Mesh(photonGeo, photonMat)
    photon.rotation.x = Math.PI / 2
    scene.add(photon)

    // Segundo anel um pouco maior, mais sutil — depth
    const photon2Geo = new THREE.TorusGeometry(2.9, 0.04, 12, 180)
    const photon2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(discColor).multiplyScalar(1.4),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const photon2 = new THREE.Mesh(photon2Geo, photon2Mat)
    photon2.rotation.x = Math.PI / 2
    scene.add(photon2)

    // ── PARTICLE SYSTEM (disco + core + jets) ─────────────────────
    const coreCount = Math.floor(particleCount * 0.05)
    const discCount = Math.floor(particleCount * 0.72)
    const jetTotal = particleCount - coreCount - discCount
    const jetPerSide = Math.floor(jetTotal / 2)
    const count = coreCount + discCount + jetPerSide * 2

    // 'position' é obrigatório mas a posição real é computada no shader
    const positions = new Float32Array(count * 3)
    const aRadius = new Float32Array(count)
    const aAngle0 = new Float32Array(count)
    const aHeight = new Float32Array(count)
    const aType = new Float32Array(count)
    const aSize = new Float32Array(count)
    const aSide = new Float32Array(count)
    const aSeed = new Float32Array(count)

    let i = 0
    // CORE
    for (let k = 0; k < coreCount; k++, i++) {
      aRadius[i] = Math.random()
      aAngle0[i] = Math.random() * Math.PI * 2
      aHeight[i] = (Math.random() - 0.5) * 0.5
      aType[i] = 0
      aSize[i] = 5 + Math.random() * 9
      aSide[i] = 0
      aSeed[i] = Math.random()
    }
    // DISC (distribuição power — mais denso perto do centro)
    for (let k = 0; k < discCount; k++, i++) {
      const r = 2.6 + Math.pow(Math.random(), 1.7) * 26
      aRadius[i] = r
      aAngle0[i] = Math.random() * Math.PI * 2
      aHeight[i] =
        (Math.random() - 0.5) * (0.4 + Math.random() * 0.4) / (r * 0.3 + 0.4)
      aType[i] = 1
      aSize[i] = 2 + Math.random() * 4 + (r < 6 ? 3 : 0)
      aSide[i] = 0
      aSeed[i] = Math.random()
    }
    // JETS
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < jetPerSide; k++, i++) {
        aRadius[i] = Math.random()
        aAngle0[i] = Math.random() * Math.PI * 2
        aHeight[i] = 0
        aType[i] = 2
        aSize[i] = 1.5 + Math.random() * 3
        aSide[i] = s
        aSeed[i] = Math.random()
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1))
    geometry.setAttribute('aAngle0', new THREE.BufferAttribute(aAngle0, 1))
    geometry.setAttribute('aHeight', new THREE.BufferAttribute(aHeight, 1))
    geometry.setAttribute('aType', new THREE.BufferAttribute(aType, 1))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1))
    geometry.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: intensity },
        uPull: { value: 6.5 },
        uDiscSpeed: { value: 2.4 },
        uJetSpeed: { value: 7.0 },
        uCinematic: { value: cinematic ? 1 : 0 },
        uDiscColor: { value: new THREE.Color(discColor) },
        uCoreColor: { value: new THREE.Color(discColor).multiplyScalar(1.4) },
        uJetColor: { value: new THREE.Color(jetColor) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // ── STARFIELD (estrelas distantes) ────────────────────────────
    const starCount = 700
    const starPos = new Float32Array(starCount * 3)
    for (let k = 0; k < starCount; k++) {
      const r = 250 + Math.random() * 700
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos[k * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[k * 3 + 1] = r * Math.cos(phi)
      starPos[k * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ── ANIMATE ──────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let frameId = 0

    function animate() {
      const t = clock.getElapsedTime()
      material.uniforms.uTime.value = t
      // Sutil sway de câmera — não fica parado como pedra
      scene.rotation.y = Math.sin(t * 0.05) * 0.18
      scene.rotation.x = Math.cos(t * 0.04) * 0.06
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    if (reducedMotion) {
      material.uniforms.uTime.value = 0
      renderer.render(scene, camera)
    } else {
      animate()
    }

    function handleResize() {
      if (!container) return
      const cw = container.clientWidth
      const ch = container.clientHeight
      camera.aspect = cw / Math.max(ch, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      horizonGeo.dispose()
      horizonMat.dispose()
      photonGeo.dispose()
      photonMat.dispose()
      photon2Geo.dispose()
      photon2Mat.dispose()
      geometry.dispose()
      material.dispose()
      starGeo.dispose()
      starMat.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [particleCount, intensity, discColor, jetColor, cinematic])

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  )
}
