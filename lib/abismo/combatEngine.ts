// lib/abismo/combatEngine.ts
// Motor de combate cooperativo (2 jogadores) estilo Pokémon/Persona:
// turnos em bloco, cada jogador escolhe 2 ações antes de qualquer uma resolver.
// Puro (sem DOM/rede) — a sincronização multiplayer via Supabase Realtime
// fica numa camada por cima que só chama submitActions() pra cada jogador.

const SUITS = {
  H: { name: 'Copas' },
  D: { name: 'Ouros' },
  S: { name: 'Espadas' },
  C: { name: 'Paus' },
} as const

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
const RV: Record<string, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
}

type ShopItem = {
  id: string
  name: string
  type: 'heal' | 'stat' | string
  val?: number
  stat?: 'dmg_flat' | 'maxhp'
}
const SHOP_ITEMS: ShopItem[] = []

export type ClassId = 'knight' | 'dealer' | 'necromancer' | string
export type PlayingCard = { r: string; s: keyof typeof SUITS; v: number }
export type EnemyDef = {
  id: string
  name: string
  hp: number
  atk: [number, number]
  reward?: { gold?: [number, number] }
}
export type EnemyInstance = EnemyDef & {
  isBoss?: boolean
  revived?: boolean
  usedOffer?: boolean
  riso?: boolean
  maxHp?: number
}
export type EnemyCombatState = EnemyInstance & { alive: boolean; maxHp: number }

function evalHand(cards: PlayingCard[]) {
  const frequency = cards.reduce<Record<string, number>>((acc, c) => {
    acc[c.s] = (acc[c.s] ?? 0) + 1
    return acc
  }, {})
  const naipeDominante = Object.keys(frequency).sort((a, b) => (frequency[b] ?? 0) - (frequency[a] ?? 0))[0] as keyof typeof SUITS
  return {
    danoBase: cards.reduce((sum, c) => sum + c.v, 0),
    tipo: 'Mão',
    naipeDominante: naipeDominante || 'H',
  }
}

// ── TIPOS ──
export type PlayerId = 'p1' | 'p2'

export type PlayerAction =
  | { type: 'attack'; targetIndex?: number }
  | { type: 'defend' }
  | { type: 'item'; itemId: string }
  | { type: 'special'; cardIndices: number[]; targetIndex?: number }

export type CombatLogKind = 'info' | 'dmg' | 'crit' | 'gold' | 'poison' | 'boss' | 'heal'
export type CombatLogEntry = { text: string; kind: CombatLogKind; playerId?: PlayerId }

export type PlayerCombatState = {
  playerId: PlayerId
  characterName: string
  classId: ClassId
  hp: number
  maxHp: number
  gold: number
  defending: boolean // reduz 50% do próximo dano recebido, depois reseta
  hand: PlayingCard[]
  deck: PlayingCard[]
  discardPile: PlayingCard[]
  inventory: string[] // ids de SHOP_ITEMS já comprados
  relics: string[]
  flatDmgBonus: number
  alive: boolean
}

export type CombatState = {
  players: Record<PlayerId, PlayerCombatState>
  enemies: EnemyCombatState[]
  turnNum: number
  log: CombatLogEntry[]
  phase: 'awaitingActions' | 'won' | 'lost'
  pendingActions: Partial<Record<PlayerId, [PlayerAction, PlayerAction]>>
}

export type CombatResult =
  | { kind: 'awaitingActions'; state: CombatState } // ainda falta 1 jogador confirmar
  | { kind: 'turnResolved'; state: CombatState }
  | { kind: 'won'; state: CombatState; goldEarned: number }
  | { kind: 'lost'; state: CombatState }

const BASE_ATTACK_DMG: [number, number] = [6, 10]

// ── DECK ──
function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = []
  for (const s of Object.keys(SUITS) as (keyof typeof SUITS)[]) {
    for (const r of RANKS) deck.push({ r, s, v: RV[r] })
  }
  return shuffle(deck)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function drawCard(p: PlayerCombatState): PlayingCard {
  if (p.deck.length === 0) {
    p.deck = shuffle(p.discardPile)
    p.discardPile = []
  }
  return p.deck.pop()!
}

