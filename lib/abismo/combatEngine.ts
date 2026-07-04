// lib/abismo/combatEngine.ts
import type { PlayingCard, EnemyInstance, EnemyDef, ClassId, Suit, HandEval } from './types'
import { RANKS, RV, SUITS } from './constants'
import { evalHand, calcDamage } from './poker'

export type CombatState = {
  enemy: EnemyInstance
  playerHp: number
  playerMaxHp: number
  armor: number
  poisonTurns: number
  gold: number
  deck: PlayingCard[]
  hand: PlayingCard[]
  selected: number[] // índices selecionados na mão
  discardsLeft: number
  turn: number
  log: string[]
  lastHandEval: HandEval | null
  surviveBonus: number
  status: 'playing' | 'won' | 'lost'
  seeIntent: boolean // relíquia jokers_eye
  flatDmgBonus: number
  relics: string[]
  classId: ClassId | null
}

export type CombatAction =
  | { type: 'TOGGLE_CARD'; index: number }
  | { type: 'DISCARD_SELECTED' }
  | { type: 'PLAY_HAND' }
  | { type: 'ENEMY_TURN' }
  | { type: 'REFILL_HAND' }
  | { type: 'LOG'; message: string }

function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = []
  const suits: Suit[] = ['H', 'D', 'S', 'C']
  for (const s of suits) {
    for (const r of RANKS) {
      const v = RV[r] ?? Number(r)
      deck.push({ r, s, v })
    }
  }
  // shuffle (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function createCombatState(params: {
  enemyDef: EnemyDef
  playerHp: number
  playerMaxHp: number
  gold: number
  classId: ClassId | null
  relics: string[]
  discardsBase: number
  flatDmgBonus: number
}): CombatState {
  const { enemyDef, playerHp, playerMaxHp, gold, classId, relics, discardsBase, flatDmgBonus } = params

  const deck = buildDeck()
  const hand: PlayingCard[] = []
  for (let i = 0; i < 5; i++) hand.push(deck.pop()!)

  let armor = 0
  if (classId === 'knight') armor += 4
  if (relics.includes('iron_shield')) armor += 3

  const enemy: EnemyInstance = {
    ...enemyDef,
    maxHp: enemyDef.hp,
    hp: enemyDef.hp,
  }

  return {
    enemy,
    playerHp,
    playerMaxHp,
    armor,
    poisonTurns: 0,
    gold,
    deck,
    hand,
    selected: [],
    discardsLeft: discardsBase + (classId === 'trickster' ? 1 : 0),
    turn: 1,
    log: [`Um ${enemyDef.name} bloqueia seu caminho!`],
    lastHandEval: null,
    surviveBonus: 0,
    status: 'playing',
    seeIntent: relics.includes('jokers_eye'),
    flatDmgBonus,
    relics,
    classId,
  }
}

function drawCard(state: CombatState): PlayingCard {
  if (state.deck.length === 0) {
    // reembaralha um baralho novo se acabar (não deveria acontecer em runs normais)
    state.deck = buildDeck()
  }
  return state.deck.pop()!
}

