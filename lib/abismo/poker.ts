// lib/abismo/poker.ts
import type { PlayingCard, HandEval, ClassId, HandType } from './types'

export function evalHand(cards: PlayingCard[]): HandEval {
  if (cards.length !== 5) return { tipo: '—', danoBase: 0, naipeDominante: 'S' }

  const sorted = [...cards].sort((a, b) => a.v - b.v)
  const vals = sorted.map(c => c.v)
  const suits = sorted.map(c => c.s)
  const flush = suits.every(s => s === suits[0])

  let straight = false
  if (vals[4] - vals[0] === 4 && new Set(vals).size === 5) straight = true
  else if (vals[0] === 2 && vals[1] === 3 && vals[2] === 4 && vals[3] === 5 && vals[4] === 14) straight = true

  const cnt: Record<number, number> = {}
  vals.forEach(v => { cnt[v] = (cnt[v] || 0) + 1 })
  const grps = Object.entries(cnt).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))

  let tipo: HandType = 'Carta Alta'
  let danoBase = 3

  if (grps[0][1] === 4) { tipo = 'Quadra'; danoBase = 28 }
  else if (grps[0][1] === 3 && grps[1] && grps[1][1] === 2) { tipo = 'Full House'; danoBase = 22 }
  else if (flush && straight && vals[4] === 14 && vals[0] === 10) { tipo = 'Royal Flush'; danoBase = 50 }
  else if (flush && straight) { tipo = 'Straight Flush'; danoBase = 35 }
  else if (flush) { tipo = 'Flush'; danoBase = 18 }
  else if (straight) { tipo = 'Sequência'; danoBase = 15 }
  else if (grps[0][1] === 3) { tipo = 'Trinca'; danoBase = 12 }
  else if (grps[0][1] === 2 && grps[1] && grps[1][1] === 2) { tipo = 'Dois Pares'; danoBase = 9 }
  else if (grps[0][1] === 2) { tipo = 'Par'; danoBase = 6 }

  const sc: Record<string, number> = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const naipeDominante = (Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0]) as HandEval['naipeDominante']

  return { tipo, danoBase, naipeDominante, highCard: vals[4] }
}

export function isDeadMansHand(hand: PlayingCard[]): boolean {
  const ranks = hand.map(c => c.r)
  return ranks.filter(r => r === 'A').length >= 2 && ranks.filter(r => r === '8').length >= 2
}

type DamageModifiers = {
  flatDmgBonus: number
  surviveBonus: number
  classId: ClassId | null
  relics: string[]
  hand: PlayingCard[] // mão completa antes do descarte, pra checar dead_mans_hand
}

export function calcDamage(ev: HandEval, mods: DamageModifiers): number {
  let dmg = ev.danoBase + mods.flatDmgBonus + mods.surviveBonus

  if (mods.classId === 'necromancer' && ev.naipeDominante === 'H') dmg = Math.floor(dmg * 1.2)
  if (mods.classId === 'dealer' && ev.tipo === 'Royal Flush') dmg *= 2
  if (mods.relics.includes('philosophers_card') && ev.tipo === 'Royal Flush') dmg = Math.floor(dmg * 3)
  if (mods.relics.includes('cursed_hand') && ev.tipo === 'Par') dmg += ev.danoBase
  if (mods.relics.includes('dead_mans_hand') && isDeadMansHand(mods.hand)) dmg += 10
  if (ev.naipeDominante === 'S') dmg = Math.floor(dmg * 1.2)

  return Math.max(1, Math.floor(dmg))
}