function refillHand(p: PlayerCombatState) {
  while (p.hand.length < 5) p.hand.push(drawCard(p))
}

function log(state: CombatState, text: string, kind: CombatLogKind = 'info', playerId?: PlayerId) {
  state.log.push({ text, kind, playerId })
}

// ── SETUP ──
export function initCombat(params: {
  players: {
    playerId: PlayerId
    characterName: string
    classId: ClassId
    hp: number
    maxHp: number
    gold: number
    relics: string[]
    inventory: string[]
  }[]
  enemies: EnemyDef[]
  isBoss: boolean
  floorScale?: number
}): CombatState {
  const scale = params.isBoss ? 1 : params.floorScale ?? 1

  const players: Record<string, PlayerCombatState> = {}
  for (const p of params.players) {
    const pcs: PlayerCombatState = {
      playerId: p.playerId,
      characterName: p.characterName,
      classId: p.classId,
      hp: p.hp,
      maxHp: p.maxHp,
      gold: p.gold,
      defending: false,
      hand: [],
      deck: buildDeck(),
      discardPile: [],
      inventory: p.inventory,
      relics: p.relics,
      flatDmgBonus: p.classId === 'knight' ? 0 : 0, // armadura tratada via 'defending', não via HP direto aqui
      alive: true,
    }
    refillHand(pcs)
    players[p.playerId] = pcs
  }

  const enemies: EnemyCombatState[] = params.enemies.map((e) => ({
    ...e,
    isBoss: params.isBoss,
    maxHp: Math.floor(e.hp * scale),
    hp: Math.floor(e.hp * scale),
    atk: [Math.floor(e.atk[0] * scale), Math.floor(e.atk[1] * scale)] as [number, number],
    alive: true,
  }))

  const state: CombatState = {
    players: players as Record<PlayerId, PlayerCombatState>,
    enemies,
    turnNum: 1,
    log: [],
    phase: 'awaitingActions',
    pendingActions: {},
  }

  log(state, params.isBoss ? `⚠️ BOSS: ${enemies.map((e) => e.name).join(', ')} surge das sombras!` : `${enemies.map((e) => e.name).join(', ')} bloqueia o caminho!`, params.isBoss ? 'boss' : 'info')

  return state
}

// ── SUBMISSÃO DE AÇÕES ──
/**
 * Cada jogador chama isso com suas 2 ações escolhidas. Quando os 2 jogadores
 * vivos já submeteram, o turno resolve automaticamente.
 */
export function submitActions(prev: CombatState, playerId: PlayerId, actions: [PlayerAction, PlayerAction]): CombatResult {
  const state = cloneState(prev)
  if (state.phase !== 'awaitingActions') return { kind: 'awaitingActions', state }

  state.pendingActions[playerId] = actions

  const alivePlayerIds = (Object.keys(state.players) as PlayerId[]).filter((id) => state.players[id].alive)
  const allSubmitted = alivePlayerIds.every((id) => state.pendingActions[id])

  if (!allSubmitted) {
    log(state, `${state.players[playerId].characterName} confirmou as ações. Aguardando o outro jogador...`, 'info', playerId)
    return { kind: 'awaitingActions', state }
  }

  return resolveTurn(state, alivePlayerIds)
}

