// lib/abismo/economy.ts
// Lógica de loja e eventos: compra/venda de itens, rolagem de relíquias
// e resolução das escolhas de evento. Cada função é pura (recebe stats,
// devolve stats novos) pra ficar fácil de persistir via updateRun.

import { RELICS, SHOP_ITEMS, EVENTS } from './constants'
import type { ShopItemDef, EventDef } from './types'
import type { RunPlayerStats } from './runSync'

export type EconomyResult =
  | { ok: true; stats: RunPlayerStats; message: string }
  | { ok: false; message: string }

/** Sorteia uma relíquia que o jogador ainda não tem. Se já tiver todas, retorna null. */
function rollRelicId(owned: string[]): string | null {
  const available = RELICS.filter(r => !owned.includes(r.id))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)].id
}

function relicName(id: string): string {
  return RELICS.find(r => r.id === id)?.name || 'Relíquia desconhecida'
}

/** Sorteia o estoque da loja (itens sem repetição) toda vez que um nó de loja é aberto. */
export function pickShopStock(count = 3): ShopItemDef[] {
  const pool = [...SHOP_ITEMS]
  const stock: ShopItemDef[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    stock.push(pool.splice(idx, 1)[0])
  }
  return stock
}

export function pickRandomEvent(): EventDef {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)]
}

/** Compra um item da loja. Aplica o efeito imediatamente (cura, bônus permanente ou relíquia). */
export function buyItem(stats: RunPlayerStats, item: ShopItemDef): EconomyResult {
  if (stats.gold < item.cost) return { ok: false, message: 'Fichas insuficientes.' }

  const next: RunPlayerStats = { ...stats, gold: stats.gold - item.cost }
  let message = ''

  if (item.type === 'heal') {
    next.hp = Math.min(next.maxHp, next.hp + (item.val || 0))
    message = `+${item.val} HP restaurado.`
  } else if (item.type === 'stat') {
    if (item.stat === 'discard') {
      next.extraDiscards = (next.extraDiscards || 0) + 1
      message = '+1 troca permanente por combate.'
    } else if (item.stat === 'gold_mult') {
      next.goldMult = (next.goldMult || 1) + 0.2
      message = 'Fichas ganhas em combate +20%.'
    } else if (item.stat === 'dmg_flat') {
      next.dmgBonus = (next.dmgBonus || 0) + (item.val || 0)
      message = `+${item.val} de dano em todas as mãos.`
    } else if (item.stat === 'maxhp') {
      next.maxHp = next.maxHp + 10
      next.hp = Math.min(next.maxHp, next.hp + 5)
      message = '+10 HP Máximo, +5 HP curado.'
    }
  } else if (item.type === 'relic') {
    const relicId = rollRelicId(next.relics)
    if (relicId) {
      next.relics = [...next.relics, relicId]
      message = `Relíquia obtida: ${relicName(relicId)}.`
    } else {
      // já tem todas as relíquias — devolve metade do custo em fichas pra não ser uma compra "morta"
      next.gold += Math.round(item.cost / 2)
      message = 'Você já tem todas as relíquias! Metade das fichas foi devolvida.'
    }
  }

  return { ok: true, stats: next, message }
}

/** Vende uma relíquia que o jogador já possui, por um preço fixo. */
export function sellRelic(stats: RunPlayerStats, relicId: string, price = 20): EconomyResult {
  if (!stats.relics.includes(relicId)) return { ok: false, message: 'Você não tem essa relíquia.' }
  const next: RunPlayerStats = {
    ...stats,
    gold: stats.gold + price,
    relics: stats.relics.filter(r => r !== relicId),
  }
  return { ok: true, stats: next, message: `Vendeu ${relicName(relicId)} por ${price} fichas.` }
}

