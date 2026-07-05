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
import { ENEMIES, BOSSES, CLASS_META, CLASS_PASSIVES, RELICS } from '@/lib/abismo/constants'
import { buyItem, sellRelic, resolveEventAction, pickShopStock, pickRandomEvent } from '@/lib/abismo/economy'
import type { ClassId, ShopItemDef, EventDef } from '@/lib/abismo/types'

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

  // Sessões locais de loja/evento (não precisam ser sincronizadas — só afetam quem clicou o nó)
  const [shopStock, setShopStock] = useState<ShopItemDef[] | null>(null)
  const [activeEvent, setActiveEvent] = useState<EventDef | null>(null)
  const [economyBusy, setEconomyBusy] = useState(false)

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
      const extraDiscards = (myStats.extraDiscards || 0) + (myStats.bonusDiscardsNextCombat || 0)
      const combatState = createCombatState({
        enemyDef,
        playerHp: myStats.hp,
        playerMaxHp: myStats.maxHp,
        gold: myStats.gold,
        classId: myStats.classId as ClassId,
        relics: myStats.relics,
        discardsBase: 3 + extraDiscards,
        flatDmgBonus: myStats.dmgBonus || 0,
      })

      const newMap = markVisited(run.floor_map, node.id)
      // consome o bônus de uso único (se tinha) ao entrar no combate
      const statsPatch = myStats.bonusDiscardsNextCombat
        ? (isHost ? { host_stats: { ...myStats, bonusDiscardsNextCombat: 0 } } : { guest_stats: { ...myStats, bonusDiscardsNextCombat: 0 } })
        : {}

      // tryStartCombat só trava a vez se ninguém mais já tiver travado antes
      // (evita os dois jogadores caírem em combate ao mesmo tempo por coincidência de cliques)
      const updated = await tryStartCombat(runId, userId, {
        floor_map: newMap,
        current_node_id: node.id,
        combat_state: combatState,
        status: 'combat',
        ...statsPatch,
      })
      if (!updated) {
        toast.error('Seu parceiro já entrou em combate — espera a vez dele.')
        return
      }
      setRun(updated)
    } else if (node.type === 'shop') {
      const newMap = markVisited(run.floor_map, node.id)
      await updateRun(runId, { floor_map: newMap, current_node_id: node.id })
      setRun(prev => (prev ? { ...prev, floor_map: newMap, current_node_id: node.id } : prev))
      setShopStock(pickShopStock(3))
    } else if (node.type === 'event') {
      const newMap = markVisited(run.floor_map, node.id)
      await updateRun(runId, { floor_map: newMap, current_node_id: node.id })
      setRun(prev => (prev ? { ...prev, floor_map: newMap, current_node_id: node.id } : prev))
      setActiveEvent(pickRandomEvent())
    }
  }

  async function persistMyStats(next: RunPlayerStats) {
    const patch = isHost ? { host_stats: next } : { guest_stats: next }
    await updateRun(runId, patch)
    setRun(prev => (prev ? { ...prev, ...patch } : prev))
  }

  async function handleBuyItem(item: ShopItemDef) {
    if (!myStats || economyBusy) return
    setEconomyBusy(true)
    const result = buyItem(myStats, item)
    if (!result.ok) {
      toast.error(result.message)
    } else {
      await persistMyStats(result.stats)
      toast.success(result.message)
    }
    setEconomyBusy(false)
  }

  async function handleSellRelic(relicId: string) {
    if (!myStats || economyBusy) return
    setEconomyBusy(true)
    const result = sellRelic(myStats, relicId)
    if (!result.ok) {
      toast.error(result.message)
    } else {
      await persistMyStats(result.stats)
      toast.success(result.message)
    }
    setEconomyBusy(false)
  }

  async function handleEventChoice(action: string) {
    if (!myStats || economyBusy) return
    setEconomyBusy(true)
    const result = resolveEventAction(myStats, action)
    if (!result.ok) {
      toast.error(result.message)
      setEconomyBusy(false)
      return
    }
    await persistMyStats(result.stats)
    toast(result.message, { icon: action === 'leave' ? '🚶' : '✨' })
    setEconomyBusy(false)
    setActiveEvent(null)
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
      const rawGain = state.gold - myStats.gold
      const mult = myStats.goldMult || 1
      const finalGain = Math.round(rawGain * mult)
      const updatedStats: RunPlayerStats = {
        ...myStats,
        hp: state.playerHp,
        gold: myStats.gold + finalGain,
      }
      const patch = isHost ? { host_stats: updatedStats } : { guest_stats: updatedStats }
      await updateRun(runId, { ...patch, status: 'map', combat_state: null, combat_turn_user_id: null })
      toast.success('Vitória! Ganhou ' + finalGain + ' fichas extras.')
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

        {(run.status === 'map' || run.status === 'waiting') && myStats && !shopStock && !activeEvent && (
          <MapScreen run={run} myStats={myStats} onNodeClick={handleNodeClick} isHost={isHost} onCopyInvite={handleCopyInviteLink} />
        )}

        {shopStock && myStats && (
          <ShopScreen
            stock={shopStock}
            myStats={myStats}
            busy={economyBusy}
            onBuy={handleBuyItem}
            onSellRelic={handleSellRelic}
            onClose={() => setShopStock(null)}
          />
        )}

        {activeEvent && myStats && (
          <EventScreen
            event={activeEvent}
            busy={economyBusy}
            onChoice={handleEventChoice}
          />
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

// ============ TELA DE LOJA ============
function ShopScreen({ stock, myStats, busy, onBuy, onSellRelic, onClose }: {
  stock: ShopItemDef[]
  myStats: RunPlayerStats
  busy: boolean
  onBuy: (item: ShopItemDef) => void
  onSellRelic: (relicId: string) => void
  onClose: () => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🏪 Loja do Abismo</h2>
        <StatPill label="Suas fichas" value={String(myStats.gold)} color="#c8f23c" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
        {stock.map(item => (
          <div key={item.id} style={{ background: '#111118', borderRadius: 12, padding: 14, border: '1px solid rgba(200,242,60,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</p>
            </div>
            <p style={{ fontSize: 12, color: '#8888aa', marginBottom: 12, minHeight: 32 }}>{item.desc}</p>
            <button
              onClick={() => onBuy(item)}
              disabled={busy || myStats.gold < item.cost}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                background: myStats.gold < item.cost ? '#333' : '#c8f23c',
                color: myStats.gold < item.cost ? '#666' : '#000',
                fontWeight: 700, fontSize: 13, cursor: busy || myStats.gold < item.cost ? 'default' : 'pointer',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Comprar · {item.cost} 🪙
            </button>
          </div>
        ))}
      </div>

      {myStats.relics.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#8888aa' }}>Vender relíquias (20 🪙 cada)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {myStats.relics.map((relicId, i) => {
              const relic = RELICS.find(r => r.id === relicId)
              if (!relic) return null
              return (
                <button
                  key={`${relicId}-${i}`}
                  onClick={() => onSellRelic(relicId)}
                  disabled={busy}
                  title={relic.desc}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                    borderRadius: 10, border: '1px solid rgba(255,68,102,0.3)', background: 'rgba(255,68,102,0.06)',
                    color: '#ff8899', fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  <span>{relic.icon}</span> {relic.name}
                </button>
              )
            })}
          </div>
        </>
      )}

      <button
        onClick={onClose}
        style={{
          padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: '#f0f0f8', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: "'Syne', sans-serif",
        }}
      >
        Sair da loja
      </button>
    </div>
  )
}

// ============ TELA DE EVENTO ============
function EventScreen({ event, busy, onChoice }: {
  event: EventDef
  busy: boolean
  onChoice: (action: string) => void
}) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>{event.icon}</span>
      <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>{event.title}</h2>
      <p style={{ fontSize: 13, color: '#8888aa', marginBottom: 28, lineHeight: 1.5 }}>{event.desc}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {event.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onChoice(choice.action)}
            disabled={busy}
            style={{
              padding: '14px 16px', borderRadius: 10,
              border: choice.action === 'leave' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(200,242,60,0.25)',
              background: choice.action === 'leave' ? 'transparent' : 'rgba(200,242,60,0.06)',
              color: choice.action === 'leave' ? '#8888aa' : '#f0f0f8',
              fontWeight: 600, fontSize: 13, cursor: busy ? 'default' : 'pointer',
              fontFamily: "'Syne', sans-serif", textAlign: 'left',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {choice.txt}
          </button>
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

// ============ TELA DE COMBATE (visual: leque de cartas, arena 2.5D, boot transition) ============
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
  const armorPct = Math.min(100, (state.armor / 20) * 100)

  const prevEnemyHp = useRef(state.enemy.hp)
  const prevPlayerHp = useRef(state.playerHp)
  const [enemyFx, setEnemyFx] = useState<{ id: number; dmg: number } | null>(null)
  const [playerFx, setPlayerFx] = useState<{ id: number; dmg: number; heal: boolean } | null>(null)
  const [enemyShake, setEnemyShake] = useState(false)
  const [playerShake, setPlayerShake] = useState(false)
  const fxId = useRef(0)

  // Transição de "boot" ao entrar num combate novo (só na primeira renderização)
  const [booting, setBooting] = useState(() => state.turn === 1 && state.log.length <= 1)
  useEffect(() => {
    if (booting) {
      const t = setTimeout(() => setBooting(false), 2000)
      return () => clearTimeout(t)
    }
  }, [])

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

  const symbols: Record<string, string> = { H: '♥', D: '♦', S: '♠', C: '♣' }
  const meta = CLASS_META[myStats.classId as ClassId]

  return (
    <div className="ab-root">
      {/* Boot transition — fica fora da stage, cobre a tela inteira */}
      <div className={`ab-boot ${booting ? 'active' : ''}`}>
        <div className="ab-boot-lines">
          <p>&gt; conectando ao nó...</p>
          <p>&gt; carregando entidade: <span className="ab-boot-warn">{state.enemy.name.toUpperCase().replace(/\s/g, '_')}.exe</span></p>
          <p>&gt; sincronizando mão de 5 cartas...</p>
          <p className="ab-boot-ok">&gt; combate pronto. boa sorte, {myStats.characterName}.</p>
          <p>&gt;_</p>
        </div>
      </div>

      <div className="ab-stage">
        <div className="ab-bg-anim">
          <span className="ab-blob ab-blob-1" />
          <span className="ab-blob ab-blob-2" />
          <span className="ab-blob ab-blob-3" />
          <div className="ab-stage-scanlines" />
        </div>

        <div className="ab-content">
          <div className="ab-hud-top">ANDAR · <b>{state.enemy.type}</b> · COMBATE</div>

          {/* Arena 2.5D — só o inimigo aqui, sem elementos flutuantes por cima */}
          <div className="ab-arena">
            <div className="ab-enemy-zone">
              <div className="ab-enemy-platform" />
              <div className={`ab-enemy-sprite ${enemyShake ? 'ab-shake' : ''}`}>
                {state.enemy.icon}
                {enemyFx && <span key={enemyFx.id} className="ab-dmg-float">-{enemyFx.dmg}</span>}
              </div>
              <div className="ab-enemy-card">
                <div className="ab-enemy-name">{state.enemy.name}</div>
                <div className="ab-enemy-type">{state.enemy.type}</div>
                <div className="ab-hpbar-wrap"><div className="ab-hpbar-fill" style={{ width: `${enemyHpPct}%` }} /></div>
                <div className="ab-enemy-hp-num">{state.enemy.hp} / {state.enemy.maxHp} HP</div>
              </div>
            </div>

            <div className="ab-arena-floor" />
          </div>

          {/* Painel do jogador + fichas — linha normal, nunca sobrepõe a arena */}
          <div className="ab-status-row">
            <div className={`ab-player-panel ${playerShake ? 'ab-shake' : ''}`}>
              <div className="ab-player-name-row">
                <div className="ab-player-portrait">
                  {myStats.avatarUrl ? <img src={myStats.avatarUrl} alt="" /> : (meta?.icon || '🎭')}
                  {playerFx && (
                    <span key={playerFx.id} className="ab-dmg-float" style={{ color: playerFx.heal ? 'var(--ab-lime)' : 'var(--ab-blood)' }}>
                      {playerFx.heal ? '+' : '-'}{playerFx.dmg}
                    </span>
                  )}
                </div>
                <div>
                  <div className="ab-player-name">{myStats.characterName}</div>
                  <div className="ab-player-class">{meta?.name || myStats.classId}</div>
                </div>
              </div>
              <div className="ab-stat-row">
                <span className="ab-stat-label">HP</span>
                <div className="ab-stat-bar-wrap"><div className="ab-stat-bar-fill" style={{ width: `${playerHpPct}%`, background: 'var(--ab-blood)' }} /></div>
                <span className="ab-stat-num">{state.playerHp}/{state.playerMaxHp}</span>
              </div>
              <div className="ab-stat-row">
                <span className="ab-stat-label">DEF</span>
                <div className="ab-stat-bar-wrap"><div className="ab-stat-bar-fill" style={{ width: `${armorPct}%`, background: '#60a5fa' }} /></div>
                <span className="ab-stat-num">{state.armor}</span>
              </div>
            </div>

            <div className="ab-gold-badge">
              <div className="ab-gold-label">Fichas</div>
              <div className="ab-gold-num">{state.gold}</div>
            </div>
          </div>

          {/* Log de batalha */}
          <div className="ab-log">
            {state.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}
          </div>

          {state.lastHandEval && (
            <p className="ab-last-hand">Última mão: {state.lastHandEval.tipo}</p>
          )}

          {/* Leque de cartas */}
          <div className="ab-hand">
            {state.hand.map((card, i) => {
              const selected = state.selected.includes(i)
              const isRed = card.s === 'H' || card.s === 'D'
              return (
                <button
                  key={i}
                  onClick={() => onToggleCard(i)}
                  disabled={playingHand}
                  className={`ab-card ${isRed ? 'red' : 'black'} ${selected ? 'selected' : ''}`}
                >
                  <span className="ab-card-r">{card.r}</span>
                  <span className="ab-card-s">{symbols[card.s]}</span>
                </button>
              )
            })}
          </div>

          {/* Ações */}
          <div className="ab-actions">
            <button
              onClick={onDiscard}
              disabled={playingHand || state.discardsLeft <= 0 || state.selected.length === 0}
              className="ab-btn ab-btn-ghost"
              style={{ opacity: state.discardsLeft <= 0 || state.selected.length === 0 ? 0.4 : 1 }}
            >
              Trocar ({state.discardsLeft})
            </button>
            <button
              onClick={onPlayHand}
              disabled={playingHand || state.selected.length !== 5}
              className="ab-btn ab-btn-main"
              style={{ opacity: state.selected.length === 5 ? 1 : 0.5 }}
            >
              {playingHand ? 'Jogando...' : '✦ Jogar Mão ✦'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

        .ab-root {
          --ab-bg3: #1c1830;
          --ab-bg4: #241f3d;
          --ab-border: rgba(200,242,60,0.14);
          --ab-lime: #c8f23c;
          --ab-blood: #ff3d63;
          --ab-glitch: #34e8d0;
          --ab-gold: #ffcf4d;
          --ab-void-purple: #8b5cf6;
          --ab-text-dim: #8888aa;
          --ab-font-mono: 'JetBrains Mono', monospace;
          position: relative;
        }

        .ab-stage {
          position: relative;
          max-width: 640px;
          margin: 0 auto;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--ab-border);
          background: #0a0912;
        }
        .ab-content { position: relative; z-index: 2; padding: 20px 20px 24px; }

        .ab-bg-anim { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
        .ab-blob {
          position: absolute; border-radius: 50%; filter: blur(50px); opacity: 0.35;
          animation: ab-drift 14s ease-in-out infinite;
        }
        .ab-blob-1 { width: 220px; height: 220px; background: var(--ab-void-purple, #8b5cf6); top: -40px; left: -40px; animation-duration: 16s; }
        .ab-blob-2 { width: 180px; height: 180px; background: var(--ab-lime); bottom: -30px; right: -30px; animation-duration: 19s; animation-delay: -4s; }
        .ab-blob-3 { width: 150px; height: 150px; background: var(--ab-glitch); top: 40%; right: 20%; animation-duration: 13s; animation-delay: -8s; opacity: 0.22; }
        @keyframes ab-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(24px, -18px) scale(1.08); }
          66% { transform: translate(-18px, 14px) scale(0.94); }
        }
        .ab-stage-scanlines {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
          background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.35) 3px, rgba(0,0,0,0.35) 4px);
        }

        .ab-hud-top {
          text-align: center; font-family: var(--ab-font-mono); font-size: 10px;
          letter-spacing: .2em; color: var(--ab-text-dim); text-transform: uppercase;
          margin-bottom: 8px;
        }
        .ab-hud-top b { color: var(--ab-glitch); }

        .ab-arena {
          position: relative; min-height: 200px;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          perspective: 1200px;
        }

        .ab-status-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 12px; margin-top: 14px; margin-bottom: 8px; flex-wrap: wrap;
        }

        .ab-enemy-zone { position: relative; margin-top: 20px; display: flex; flex-direction: column; align-items: center; }
        .ab-enemy-platform {
          width: 220px; height: 76px;
          background: linear-gradient(180deg, rgba(255,61,99,0.16), rgba(255,61,99,0.02));
          border: 1px solid rgba(255,61,99,0.35);
          transform: rotateX(62deg); border-radius: 50%;
          box-shadow: 0 0 40px rgba(255,61,99,0.15) inset;
          margin-bottom: -26px;
        }
        .ab-enemy-sprite {
          font-size: 52px; filter: drop-shadow(0 12px 18px rgba(255,61,99,0.35));
          animation: ab-float-enemy 3.2s ease-in-out infinite;
          position: relative; z-index: 2;
        }
        @keyframes ab-float-enemy { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .ab-enemy-card {
          margin-top: 8px; padding: 8px 20px; text-align: center;
          background: var(--ab-bg3); border: 1px solid rgba(255,61,99,0.3);
          clip-path: polygon(6% 0, 100% 0, 94% 100%, 0 100%);
          min-width: 200px;
        }
        .ab-enemy-name { font-weight: 800; font-size: 14px; }
        .ab-enemy-type { font-size: 10px; color: var(--ab-text-dim); text-transform: uppercase; letter-spacing: .12em; margin-top: 2px; }
        .ab-hpbar-wrap { height: 7px; background: rgba(255,255,255,0.06); margin-top: 7px; border-radius: 2px; overflow: hidden; }
        .ab-hpbar-fill { height: 100%; background: linear-gradient(90deg, var(--ab-blood), #ff7a93); transition: width .4s ease; }
        .ab-enemy-hp-num { font-family: var(--ab-font-mono); font-size: 10px; color: var(--ab-text-dim); margin-top: 4px; }

        .ab-dmg-float {
          position: absolute; top: -10px; left: 50%; font-family: var(--ab-font-mono);
          font-weight: 700; font-size: 20px; color: var(--ab-blood);
          pointer-events: none; z-index: 30;
          text-shadow: 2px 0 0 rgba(52,232,208,.7), -2px 0 0 rgba(255,61,99,.9);
          animation: ab-dmg-float .85s ease-out forwards;
        }
        @keyframes ab-dmg-float {
          0% { transform: translate(-50%,0) scale(1); opacity: 1; }
          30% { transform: translate(-52%,-10px) scale(1.15); }
          100% { transform: translate(-48%,-48px) scale(0.9); opacity: 0; }
        }

        .ab-arena-floor {
          width: 92%; max-width: 700px; height: 1px; margin: 14px 0 0;
          background: linear-gradient(90deg, transparent, rgba(200,242,60,0.25), transparent);
        }

        .ab-player-panel {
          position: relative; z-index: 20;
          background: var(--ab-bg3); border: 1px solid var(--ab-border);
          clip-path: polygon(0 0, 100% 0, 92% 100%, 0% 100%);
          padding: 10px 30px 10px 14px; min-width: 190px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .ab-player-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
        .ab-player-portrait {
          width: 34px; height: 34px; border-radius: 8px; background: var(--ab-bg4);
          border: 1px solid var(--ab-lime); display: flex; align-items: center; justify-content: center;
          font-size: 18px; overflow: hidden; position: relative; flex-shrink: 0;
        }
        .ab-player-portrait img { width: 100%; height: 100%; object-fit: cover; }
        .ab-player-name { font-weight: 700; font-size: 12px; }
        .ab-player-class { font-size: 9px; color: var(--ab-text-dim); text-transform: uppercase; letter-spacing: .08em; }
        .ab-stat-row { display: flex; align-items: center; gap: 6px; font-family: var(--ab-font-mono); font-size: 10px; margin-top: 5px; }
        .ab-stat-label { width: 26px; color: var(--ab-text-dim); font-size: 9px; text-transform: uppercase; }
        .ab-stat-bar-wrap { flex: 1; height: 5px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
        .ab-stat-bar-fill { height: 100%; transition: width .4s ease; }
        .ab-stat-num { min-width: 42px; text-align: right; }

        .ab-gold-badge {
          position: relative; z-index: 20;
          background: var(--ab-bg3); border: 1px solid rgba(255,207,77,0.35);
          clip-path: polygon(8% 0, 100% 0, 100% 100%, 0% 100%);
          padding: 8px 14px 8px 22px; text-align: right; min-width: 110px;
        }
        .ab-gold-label { font-size: 9px; color: var(--ab-text-dim); letter-spacing: .12em; text-transform: uppercase; }
        .ab-gold-num { font-family: var(--ab-font-mono); font-size: 18px; font-weight: 700; color: var(--ab-gold); }

        .ab-log {
          background: #111118; border-radius: 10px; padding: 10px 12px; max-height: 90px;
          overflow-y: auto; margin: 0 auto 12px; font-size: 12px; color: var(--ab-text-dim);
          max-width: 500px;
        }
        .ab-log p { margin: 2px 0; }

        .ab-last-hand { text-align: center; font-size: 12px; color: var(--ab-lime); margin-bottom: 10px; font-family: var(--ab-font-mono); }

        .ab-hand {
          position: relative; height: 130px; display: flex; align-items: flex-end;
          justify-content: center; margin-top: 6px;
        }
        .ab-card {
          position: absolute; width: 64px; height: 90px; border-radius: 9px;
          background: linear-gradient(160deg, #fdfdfd, #e8e8ee);
          border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 8px 16px rgba(0,0,0,0.4);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; transition: transform .25s cubic-bezier(.2,.9,.3,1.3), box-shadow .2s ease;
          transform-origin: bottom center; font-family: var(--ab-font-mono); padding: 0;
        }
        .ab-card .ab-card-r { font-size: 17px; font-weight: 700; }
        .ab-card .ab-card-s { font-size: 20px; margin-top: 2px; }
        .ab-card.red { color: var(--ab-blood); }
        .ab-card.black { color: #171725; }
        .ab-card.selected { box-shadow: 0 0 0 3px var(--ab-lime), 0 12px 24px rgba(200,242,60,0.35); }
        .ab-card:disabled { cursor: default; }

        .ab-hand .ab-card:nth-child(1) { transform: translateX(-115px) rotate(-14deg) translateY(11px); z-index: 1; }
        .ab-hand .ab-card:nth-child(2) { transform: translateX(-60px) rotate(-7deg) translateY(2px); z-index: 2; }
        .ab-hand .ab-card:nth-child(3) { transform: translateX(0) rotate(0deg) translateY(-5px); z-index: 3; }
        .ab-hand .ab-card:nth-child(4) { transform: translateX(60px) rotate(7deg) translateY(2px); z-index: 2; }
        .ab-hand .ab-card:nth-child(5) { transform: translateX(115px) rotate(14deg) translateY(11px); z-index: 1; }

        .ab-hand .ab-card:nth-child(1):hover:not(:disabled), .ab-hand .ab-card:nth-child(1).selected { transform: translateX(-115px) rotate(-14deg) translateY(-12px); }
        .ab-hand .ab-card:nth-child(2):hover:not(:disabled), .ab-hand .ab-card:nth-child(2).selected { transform: translateX(-60px) rotate(-7deg) translateY(-22px); }
        .ab-hand .ab-card:nth-child(3):hover:not(:disabled), .ab-hand .ab-card:nth-child(3).selected { transform: translateX(0) rotate(0deg) translateY(-30px); }
        .ab-hand .ab-card:nth-child(4):hover:not(:disabled), .ab-hand .ab-card:nth-child(4).selected { transform: translateX(60px) rotate(7deg) translateY(-22px); }
        .ab-hand .ab-card:nth-child(5):hover:not(:disabled), .ab-hand .ab-card:nth-child(5).selected { transform: translateX(115px) rotate(14deg) translateY(-12px); }

        .ab-actions { display: flex; gap: 12px; justify-content: center; margin: 18px 0 8px; }
        .ab-btn {
          font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
          padding: 11px 22px; cursor: pointer; border: none;
          clip-path: polygon(10% 0, 100% 0, 90% 100%, 0% 100%);
        }
        .ab-btn-ghost { background: transparent; border: 1px solid var(--ab-border); color: var(--ab-lime); }
        .ab-btn-main { background: var(--ab-lime); color: #0a0912; box-shadow: 0 0 20px rgba(200,242,60,0.35); }
        .ab-btn:disabled { cursor: default; }

        .ab-shake {
          animation: ab-shake-kf 0.35s ease;
        }
        @keyframes ab-shake-kf {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .ab-boot {
          position: fixed; inset: 0; background: #000; z-index: 300;
          display: flex; flex-direction: column; justify-content: center; padding: 60px;
          font-family: var(--ab-font-mono, monospace); color: var(--ab-glitch, #34e8d0); font-size: 13px;
          opacity: 0; pointer-events: none;
        }
        .ab-boot.active { opacity: 1; pointer-events: all; animation: ab-boot-out 0.9s ease forwards; animation-delay: 1.1s; }
        .ab-boot-lines p { margin: 3px 0; opacity: 0; animation: ab-line-in .25s ease forwards; }
        .ab-boot-lines p:nth-child(1) { animation-delay: .05s; }
        .ab-boot-lines p:nth-child(2) { animation-delay: .18s; }
        .ab-boot-lines p:nth-child(3) { animation-delay: .34s; }
        .ab-boot-lines p:nth-child(4) { animation-delay: .52s; }
        .ab-boot-lines p:nth-child(5) { animation-delay: .74s; }
        @keyframes ab-line-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ab-boot-out { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        .ab-boot-ok { color: var(--ab-lime, #c8f23c); font-weight: 700; }
        .ab-boot-warn { color: var(--ab-gold, #ffcf4d); }

        @media (max-width: 600px) {
          .ab-status-row { justify-content: center; }
        }
      `}</style>
    </div>
  )
}