// ── RESOLUÇÃO DO TURNO ──
function resolveTurn(state: CombatState, alivePlayerIds: PlayerId[]): CombatResult {
  const order: PlayerId[] = (['p1', 'p2'] as PlayerId[]).filter((id) => alivePlayerIds.includes(id))

  // Ação 1 de cada jogador, depois ação 2 de cada jogador
  for (const slot of [0, 1] as const) {
    for (const pid of order) {
      const actions = state.pendingActions[pid]
      if (!actions) continue
      const player = state.players[pid]
      if (!player.alive) continue
      const action = actions[slot]
      const result = applyPlayerAction(state, player, action)
      if (result === 'won') {
        state.phase = 'won'
        state.pendingActions = {}
        return { kind: 'won', state, goldEarned: sumGoldReward(state) }
      }
    }
  }

  // Turno do(s) inimigo(s)
  enemyPhase(state)

  if (state.phase === 'lost') {
    state.pendingActions = {}
    return { kind: 'lost', state }
  }

  // Prepara próximo turno
  state.turnNum++
  state.pendingActions = {}
  for (const pid of order) {
    const p = state.players[pid]
    p.defending = false
    refillHand(p)
  }

  return { kind: 'turnResolved', state }
}

function applyPlayerAction(state: CombatState, player: PlayerCombatState, action: PlayerAction): 'ok' | 'won' {
  switch (action.type) {
    case 'attack': {
      const target = pickEnemyTarget(state, action.targetIndex)
      if (!target) return 'ok'
      const dmg = BASE_ATTACK_DMG[0] + Math.floor(Math.random() * (BASE_ATTACK_DMG[1] - BASE_ATTACK_DMG[0] + 1)) + player.flatDmgBonus
      target.hp = Math.max(0, target.hp - dmg)
      log(state, `${player.characterName} ataca ${target.name}: ${dmg} dano!`, 'dmg', player.playerId)
      if (target.hp <= 0 && !handleEnemyDeath(state, target)) return 'won'
      return 'ok'
    }
    case 'defend': {
      player.defending = true
      log(state, `${player.characterName} se defende.`, 'info', player.playerId)
      return 'ok'
    }
    case 'item': {
      useItem(state, player, action.itemId)
      return 'ok'
    }
    case 'special': {
      const target = pickEnemyTarget(state, action.targetIndex)
      if (!target) return 'ok'
      const won = useSpecial(state, player, target, action.cardIndices)
      if (won) return 'won'
      return 'ok'
    }
  }
}

function pickEnemyTarget(state: CombatState, targetIndex?: number): EnemyCombatState | null {
  const aliveEnemies = state.enemies.filter((e) => e.alive)
  if (aliveEnemies.length === 0) return null
  if (targetIndex !== undefined) {
    const byIndex = state.enemies[targetIndex]
    if (byIndex && byIndex.alive) return byIndex
  }
  return aliveEnemies[0]
}

/** Retorna false se o combate foi vencido (todos os inimigos mortos) */
function handleEnemyDeath(state: CombatState, enemy: EnemyCombatState): boolean {
  // Dealer Sem Rosto revive uma vez com 40 HP
  if (enemy.id === 'faceless_dealer' && !enemy.revived) {
    enemy.revived = true
    enemy.hp = 40
    log(state, '🎰 O Dealer Sem Rosto REVIVE com 40 HP!', 'boss')
    return true
  }
  enemy.alive = false
  log(state, `✦ ${enemy.name} derrotado!`, 'gold')
  return state.enemies.some((e) => e.alive)
}

function useItem(state: CombatState, player: PlayerCombatState, itemId: string) {
  const idx = player.inventory.indexOf(itemId)
  if (idx === -1) { log(state, `${player.characterName} não tem esse item.`, 'info', player.playerId); return }
  const item = SHOP_ITEMS.find((i) => i.id === itemId)
  if (!item) return
  player.inventory.splice(idx, 1)

  if (item.type === 'heal' && item.val) {
    player.hp = Math.min(player.maxHp, player.hp + item.val)
    log(state, `${player.characterName} usa ${item.name}: +${item.val} HP`, 'heal', player.playerId)
  } else if (item.type === 'stat' && item.stat === 'dmg_flat' && item.val) {
    player.flatDmgBonus += item.val
    log(state, `${player.characterName} usa ${item.name}: +${item.val} dano permanente`, 'info', player.playerId)
  } else if (item.type === 'stat' && item.stat === 'maxhp') {
    player.maxHp += 10
    player.hp = Math.min(player.maxHp, player.hp + 5)
    log(state, `${player.characterName} usa ${item.name}: +10 HP máximo`, 'heal', player.playerId)
  } else {
    log(state, `${player.characterName} usa ${item.name}.`, 'info', player.playerId)
  }
}