/** Resolve a escolha de um evento. HP nunca cai abaixo de 1 por causa de um evento (só combate mata). */
export function resolveEventAction(stats: RunPlayerStats, action: string): EconomyResult {
  const next: RunPlayerStats = { ...stats }
  let message = ''
  const clampHp = (v: number) => Math.max(1, Math.min(next.maxHp, v))

  function grantRelicOrGold(fallbackGold: number) {
    const relicId = rollRelicId(next.relics)
    if (relicId) {
      next.relics = [...next.relics, relicId]
      message += ` Relíquia obtida: ${relicName(relicId)}.`
    } else {
      next.gold += fallbackGold
      message += ` Sem relíquias novas — ganhou ${fallbackGold} fichas.`
    }
  }

  switch (action) {
    case 'gamble_30':
      if (next.gold < 30) return { ok: false, message: 'Fichas insuficientes pra essa aposta.' }
      next.gold -= 30
      if (Math.random() < 0.6) { next.gold += 60; message = 'Sorte grande! +60 fichas.' }
      else message = 'Perdeu a aposta.'
      break

    case 'gamble_60':
      if (next.gold < 60) return { ok: false, message: 'Fichas insuficientes pra essa aposta.' }
      next.gold -= 60
      if (Math.random() < 0.4) { next.gold += 130; message = 'Aposta arriscada compensou! +130 fichas.' }
      else message = 'A casa venceu dessa vez.'
      break

    case 'cursed_open':
      next.hp = clampHp(next.hp - 8)
      message = 'A maldição drenou sua força (-8 HP).'
      grantRelicOrGold(30)
      break

    case 'cursed_burn':
      next.gold += 15
      message = 'Queimou o baú e recolheu +15 fichas das cinzas.'
      break

    case 'ghost_heal':
      if (next.gold < 90) return { ok: false, message: 'Fichas insuficientes.' }
      next.gold -= 90
      next.hp = next.maxHp
      message = 'Cura completa concedida pelo mercador fantasma.'
      break

    case 'ghost_dmg':
      if (next.gold < 70) return { ok: false, message: 'Fichas insuficientes.' }
      next.gold -= 70
      next.dmgBonus = (next.dmgBonus || 0) + 5
      message = '+5 de dano permanente.'
      break

    case 'ghost_steal':
      if (Math.random() < 0.5) { message = 'Roubou com sucesso!'; grantRelicOrGold(25) }
      else { next.hp = clampHp(next.hp - 20); message = 'Foi pego roubando! -20 HP.' }
      break

    case 'shrine_relic':
      next.hp = clampHp(next.hp - 10)
      message = 'O santuário drenou 10 HP.'
      grantRelicOrGold(30)
      break

    case 'shrine_gold':
      next.hp = clampHp(next.hp - 15)
      next.gold += 80
      message = 'O santuário drenou 15 HP e concedeu 80 fichas.'
      break

    case 'mirror_break': {
      const r = Math.random()
      if (r < 0.34) { next.gold += 30; message = 'O espelho estilhaçou em fichas! +30.' }
      else if (r < 0.67) { next.hp = clampHp(next.hp - 10); message = 'Um estilhaço te cortou. -10 HP.' }
      else { message = 'Encontrou algo entre os cacos.'; grantRelicOrGold(30) }
      break
    }

    case 'mirror_watch':
      next.bonusDiscardsNextCombat = (next.bonusDiscardsNextCombat || 0) + 2
      message = '+2 trocas garantidas no seu próximo combate.'
      break

    case 'fortune_heal':
      next.hp = clampHp(next.hp + 20)
      message = '+20 HP restaurado pela cartomante.'
      break

    case 'fortune_gold':
      next.gold += 50
      message = '+50 fichas reveladas no destino.'
      break

    case 'fortune_relic':
      next.hp = clampHp(next.hp - 12)
      message = 'A Carta do Vazio cobrou seu preço (-12 HP).'
      grantRelicOrGold(30)
      break

    case 'leave':
    default:
      message = 'Você seguiu em frente.'
      break
  }

  return { ok: true, stats: next, message }
}