export function combatReducer(state: CombatState, action: CombatAction): CombatState {
  if (state.status !== 'playing' && action.type !== 'LOG') return state

  switch (action.type) {
    case 'TOGGLE_CARD': {
      const already = state.selected.includes(action.index)
      let selected: number[]
      if (already) {
        selected = state.selected.filter(i => i !== action.index)
      } else {
        if (state.selected.length >= 5) return state
        selected = [...state.selected, action.index]
      }
      return { ...state, selected }
    }

    case 'DISCARD_SELECTED': {
      if (state.discardsLeft <= 0 || state.selected.length === 0) return state
      const newHand = [...state.hand]
      const sortedIdx = [...state.selected].sort((a, b) => b - a)
      for (const idx of sortedIdx) newHand.splice(idx, 1, drawCard(state))
      return {
        ...state,
        hand: newHand,
        selected: [],
        discardsLeft: state.discardsLeft - 1,
        log: [...state.log, 'Você trocou suas cartas.'],
      }
    }

    case 'PLAY_HAND': {
      if (state.selected.length !== 5) return state
      const playedCards = state.selected.map(i => state.hand[i])
      const ev = evalHand(playedCards)
      const dmg = calcDamage(ev, {
        flatDmgBonus: state.flatDmgBonus,
        surviveBonus: state.surviveBonus,
        classId: state.classId,
        relics: state.relics,
        hand: playedCards,
      })

      let enemy = { ...state.enemy, hp: Math.max(0, state.enemy.hp - dmg) }
      let playerHp = state.playerHp
      let gold = state.gold
      let poisonTurns = state.poisonTurns
      let armor = state.armor
      const log = [...state.log, `Você jogou ${ev.tipo} e causou ${dmg} de dano!`]

      // Efeitos de naipe dominante
      if (ev.naipeDominante === 'H') {
        const healBonus = state.relics.includes('blood_chip') ? 1.5 : 1
        const heal = Math.floor(dmg * 0.3 * healBonus)
        playerHp = Math.min(state.playerMaxHp, playerHp + heal)
        log.push(`Copas cura ${heal} HP.`)
      }
      if (ev.naipeDominante === 'D') {
        const bonusGold = Math.floor(dmg * 0.5)
        gold += bonusGold
        log.push(`Ouros rende ${bonusGold} fichas extras.`)
      }
      if (ev.naipeDominante === 'C') {
        const poisonAdd = state.relics.includes('poison_ring') ? 3 : 1
        poisonTurns += poisonAdd
        log.push('Paus aplica veneno no inimigo.')
      }

      // Vida sugada pra necromante
      if (state.classId === 'necromancer') {
        const lifesteal = Math.floor(dmg * 0.15)
        playerHp = Math.min(state.playerMaxHp, playerHp + lifesteal)
      }

      // Relíquia hollow_crown
      if (state.relics.includes('hollow_crown') && (ev.tipo === 'Quadra' || ev.tipo === 'Straight Flush' || ev.tipo === 'Royal Flush')) {
        armor = Math.max(0, armor - 5)
      }

      if (enemy.hp <= 0) {
        log.push(`${enemy.name} foi derrotado!`)
        return {
          ...state, enemy, playerHp, gold, poisonTurns, armor, log,
          hand: [], selected: [], lastHandEval: ev, status: 'won',
        }
      }

      // repõe as cartas jogadas
      const newHand = [...state.hand]
      const sortedIdx = [...state.selected].sort((a, b) => b - a)
      for (const idx of sortedIdx) newHand.splice(idx, 1, drawCard(state))

      return {
        ...state, enemy, playerHp, gold, poisonTurns, armor, log,
        hand: newHand, selected: [], lastHandEval: ev,
        surviveBonus: state.relics.includes('blood_pact') ? state.surviveBonus + 1 : state.surviveBonus,
      }
    }

    case 'ENEMY_TURN': {
      if (state.status !== 'playing') return state
      let enemy = { ...state.enemy }
      let playerHp = state.playerHp
      let armor = state.armor
      const log = [...state.log]

      // veneno tira HP do inimigo no início do turno dele
      if (state.poisonTurns > 0) {
        enemy.hp = Math.max(0, enemy.hp - 4)
        log.push(`Veneno causa 4 de dano em ${enemy.name}.`)
        if (enemy.hp <= 0) {
          log.push(`${enemy.name} sucumbiu ao veneno!`)
          return { ...state, enemy, log, status: 'won' }
        }
      }

      const [min, max] = enemy.atk
      let dmg = Math.floor(Math.random() * (max - min + 1)) + min

      // reflexo de dano (mirror_shard)
      const reflect = state.relics.includes('mirror_shard') && Math.random() < 0.3

      let absorbed = Math.min(armor, dmg)
      const remaining = dmg - absorbed
      armor -= absorbed
      playerHp = Math.max(0, playerHp - remaining)
      log.push(`${enemy.name} ataca causando ${dmg} de dano${absorbed > 0 ? ` (${absorbed} absorvido pela armadura)` : ''}.`)

      if (reflect) {
        const reflectDmg = Math.floor(dmg * 0.3)
        enemy.hp = Math.max(0, enemy.hp - reflectDmg)
        log.push(`Estilhaço Espelhado reflete ${reflectDmg} de volta!`)
      }

      const poisonTurns = Math.max(0, state.poisonTurns - 1)

      if (enemy.hp <= 0) {
        log.push(`${enemy.name} foi derrotado!`)
        return { ...state, enemy, playerHp, armor, poisonTurns, log, status: 'won' }
      }

      if (playerHp <= 0) {
        log.push('Você caiu no abismo...')
        return { ...state, enemy, playerHp: 0, armor, poisonTurns, log, status: 'lost' }
      }

      return { ...state, enemy, playerHp, armor, poisonTurns, log, turn: state.turn + 1 }
    }

    case 'LOG':
      return { ...state, log: [...state.log, action.message] }

    default:
      return state
  }
}