/** Retorna true se o combate foi vencido */
function useSpecial(state: CombatState, player: PlayerCombatState, target: EnemyCombatState, cardIndices: number[]): boolean {
  const validIndices = cardIndices.filter((i) => i >= 0 && i < player.hand.length)
  if (validIndices.length === 0) {
    log(state, `${player.characterName} tentou usar uma habilidade sem cartas válidas.`, 'info', player.playerId)
    return false
  }
  const cards = validIndices.map((i) => player.hand[i])

  let dmg: number
  let suitLabel: string
  let sideEffects: string[] = []

  if (cards.length === 5) {
    const ev = evalHand(cards)
    dmg = ev.danoBase + player.flatDmgBonus
    if (player.classId === 'dealer' && ev.tipo === 'Royal Flush') dmg *= 2
    if (player.relics.includes('philosophers_card') && ev.tipo === 'Royal Flush') dmg = Math.floor(dmg * 3)
    if (player.relics.includes('cursed_hand') && ev.tipo === 'Par') dmg += ev.danoBase
    if (ev.naipeDominante === 'S') dmg = Math.floor(dmg * 1.2)
    dmg = Math.max(1, Math.floor(dmg))
    suitLabel = `${ev.tipo} (${SUITS[ev.naipeDominante].name})`

    if (ev.naipeDominante === 'H') {
      let heal = Math.ceil(dmg * 0.3)
      if (player.classId === 'necromancer') heal = Math.ceil(dmg * 0.5)
      player.hp = Math.min(player.maxHp, player.hp + heal)
      sideEffects.push(`💚 +${heal} HP`)
    } else if (ev.naipeDominante === 'D') {
      const bonus = Math.ceil(dmg * 0.5)
      player.gold += bonus
      sideEffects.push(`💰 +${bonus}`)
    }
  } else {
    // Combo parcial (menos de 5 cartas): efeito reduzido proporcional
    const sumVal = cards.reduce((sum, c) => sum + c.v, 0)
    dmg = Math.max(1, Math.floor(sumVal / 3) + player.flatDmgBonus)
    const suits = cards.map((c) => c.s)
    const dominant = suits.sort((a, b) => suits.filter((s) => s === a).length - suits.filter((s) => s === b).length).pop()!
    suitLabel = `Combo de ${cards.length} carta(s) (${SUITS[dominant].name})`
    if (dominant === 'H') {
      const heal = Math.ceil(dmg * 0.3)
      player.hp = Math.min(player.maxHp, player.hp + heal)
      sideEffects.push(`💚 +${heal} HP`)
    }
  }

  target.hp = Math.max(0, target.hp - dmg)
  log(state, `${player.characterName} usa ${suitLabel} → ${dmg} dano!${sideEffects.length ? ' | ' + sideEffects.join(' | ') : ''}`, dmg >= 20 ? 'crit' : 'dmg', player.playerId)

  // Descarta as cartas usadas
  const selSet = new Set(validIndices)
  cards.forEach((c) => player.discardPile.push(c))
  player.hand = player.hand.filter((_, i: number) => !selSet.has(i))

  if (target.hp <= 0) return !handleEnemyDeath(state, target)
  return false
}

