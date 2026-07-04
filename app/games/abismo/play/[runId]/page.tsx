'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Nav from '../../../../components/Nav'
import {
  getRun, updateRun, subscribeToRun, deleteRun, joinRun, tryStartCombat,
  type AbismoRun, type RunPlayerStats,
} from '@/lib/abismo/runSync'
import { getNode, getNodeById, markVisited, TYPE_ICON, TYPE_LABEL, type MapNode } from '@/lib/abismo/mapGenerator'
import { createCombatState, combatReducer, type CombatState } from '@/lib/abismo/combatEngine'
import { ENEMIES, BOSSES, CLASS_META, CLASS_PASSIVES } from '@/lib/abismo/constants'
import type { ClassId } from '@/lib/abismo/types'

export default function AbismoPlayPage() {
  const router = useRouter()
  const params = useParams()
  const runId = params.runId as string
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [run, setRun] = useState<AbismoRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [playingHand, setPlayingHand] = useState(false)
  const combatStateRef = useRef<CombatState | null>(null)

  // Fluxo de entrada como convidado
  const [needsToJoin, setNeedsToJoin] = useState(false)
  const [runFull, setRunFull] = useState(false)
  const [myCharacters, setMyCharacters] = useState<any[]>([])
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    combatStateRef.current = run?.combat_state ?? null
  }, [run?.combat_state])

  const isHost = run?.host_user_id === userId
  const myStats = isHost ? run?.host_stats : run?.guest_stats
  // É a minha vez de lutar? (null = ninguém tá em combate; caso contrário só quem travou a vez joga)
  const isMyTurn = !!run && !!userId && run.combat_turn_user_id === userId

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const initial = await getRun(runId)
      if (!initial) {
        toast.error('Essa run não existe mais')
        router.push('/games/abismo')
        return
      }

      const isHostUser = initial.host_user_id === user.id
      const isGuestUser = initial.guest_user_id === user.id

      if (!isHostUser && !isGuestUser) {
        if (initial.guest_user_id) {
          // já tem 2 jogadores e não é nenhum dos dois
          setRunFull(true)
          setLoading(false)
          return
        }
        // precisa escolher um personagem pra entrar como convidado
        const { data: chars } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setMyCharacters(chars || [])
        setNeedsToJoin(true)
        setLoading(false)
        return
      }

      setRun(initial)
      setLoading(false)
    }
    init()
  }, [runId])

  useEffect(() => {
    if (!runId) return
    const unsubscribe = subscribeToRun(runId, (updated) => {
      setRun(updated)
    })
    return unsubscribe
  }, [runId])

  async function handleJoin(character: any) {
    if (!userId) return
    setJoining(true)
    try {
      const stats: RunPlayerStats = {
        characterId: character.id,
        characterName: character.name,
        classId: character.class,
        avatarUrl: character.avatar_url,
        hp: character.hp_current,
        maxHp: character.hp_max,
        gold: 0,
        relics: [],
        inventory: [],
      }
      const updated = await joinRun(runId, userId, stats)
      setRun(updated)
      setNeedsToJoin(false)
      toast.success(`Você entrou como ${character.name}!`)
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível entrar — a vaga pode já ter sido preenchida')
      setRunFull(true)
      setNeedsToJoin(false)
    } finally {
      setJoining(false)
    }
  }

  function handleCopyInviteLink() {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copiado! Manda pro seu amigo entrar.')
  }

  async function handleLeave() {
    if (isHost && run?.status !== 'won' && run?.status !== 'lost') {
      if (!confirm('Sair agora vai encerrar a run pra sempre. Tem certeza?')) return
      await deleteRun(runId).catch(() => {})
    }
    router.push('/games/abismo')
  }

  function pickEnemyForNode(node: MapNode) {
    if (node.type === 'boss') {
      return BOSSES[Math.floor(Math.random() * BOSSES.length)]
    }
    const pool = ENEMIES.filter(e => e.floor <= node.floor + 1)
    return pool[Math.floor(Math.random() * pool.length)] || ENEMIES[0]
  }

  async function handleNodeClick(node: MapNode) {
    if (!run || !myStats || !userId) return
    if (node.visited) return

    const cur = getNodeById(run.floor_map, run.current_node_id)
    const accessible = node.id === run.current_node_id || (cur && cur.connections.includes(node.id))
    if (!accessible) {
      toast.error('Esse caminho ainda não tá acessível')
      return
    }

    if (node.type === 'combat' || node.type === 'boss') {
      const enemyDef = pickEnemyForNode(node)
      const combatState = createCombatState({
        enemyDef,
        playerHp: myStats.hp,
        playerMaxHp: myStats.maxHp,
        gold: myStats.gold,
        classId: myStats.classId as ClassId,
        relics: myStats.relics,
        discardsBase: 3,
        flatDmgBonus: 0,
      })

      const newMap = markVisited(run.floor_map, node.id)
      // tryStartCombat só trava a vez se ninguém mais já tiver travado antes
      // (evita os dois jogadores caírem em combate ao mesmo tempo por coincidência de cliques)
      const updated = await tryStartCombat(runId, userId, {
        floor_map: newMap,
        current_node_id: node.id,
        combat_state: combatState,
        status: 'combat',
      })
      if (!updated) {
        toast.error('Seu parceiro já entrou em combate — espera a vez dele.')
        return
      }
      setRun(updated)
    } else {
      // loja/evento — placeholder simples por enquanto (Fase 3)
      const newMap = markVisited(run.floor_map, node.id)
      await updateRun(runId, { floor_map: newMap, current_node_id: node.id })
      toast('Loja e eventos chegam na próxima etapa! Por enquanto, siga em frente.', { icon: '🚧' })
    }
  }

  async function dispatchCombat(action: Parameters<typeof combatReducer>[1]) {
    if (!isMyTurn) return
    const current = combatStateRef.current
    if (!current) return
    const next = combatReducer(current, action)
    combatStateRef.current = next
    setRun(prev => (prev ? { ...prev, combat_state: next } : prev))
    await updateRun(runId, { combat_state: next })
    return next
  }

  async function handlePlayHand() {
    if (!isMyTurn) return
    if (!combatStateRef.current || playingHand) return
    if (combatStateRef.current.selected.length !== 5) {
      toast.error('Selecione exatamente 5 cartas')
      return
    }
    setPlayingHand(true)
    const afterPlay = await dispatchCombat({ type: 'PLAY_HAND' })
    if (afterPlay && afterPlay.status === 'playing') {
      setTimeout(async () => {
        const afterEnemy = await dispatchCombat({ type: 'ENEMY_TURN' })
        await handleCombatResolution(afterEnemy)
        setPlayingHand(false)
      }, 900)
    } else {
      await handleCombatResolution(afterPlay)
      setPlayingHand(false)
    }
  }

  async function handleCombatResolution(state: CombatState | undefined) {
    if (!state || !run || !myStats) return
    if (state.status === 'won') {
      const updatedStats: RunPlayerStats = {
        ...myStats,
        hp: state.playerHp,
        gold: state.gold,
      }
      const patch = isHost ? { host_stats: updatedStats } : { guest_stats: updatedStats }
      await updateRun(runId, { ...patch, status: 'map', combat_state: null, combat_turn_user_id: null })
      toast.success('Vitória! Ganhou ' + (state.gold - myStats.gold) + ' fichas extras.')
    } else if (state.status === 'lost') {
      await updateRun(runId, { status: 'lost', combat_turn_user_id: null })
    }
  }

  async function handleDiscard() {
    if (!isMyTurn) return
    await dispatchCombat({ type: 'DISCARD_SELECTED' })
  }

  async function handleToggleCard(index: number) {
    if (!isMyTurn) return
    if (playingHand) return
    await dispatchCombat({ type: 'TOGGLE_CARD', index })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #c8f23c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (runFull) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#f0f0f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", gap: 12, textAlign: 'center', padding: 20 }}>
        <span style={{ fontSize: 40 }}>🚪</span>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Essa run já tem 2 jogadores</h1>
        <p style={{ fontSize: 13, color: '#8888aa' }}>A vaga de convidado já foi preenchida.</p>
        <button
          onClick={() => router.push('/games/abismo')}
          style={{ marginTop: 12, padding: '12px 28px', borderRadius: 10, border: 'none', background: '#c8f23c', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
        >
          Voltar pros Personagens
        </button>
      </div>
    )
  }

  if (needsToJoin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#f0f0f8', fontFamily: "'Syne', sans-serif" }}>
        <Nav />
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px', paddingLeft: 'calc(220px + 24px)' }} className="abismo-play-main">
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎰 Você foi convidado pro Abismo!</h1>
          <p style={{ fontSize: 13, color: '#8888aa', marginBottom: 24 }}>Escolha um personagem pra entrar nessa run.</p>

          {myCharacters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed rgba(200,242,60,0.15)', borderRadius: 12 }}>
              <p style={{ color: '#8888aa', marginBottom: 12 }}>Você ainda não tem nenhum personagem.</p>
              <button
                onClick={() => router.push('/games/abismo')}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#c8f23c', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
              >
                Criar um personagem
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {myCharacters.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleJoin(c)}
                  disabled={joining}
                  style={{
                    textAlign: 'left', borderRadius: 12, border: '1px solid rgba(200,242,60,0.15)',
                    background: '#111118', padding: 14, cursor: joining ? 'default' : 'pointer',
                    opacity: joining ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PlayerPortrait avatarUrl={c.avatar_url} classId={c.class} size={44} />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: '#8888aa' }}>{c.race} · Nv.{c.level}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  if (!run) {
    return null
  }

  if (run.status === 'lost') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#f0f0f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", gap: 16 }}>
        <span style={{ fontSize: 48 }}>💀</span>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Você caiu no Abismo...</h1>
        <button
          onClick={handleLeave}
          style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#c8f23c', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
        >
          Voltar pros Personagens
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#f0f0f8', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px', paddingLeft: 'calc(220px + 24px)' }} className="abismo-play-main">
        <button
          onClick={handleLeave}
          style={{ fontSize: 13, color: '#8888aa', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}
        >
          ← Sair da run
        </button>

        {run.status === 'waiting' && !run.guest_user_id && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#666688', marginBottom: 16 }}>
            🕐 Aguardando um segundo jogador (opcional) — convide um amigo ou continue sozinho.
          </p>
        )}

        {(run.status === 'map' || run.status === 'waiting') && myStats && (
          <MapScreen run={run} myStats={myStats} onNodeClick={handleNodeClick} isHost={isHost} onCopyInvite={handleCopyInviteLink} />
        )}

        {run.status === 'combat' && run.combat_state && myStats && (
          isMyTurn ? (
            <CombatScreen
              state={run.combat_state}
              myStats={myStats}
              playingHand={playingHand}
              onToggleCard={handleToggleCard}
              onDiscard={handleDiscard}
              onPlayHand={handlePlayHand}
            />
          ) : (
            <CombatSpectatorScreen run={run} />
          )
        )}

        {run.status === 'won' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: 48 }}>🏆</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Você venceu o Abismo!</h1>
            <button
              onClick={handleLeave}
              style={{ marginTop: 20, padding: '12px 28px', borderRadius: 10, border: 'none', background: '#c8f23c', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}
            >
              Voltar pros Personagens
            </button>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @media (max-width: 767px) {
          .abismo-play-main { padding-left: 16px !important; padding-bottom: 80px; }
        }
      `}</style>
    </div>
  )
}

// ============ TELA DE MAPA ============
function MapScreen({ run, myStats, onNodeClick, isHost, onCopyInvite }: {
  run: AbismoRun
  myStats: RunPlayerStats
  onNodeClick: (node: MapNode) => void
  isHost: boolean
  onCopyInvite: () => void
}) {
  const currentNode = getNodeById(run.floor_map, run.current_node_id)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <PlayerPortrait avatarUrl={myStats.avatarUrl} classId={myStats.classId} size={56} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatPill label="HP" value={`${myStats.hp}/${myStats.maxHp}`} color="#ff4466" />
          <StatPill label="Fichas" value={String(myStats.gold)} color="#c8f23c" />
          <StatPill label="Classe" value={CLASS_META[myStats.classId as ClassId]?.name || myStats.classId} color="#60a5fa" />
          <StatPill label="Relíquias" value={String(myStats.relics.length)} color="#a78bfa" />
        </div>
      </div>

      {isHost && !run.guest_user_id && (
        <button
          onClick={onCopyInvite}
          style={{
            marginBottom: 20, padding: '10px 18px', borderRadius: 10,
            border: '1px dashed rgba(200,242,60,0.3)', background: 'rgba(200,242,60,0.05)',
            color: '#c8f23c', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Syne', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          🔗 Convidar amigo (copiar link)
        </button>
      )}

      {run.guest_user_id && (
        <p style={{ fontSize: 12, color: '#8888aa', marginBottom: 20 }}>
          👥 Jogando com {isHost ? run.guest_stats?.characterName : run.host_stats.characterName}
        </p>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🗺️ O Abismo</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {run.floor_map.map((floor, fi) => (
          <div key={fi} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {floor.map(node => {
              const isCurrent = node.id === run.current_node_id
              const isAccessible = isCurrent || (currentNode && currentNode.connections.includes(node.id))
              return (
                <button
                  key={node.id}
                  onClick={() => onNodeClick(node)}
                  disabled={!isAccessible || node.visited}
                  style={{
                    width: 72, height: 72, borderRadius: 14,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    border: isCurrent ? '2px solid #c8f23c' : node.visited ? '1px solid rgba(255,255,255,0.05)' : isAccessible ? '1px solid rgba(200,242,60,0.4)' : '1px solid rgba(255,255,255,0.05)',
                    background: node.visited ? '#0f0e17' : isAccessible ? '#1a1726' : '#111118',
                    color: node.visited ? '#444466' : isAccessible ? '#f0f0f8' : '#333355',
                    cursor: isAccessible && !node.visited ? 'pointer' : 'default',
                    opacity: node.visited ? 0.4 : 1,
                    boxShadow: isCurrent ? '0 0 16px rgba(200,242,60,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{TYPE_ICON[node.type]}</span>
                  <span style={{ fontSize: 9, fontWeight: 600 }}>{TYPE_LABEL[node.type]}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#1a1726', borderRadius: 10, padding: '8px 14px', display: 'flex', flexDirection: 'column', minWidth: 80 }}>
      <span style={{ fontSize: 10, color: '#666688' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

function PlayerPortrait({ avatarUrl, classId, size = 56 }: { avatarUrl: string | null; classId: string; size?: number }) {
  const meta = CLASS_META[classId as ClassId]
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, overflow: 'hidden',
      background: '#1a1726', border: '1px solid rgba(200,242,60,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, flexShrink: 0,
    }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        meta?.icon || '🎭'
      )}
    </div>
  )
}

// ============ TELA DE ESPECTADOR (parceiro em combate) ============
function CombatSpectatorScreen({ run }: { run: AbismoRun }) {
  const state = run.combat_state
  if (!state) return null

  const fighterStats = run.combat_turn_user_id === run.host_user_id ? run.host_stats : run.guest_stats
  const enemyHpPct = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100)
  const playerHpPct = Math.max(0, (state.playerHp / state.playerMaxHp) * 100)

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
        padding: '8px 16px', borderRadius: 999, background: 'rgba(200,242,60,0.06)',
        border: '1px dashed rgba(200,242,60,0.25)', color: '#c8f23c', fontSize: 13, fontWeight: 700,
      }}>
        👀 {fighterStats?.characterName || 'Seu parceiro'} tá em combate — aguarde a vez dele
      </div>

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 40, display: 'block' }}>{state.enemy.icon}</span>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{state.enemy.name}</h2>
        <div style={{ height: 8, background: '#1a1726', borderRadius: 999, marginTop: 8, overflow: 'hidden', maxWidth: 260, marginInline: 'auto' }}>
          <div style={{ width: `${enemyHpPct}%`, height: '100%', background: '#ff4466', transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ fontSize: 11, color: '#666688', marginTop: 2 }}>{state.enemy.hp}/{state.enemy.maxHp} HP</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <PlayerPortrait avatarUrl={fighterStats?.avatarUrl ?? null} classId={fighterStats?.classId || ''} size={44} />
        <StatPill label={`HP de ${fighterStats?.characterName || 'parceiro'}`} value={`${state.playerHp}/${state.playerMaxHp}`} color="#ff4466" />
        <StatPill label="Fichas" value={String(state.gold)} color="#c8f23c" />
      </div>

      <div style={{ background: '#111118', borderRadius: 10, padding: 12, maxHeight: 100, overflowY: 'auto', fontSize: 12, color: '#8888aa', maxWidth: 400, marginInline: 'auto' }}>
        {state.log.slice(-5).map((l, i) => <p key={i} style={{ margin: '2px 0' }}>{l}</p>)}
      </div>
    </div>
  )
}

// ============ TELA DE COMBATE ============
function CombatScreen({ state, myStats, playingHand, onToggleCard, onDiscard, onPlayHand }: {
  state: CombatState
  myStats: RunPlayerStats
  playingHand: boolean
  onToggleCard: (i: number) => void
  onDiscard: () => void
  onPlayHand: () => void
}) {
  const enemyHpPct = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100)
  const playerHpPct = Math.max(0, (state.playerHp / state.playerMaxHp) * 100)

  const prevEnemyHp = useRef(state.enemy.hp)
  const prevPlayerHp = useRef(state.playerHp)
  const [enemyFx, setEnemyFx] = useState<{ id: number; dmg: number } | null>(null)
  const [playerFx, setPlayerFx] = useState<{ id: number; dmg: number; heal: boolean } | null>(null)
  const [enemyShake, setEnemyShake] = useState(false)
  const [playerShake, setPlayerShake] = useState(false)
  const fxId = useRef(0)

  useEffect(() => {
    if (state.enemy.hp < prevEnemyHp.current) {
      const dmg = prevEnemyHp.current - state.enemy.hp
      fxId.current += 1
      setEnemyFx({ id: fxId.current, dmg })
      setEnemyShake(true)
      setTimeout(() => setEnemyShake(false), 350)
      setTimeout(() => setEnemyFx(null), 900)
    }
    prevEnemyHp.current = state.enemy.hp
  }, [state.enemy.hp])

  useEffect(() => {
    if (state.playerHp !== prevPlayerHp.current) {
      const diff = state.playerHp - prevPlayerHp.current
      fxId.current += 1
      setPlayerFx({ id: fxId.current, dmg: Math.abs(diff), heal: diff > 0 })
      if (diff < 0) {
        setPlayerShake(true)
        setTimeout(() => setPlayerShake(false), 350)
      }
      setTimeout(() => setPlayerFx(null), 900)
    }
    prevPlayerHp.current = state.playerHp
  }, [state.playerHp])

  return (
    <div>
      {/* Inimigo */}
      <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
        <div
          className={enemyShake ? 'fx-shake' : ''}
          style={{ display: 'inline-block', position: 'relative' }}
        >
          <span style={{ fontSize: 48, display: 'block' }}>{state.enemy.icon}</span>
          {enemyFx && (
            <span key={enemyFx.id} className="fx-float-dmg" style={{ color: '#ff4466' }}>
              -{enemyFx.dmg}
            </span>
          )}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{state.enemy.name}</h2>
        <p style={{ fontSize: 12, color: '#8888aa' }}>{state.enemy.type}</p>
        <div style={{ height: 10, background: '#1a1726', borderRadius: 999, marginTop: 8, overflow: 'hidden', maxWidth: 300, marginInline: 'auto' }}>
          <div style={{ width: `${enemyHpPct}%`, height: '100%', background: '#ff4466', transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ fontSize: 11, color: '#666688', marginTop: 2 }}>{state.enemy.hp}/{state.enemy.maxHp} HP</p>
      </div>

      {/* Retrato + status do jogador */}
      <div
        className={playerShake ? 'fx-shake' : ''}
        style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap', position: 'relative' }}
      >
        <div style={{ position: 'relative' }}>
          <PlayerPortrait avatarUrl={myStats.avatarUrl} classId={myStats.classId} size={48} />
          {playerFx && (
            <span key={playerFx.id} className="fx-float-dmg" style={{ color: playerFx.heal ? '#c8f23c' : '#ff4466', left: '50%' }}>
              {playerFx.heal ? '+' : '-'}{playerFx.dmg}
            </span>
          )}
        </div>
        <StatPill label="Seu HP" value={`${state.playerHp}/${state.playerMaxHp}`} color="#ff4466" />
        <StatPill label="Armadura" value={String(state.armor)} color="#60a5fa" />
        <StatPill label="Fichas" value={String(state.gold)} color="#c8f23c" />
        <StatPill label="Trocas" value={String(state.discardsLeft)} color="#a78bfa" />
      </div>

      {/* Log de batalha */}
      <div style={{ background: '#111118', borderRadius: 10, padding: 12, maxHeight: 100, overflowY: 'auto', marginBottom: 20, fontSize: 12, color: '#8888aa' }}>
        {state.log.slice(-5).map((l, i) => <p key={i} style={{ margin: '2px 0' }}>{l}</p>)}
      </div>

      {/* Mão de cartas */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {state.hand.map((card, i) => {
          const selected = state.selected.includes(i)
          const isRed = card.s === 'H' || card.s === 'D'
          const symbols: Record<string, string> = { H: '♥', D: '♦', S: '♠', C: '♣' }
          return (
            <button
              key={i}
              onClick={() => onToggleCard(i)}
              disabled={playingHand}
              className="fx-card"
              style={{
                width: 56, height: 78, borderRadius: 8,
                border: selected ? '2px solid #c8f23c' : '1px solid rgba(255,255,255,0.15)',
                background: '#fff', color: isRed ? '#e11d48' : '#111',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: playingHand ? 'default' : 'pointer',
                transform: selected ? 'translateY(-8px)' : 'none',
                fontWeight: 800,
                boxShadow: selected ? '0 4px 12px rgba(200,242,60,0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <span style={{ fontSize: 16 }}>{card.r}</span>
              <span style={{ fontSize: 18 }}>{symbols[card.s]}</span>
            </button>
          )
        })}
      </div>

      {state.lastHandEval && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#c8f23c', marginBottom: 12 }}>
          Última mão: {state.lastHandEval.tipo}
        </p>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={onDiscard}
          disabled={playingHand || state.discardsLeft <= 0 || state.selected.length === 0}
          style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(200,242,60,0.2)',
            background: 'transparent', color: '#c8f23c', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: "'Syne', sans-serif",
            opacity: state.discardsLeft <= 0 || state.selected.length === 0 ? 0.4 : 1,
          }}
        >
          Trocar ({state.discardsLeft})
        </button>
        <button
          onClick={onPlayHand}
          disabled={playingHand || state.selected.length !== 5}
          style={{
            padding: '10px 28px', borderRadius: 10, border: 'none',
            background: state.selected.length === 5 ? '#c8f23c' : '#333',
            color: state.selected.length === 5 ? '#000' : '#666',
            fontWeight: 800, fontSize: 13, cursor: playingHand ? 'default' : 'pointer',
            fontFamily: "'Syne', sans-serif",
            boxShadow: state.selected.length === 5 ? '0 0 16px rgba(200,242,60,0.4)' : 'none',
          }}
        >
          {playingHand ? 'Jogando...' : '✦ Jogar Mão ✦'}
        </button>
      </div>

      <style>{`
        @keyframes fxShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .fx-shake { animation: fxShake 0.35s ease; }

        @keyframes fxFloatDmg {
          0% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -40px); opacity: 0; }
        }
        .fx-float-dmg {
          position: absolute;
          top: -8px;
          left: 50%;
          font-size: 18px;
          font-weight: 800;
          animation: fxFloatDmg 0.9s ease-out forwards;
          pointer-events: none;
          text-shadow: 0 2px 6px rgba(0,0,0,0.6);
        }

        .fx-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .fx-card:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.03);
        }
      `}</style>
    </div>
  )
}