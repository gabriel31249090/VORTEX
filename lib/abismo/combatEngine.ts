// lib/abismo/combatEngine.ts

type Suit = 'H' | 'C' | 'D' | 'S'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

type ClassId = 'knight' | 'dealer' | 'necromancer' | 'rogue' | 'mage' | string

type PlayingCard = { r: Rank; s: Suit; v: number }
type EnemyDef = { id: string; name: string; hp: number; atk: [number, number]; reward?: { gold: [number, number] } }
type EnemyInstance = EnemyDef & { isBoss: boolean; maxHp: number; hp: number; revived?: boolean; usedOffer?: boolean; riso?: boolean }
type HandEval = { tipo: string; danoBase: number; naipeDominante: Suit }
type RelicDef = { id: string; icon: string; name: string; desc: string }

const SUITS = {
  H: { name: 'Copas' },
  C: { name: 'Paus' },
  D: { name: 'Ouros' },
  S: { name: 'Espadas' },
} as const

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
const RV: Record<Rank, number> = {
  A: 14,
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

const RELICS: RelicDef[] = [
  { id: 'philosophers_card', icon: '🃏', name: "Philosopher's Card", desc: 'Três vezes dano no Royal Flush.' },
  { id: 'cursed_hand', icon: '👻', name: 'Cursed Hand', desc: 'Par causa dano e custo.' },
  { id: 'dead_mans_hand', icon: '💀', name: "Dead Man's Hand", desc: '10 de dano extra com A, A, 8, 8.' },
  { id: 'poison_ring', icon: '🧪', name: 'Poison Ring', desc: 'Veneno dura mais tempo.' },
  { id: 'blood_chip', icon: '❤️', name: 'Blood Chip', desc: 'Aumenta cura de Hearts.' },
  { id: 'mirror_shard', icon: '🪞', name: 'Mirror Shard', desc: 'Chance de refletir dano.' },
  { id: 'blood_pact', icon: '🩸', name: 'Blood Pact', desc: 'Bônus de sobrevivência a cada turno.' },
  { id: 'void_token', icon: '🕳️', name: 'Void Token', desc: 'Salva parte da aposta ao fugir.' },
  { id: 'iron_shield', icon: '🛡️', name: 'Iron Shield', desc: 'Começa com armadura extra.' },
]

function getDominantSuit(hand: PlayingCard[]): Suit {
  const counts: Record<Suit, number> = { H: 0, C: 0, D: 0, S: 0 }
  hand.forEach((card) => {
    counts[card.s]++
  })
  return (Object.keys(counts) as Suit[]).reduce((best, suit) => (counts[suit] >= counts[best] ? suit : best), 'H')
}

function detectHandType(hand: PlayingCard[]): string {
  const ranks = hand.map((c) => c.r)
  const suit = hand[0]?.s
  const allSameSuit = suit !== undefined && hand.every((c) => c.s === suit)
  const rankValues = hand.map((c) => RV[c.r]).sort((a, b) => a - b)
  const royalValues = [10, 11, 12, 13, 14]
  const isRoyal = allSameSuit && rankValues.length === 5 && rankValues.every((value, index) => value === royalValues[index])
  if (isRoyal) return 'Royal Flush'

  const rankFreq = ranks.reduce<Record<Rank, number>>((acc, r) => {
    acc[r] = (acc[r] || 0) + 1
    return acc
  }, {} as Record<Rank, number>)
  const freqValues = Object.values(rankFreq)
  if (freqValues.includes(4)) return 'Quadra'
  if (freqValues.includes(3) && freqValues.includes(2)) return 'Full House'
  if (freqValues.includes(3)) return 'Trinca'
  if (freqValues.filter((value) => value === 2).length === 2) return 'Dois Pares'
  if (freqValues.includes(2)) return 'Par'
  return 'Carta Alta'
}

function evalHand(hand: PlayingCard[]): HandEval {
  return {
    tipo: detectHandType(hand),
    danoBase: hand.reduce((sum, card) => sum + card.v, 0),
    naipeDominante: getDominantSuit(hand),
  }
}

export type CombatLogKind = 'info' | 'dmg' | 'crit' | 'gold' | 'poison' | 'boss'
export type CombatLogEntry = { text: string; kind: CombatLogKind }

export type CombatState = {
  hp: number
  maxHp: number
  gold: number
  relics: string[]
  classId: ClassId
  goldMult: number
  flatDmgBonus: number
  extraDiscardsPerFloor: number
  armor: number
  poisonOnEnemy: number
  bet: number
  turnNum: number
  discardLeft: number
  tempExtraDiscards: number
  surviveBonus: number
  deck: PlayingCard[]
  discardPile: PlayingCard[]
  hand: PlayingCard[]
  enemy: EnemyInstance
  combatRunning: boolean
  playerActionBlocked: boolean
  log: CombatLogEntry[]
}

export type CombatResult =
  | { kind: 'continue'; state: CombatState }
  | { kind: 'enemyDefeated'; state: CombatState; goldEarned: number; relicDropped: RelicDef | null; leveledFloor: boolean }
  | { kind: 'playerDefeated'; state: CombatState }

// ── DECK ──
export function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = []
  for (const s of Object.keys(SUITS) as (keyof typeof SUITS)[]) {
    for (const r of RANKS) deck.push({ r, s, v: RV[r] })
  }
  return shuffle(deck)
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function drawCard(state: CombatState): PlayingCard {
  if (state.deck.length === 0) {
    state.deck = shuffle(state.discardPile)
    state.discardPile = []
  }
  return state.deck.pop()!
}

function log(state: CombatState, text: string, kind: CombatLogKind = 'info') {
  state.log.push({ text, kind })
}

// ── SETUP ──
export function initCombat(params: {
  hp: number
  maxHp: number
  gold: number
  relics: string[]
  classId: ClassId
  goldMult: number
  extraDiscardsPerFloor: number
  enemy: EnemyDef
  isBoss: boolean
  floorScale?: number // multiplicador de hp/atk pra inimigos comuns (1 + floorIdx*0.15)
}): CombatState {
  const scale = params.isBoss ? 1 : params.floorScale ?? 1
  const enemy: EnemyInstance = {
    ...params.enemy,
    isBoss: params.isBoss,
    maxHp: Math.floor(params.enemy.hp * scale),
    hp: Math.floor(params.enemy.hp * scale),
    atk: [Math.floor(params.enemy.atk[0] * scale), Math.floor(params.enemy.atk[1] * scale)] as [number, number],
  }

  let armor = 0
  if (params.classId === 'knight') armor += 4 // armor_start
  if (params.relics.includes('iron_shield')) armor += 3

  const state: CombatState = {
    hp: params.hp,
    maxHp: params.maxHp,
    gold: params.gold,
    relics: params.relics,
    classId: params.classId,
    goldMult: params.goldMult,
    flatDmgBonus: 0,
    extraDiscardsPerFloor: params.extraDiscardsPerFloor,
    armor,
    poisonOnEnemy: 0,
    bet: 0,
    turnNum: 1,
    discardLeft: 1 + params.extraDiscardsPerFloor,
    tempExtraDiscards: 0,
    surviveBonus: 0,
    deck: [],
    discardPile: [],
    hand: [],
    enemy,
    combatRunning: true,
    playerActionBlocked: false,
    log: [],
  }

  state.deck = buildDeck()
  for (let i = 0; i < 5; i++) state.hand.push(drawCard(state))

  log(state, params.isBoss ? `⚠️ BOSS: ${enemy.name} surge das sombras!` : `${enemy.name} bloqueia seu caminho!`, params.isBoss ? 'boss' : 'info')

  return state
}

// ── DAMAGE CALC ──
export function calcDamage(state: CombatState, ev: HandEval): number {
  let dmg = ev.danoBase + state.flatDmgBonus + state.surviveBonus
  if (state.classId === 'dealer' && ev.tipo === 'Royal Flush') dmg *= 2
  if (state.relics.includes('philosophers_card') && ev.tipo === 'Royal Flush') dmg = Math.floor(dmg * 3)
  if (state.relics.includes('cursed_hand') && ev.tipo === 'Par') dmg += ev.danoBase
  if (state.relics.includes('dead_mans_hand') && isDeadMansHand(state.hand)) dmg += 10
  if (ev.naipeDominante === 'S') dmg = Math.floor(dmg * 1.2)
  return Math.max(1, Math.floor(dmg))
}

function isDeadMansHand(hand: PlayingCard[]): boolean {
  const ranks = hand.map((c) => c.r)
  return ranks.filter((r) => r === 'A').length >= 2 && ranks.filter((r) => r === '8').length >= 2
}

// ── PLAYER TURN: JOGAR MÃO ──
export function playSelectedHand(prev: CombatState, selectedIndices: number[]): CombatResult {
  const state = cloneState(prev)
  if (!state.combatRunning || state.playerActionBlocked || selectedIndices.length !== 5) {
    return { kind: 'continue', state }
  }

  const sel = selectedIndices.map((i) => state.hand[i])
  const ev = evalHand(sel)
  let dmg = calcDamage(state, ev)
  const nd = ev.naipeDominante
  const sideEffects: string[] = []

  // Efeitos por naipe
  if (nd === 'H') {
    let heal = Math.ceil(dmg * 0.3)
    if (state.classId === 'necromancer') heal = Math.ceil(dmg * 0.5) // lifesteal
    if (state.relics.includes('blood_chip')) heal = Math.ceil(heal * 1.5)
    state.hp = Math.min(state.maxHp, state.hp + heal)
    sideEffects.push(`💚 +${heal} HP`)
  } else if (nd === 'C') {
    let pturn = 2
    if (state.relics.includes('poison_ring')) pturn += 3
    state.poisonOnEnemy += pturn
    sideEffects.push(`☠ Veneno +${pturn}t`)
  } else if (nd === 'D') {
    let bonus = Math.ceil(dmg * 0.5)
    bonus = Math.floor(bonus * state.goldMult)
    if (state.bet > 0) { bonus += state.bet * 2; sideEffects.push(`🎰 Aposta +${state.bet * 2}`) }
    state.gold += bonus
    sideEffects.push(`💰 +${bonus}`)
  }

  if (state.relics.includes('cursed_hand') && ev.tipo === 'Par') {
    state.hp = Math.max(1, state.hp - 3)
    sideEffects.push('😈 -3 HP')
  }

  // Dealer Sem Rosto: ignora 30% do dano
  if (state.enemy.id === 'faceless_dealer') dmg = Math.floor(dmg * 0.7)
  state.enemy.hp = Math.max(0, state.enemy.hp - dmg)

  log(state, `${ev.tipo} (${SUITS[nd].name}) → ${dmg} dano!${sideEffects.length ? ' | ' + sideEffects.join(' | ') : ''}`, dmg >= 28 ? 'crit' : 'dmg')

  // Descarta cartas jogadas
  const selSet = new Set(selectedIndices)
  sel.forEach((c) => state.discardPile.push(c))
  state.hand = state.hand.filter((_, i) => !selSet.has(i))

  if (state.enemy.hp <= 0) {
    // Dealer Sem Rosto revive uma vez com 40 HP
    if (state.enemy.id === 'faceless_dealer' && !state.enemy.revived) {
      state.enemy.revived = true
      state.enemy.hp = 40
      log(state, '🎰 O Dealer Sem Rosto REVIVE com 40 HP!', 'boss')
      return { kind: 'continue', state }
    }
    return resolveWin(state)
  }

  state.playerActionBlocked = true
  return { kind: 'continue', state }
}

function resolveWin(state: CombatState): CombatResult {
  const e = state.enemy
  const goldMin = e.reward?.gold?.[0] ?? 15
  const goldMax = e.reward?.gold?.[1] ?? 30
  let earned = Math.floor(goldMin + Math.random() * (goldMax - goldMin))
  earned = Math.floor(earned * state.goldMult)
  if (state.bet > 0) earned += state.bet
  state.gold += earned
  log(state, `✦ ${e.name} derrotado! +${earned} fichas!`, 'gold')

  state.combatRunning = false
  state.playerActionBlocked = true

  let relicDropped: RelicDef | null = null
  const relicChance = e.isBoss ? 0.7 : 0.18
  if (Math.random() < relicChance) {
    const available = RELICS.filter((r) => !state.relics.includes(r.id))
    if (available.length) {
      relicDropped = available[Math.floor(Math.random() * available.length)]
      state.relics.push(relicDropped.id)
      log(state, `✦ Relíquia obtida: ${relicDropped.icon} ${relicDropped.name} — ${relicDropped.desc}`, 'gold')
    }
  }

  return { kind: 'enemyDefeated', state, goldEarned: earned, relicDropped, leveledFloor: !!e.isBoss }
}

// ── PLAYER TURN: TROCAR CARTAS ──
export function discardSelected(prev: CombatState, selectedIndices: number[]): CombatState {
  const state = cloneState(prev)
  if (!state.combatRunning || state.playerActionBlocked) return state
  if (state.discardLeft <= 0) { log(state, 'Sem trocas restantes!', 'info'); return state }
  if (selectedIndices.length === 0) { log(state, 'Selecione cartas para trocar.', 'info'); return state }

  state.discardLeft--
  const selSet = new Set(selectedIndices)
  selectedIndices.forEach((i) => state.discardPile.push(state.hand[i]))
  state.hand = state.hand.filter((_, i) => !selSet.has(i))
  while (state.hand.length < 5) state.hand.push(drawCard(state))

  log(state, `Trocou ${selectedIndices.length} carta(s). (${state.discardLeft} restantes)`, 'info')
  return state
}

// ── TURNO DO INIMIGO ──
export function resolveEnemyTurn(prev: CombatState): CombatResult {
  const state = cloneState(prev)
  const e = state.enemy
  if (!e || e.hp <= 0) return { kind: 'continue', state }

  let atkDmg = e.atk[0] + Math.floor(Math.random() * (e.atk[1] - e.atk[0] + 1))

  // Absorção de armadura
  let absorbed = 0
  if (state.armor > 0) {
    absorbed = Math.min(state.armor, atkDmg)
    state.armor -= absorbed
    atkDmg -= absorbed
  }

  // Estilhaço Espelhado: 30% de refletir
  if (state.relics.includes('mirror_shard') && Math.random() < 0.3) {
    const reflected = Math.floor(atkDmg * 0.5)
    e.hp = Math.max(0, e.hp - reflected)
    log(state, `🪞 Reflexo! ${reflected} dano refletido!`, 'gold')
    if (e.hp <= 0) return resolveWin(state)
  }

  state.hp = Math.max(0, state.hp - atkDmg)
  log(state, `${e.name} ataca: ${atkDmg} dano${absorbed > 0 ? ` (${absorbed} absorvido)` : ''}!`, 'dmg')

  // Veneno
  if (state.poisonOnEnemy > 0) {
    e.hp = Math.max(0, e.hp - 5)
    state.poisonOnEnemy--
    log(state, `☠ Veneno: 5 dano! (${state.poisonOnEnemy}t restantes)`, 'poison')
    if (e.hp <= 0) return resolveWin(state)
  }

  applyEnemySpecial(state)

  if (state.hp <= 0) {
    state.combatRunning = false
    state.playerActionBlocked = true
    log(state, '💀 Você foi derrotado...', 'boss')
    return { kind: 'playerDefeated', state }
  }

  if (state.relics.includes('blood_pact')) state.surviveBonus++

  state.turnNum++
  state.discardLeft = 1 + state.extraDiscardsPerFloor + state.tempExtraDiscards
  state.tempExtraDiscards = 0
  state.bet = 0

  // Compra nova mão
  state.hand = []
  for (let i = 0; i < 5; i++) state.hand.push(drawCard(state))

  state.combatRunning = true
  state.playerActionBlocked = false

  return { kind: 'continue', state }
}

function applyEnemySpecial(state: CombatState) {
  const e = state.enemy
  if (e.id === 'chip_rat' && state.turnNum % 3 === 0) {
    const stolen = Math.min(5, state.gold)
    state.gold = Math.max(0, state.gold - stolen)
    if (stolen > 0) log(state, `🐀 Rato roubou ${stolen} fichas!`, 'gold')
  }
  if (e.id === 'card_golem') {
    e.atk = [e.atk[0] + 1, e.atk[1] + 1]
    log(state, `🃏 Golem ficou mais forte! Atk: ${e.atk[0]}-${e.atk[1]}`, 'info')
  }
  if (e.id === 'bone_croupier' && state.turnNum === 3 && !e.usedOffer) {
    e.usedOffer = true
    state.hp = Math.max(0, state.hp - 15)
    log(state, '💀 Oferta Final: 15 dano fixo!', 'boss')
  }
  if (e.id === 'joker' && state.turnNum % 2 === 0) {
    const bonus = Math.floor(e.atk[1] * 0.5)
    state.hp = Math.max(0, state.hp - bonus)
    log(state, `🃏 Coringa Selvagem: +${bonus} dano extra!`, 'boss')
  }
  if (e.id === 'the_house') {
    const stolen = Math.min(15, state.gold)
    state.gold = Math.max(0, state.gold - stolen)
    if (stolen > 0) log(state, `🏚️ A Casa sangrou ${stolen} fichas!`, 'gold')
  }
  if (e.id === 'joker') {
    if (!e.riso) {
      e.riso = true
      e.hp = Math.min(e.maxHp, e.hp + 15)
      log(state, '🃏 Riso Final: Coringa cura 15 HP!', 'boss')
    } else {
      e.riso = false
    }
  }
}

// ── FUGIR ──
export function fleeCombat(prev: CombatState): CombatState {
  const state = cloneState(prev)
  if (!state.combatRunning || state.playerActionBlocked) return state

  if (state.relics.includes('void_token') && state.bet > 0) {
    const saved = Math.floor(state.bet * 0.5)
    state.gold += saved
    log(state, `⇄ Fugiu! Ficha do Vazio salvou ${saved} fichas.`, 'gold')
  } else {
    const penalty = Math.min(20, state.gold)
    state.gold = Math.max(0, state.gold - penalty)
    log(state, `⇄ Fugiu! Perdeu ${penalty} fichas.`, 'info')
  }

  state.combatRunning = false
  state.playerActionBlocked = true
  return state
}

// ── APOSTAR ──
export function placeBet(prev: CombatState, amount: number): CombatState {
  const state = cloneState(prev)
  if (!state.combatRunning || state.playerActionBlocked) return state
  if (state.gold < amount) { log(state, 'Fichas insuficientes!', 'info'); return state }
  state.gold -= amount
  state.bet += amount
  log(state, `🎰 Apostou ${amount} fichas. (total: ${state.bet})`, 'info')
  return state
}

// ── HELPERS ──
function cloneState(state: CombatState): CombatState {
  return {
    ...state,
    relics: [...state.relics],
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    hand: [...state.hand],
    enemy: { ...state.enemy, atk: [...state.enemy.atk] as [number, number] },
    log: [...state.log],
  }
}