// ── TURNO DO(S) INIMIGO(S) ──
function enemyPhase(state: CombatState) {
  const alivePlayers = (Object.keys(state.players) as PlayerId[])
    .map((id) => state.players[id])
    .filter((p) => p.alive)
  if (alivePlayers.length === 0) return

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue
    const targetPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
    let atkDmg = enemy.atk[0] + Math.floor(Math.random() * (enemy.atk[1] - enemy.atk[0] + 1))

    if (targetPlayer.defending) {
      atkDmg = Math.floor(atkDmg * 0.5)
      targetPlayer.defending = false
    }

    targetPlayer.hp = Math.max(0, targetPlayer.hp - atkDmg)
    log(state, `${enemy.name} ataca ${targetPlayer.characterName}: ${atkDmg} dano!`, 'dmg')

    applyEnemySpecial(state, enemy, targetPlayer)

    if (targetPlayer.hp <= 0) {
      targetPlayer.alive = false
      log(state, `💀 ${targetPlayer.characterName} caiu!`, 'boss')
    }
  }

  const stillAlive = (Object.keys(state.players) as PlayerId[]).some((id) => state.players[id].alive)
  if (!stillAlive) {
    state.phase = 'lost'
    log(state, '💀 O grupo foi derrotado...', 'boss')
  }
}

function applyEnemySpecial(state: CombatState, enemy: EnemyCombatState, targetPlayer: PlayerCombatState) {
  if (enemy.id === 'chip_rat' && state.turnNum % 3 === 0) {
    const stolen = Math.min(5, targetPlayer.gold)
    targetPlayer.gold = Math.max(0, targetPlayer.gold - stolen)
    if (stolen > 0) log(state, `🐀 Rato roubou ${stolen} fichas de ${targetPlayer.characterName}!`, 'gold')
  }
  if (enemy.id === 'card_golem') {
    enemy.atk = [enemy.atk[0] + 1, enemy.atk[1] + 1]
    log(state, `🃏 Golem ficou mais forte! Atk: ${enemy.atk[0]}-${enemy.atk[1]}`, 'info')
  }
  if (enemy.id === 'bone_croupier' && state.turnNum === 3 && !enemy.usedOffer) {
    enemy.usedOffer = true
    targetPlayer.hp = Math.max(0, targetPlayer.hp - 15)
    log(state, `💀 Oferta Final: 15 dano fixo em ${targetPlayer.characterName}!`, 'boss')
  }
  if (enemy.id === 'joker' && state.turnNum % 2 === 0) {
    const bonus = Math.floor(enemy.atk[1] * 0.5)
    targetPlayer.hp = Math.max(0, targetPlayer.hp - bonus)
    log(state, `🃏 Coringa Selvagem: +${bonus} dano extra em ${targetPlayer.characterName}!`, 'boss')
  }
  if (enemy.id === 'the_house') {
    const stolen = Math.min(15, targetPlayer.gold)
    targetPlayer.gold = Math.max(0, targetPlayer.gold - stolen)
    if (stolen > 0) log(state, `🏚️ A Casa sangrou ${stolen} fichas de ${targetPlayer.characterName}!`, 'gold')
  }
  if (enemy.id === 'joker') {
    if (!enemy.riso) {
      enemy.riso = true
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + 15)
      log(state, '🃏 Riso Final: Coringa cura 15 HP!', 'boss')
    } else {
      enemy.riso = false
    }
  }
}

function sumGoldReward(state: CombatState): number {
  const first = state.enemies[0]
  const goldMin = first?.reward?.gold?.[0] ?? 15
  const goldMax = first?.reward?.gold?.[1] ?? 30
  const earned = Math.floor(goldMin + Math.random() * (goldMax - goldMin))
  for (const pid of Object.keys(state.players) as PlayerId[]) {
    state.players[pid].gold += earned
  }
  return earned
}

// ── HELPERS ──
function cloneState(state: CombatState): CombatState {
  const players: Record<string, PlayerCombatState> = {}
  for (const pid of Object.keys(state.players)) {
    const p = state.players[pid as PlayerId]
    players[pid] = { ...p, hand: [...p.hand], deck: [...p.deck], discardPile: [...p.discardPile], inventory: [...p.inventory], relics: [...p.relics] }
  }
  return {
    ...state,
    players: players as Record<PlayerId, PlayerCombatState>,
    enemies: state.enemies.map((e) => ({ ...e, atk: [...e.atk] as [number, number] })),
    log: [...state.log],
    pendingActions: { ...state.pendingActions },
  }
}