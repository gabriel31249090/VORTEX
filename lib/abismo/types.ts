// lib/abismo/types.ts

export type Suit = 'H' | 'D' | 'S' | 'C' // Copas, Ouros, Espadas, Paus
export type ClassId = 'gambler' | 'trickster' | 'knight' | 'necromancer' | 'dealer'
export type ClassPassive = 'gold_double' | 'extra_discard' | 'armor_start' | 'lifesteal' | 'cursed_master'

export type PlayingCard = {
  r: string // rank: '2'..'10','J','Q','K','A'
  s: Suit
  v: number // valor numérico, A=14
}

export type HandType =
  | 'Carta Alta' | 'Par' | 'Dois Pares' | 'Trinca' | 'Sequência'
  | 'Flush' | 'Full House' | 'Quadra' | 'Straight Flush' | 'Royal Flush'

export type HandEval = {
  tipo: HandType | '—'
  danoBase: number
  naipeDominante: Suit
  highCard?: number
}

export type EnemyDef = {
  id: string
  name: string
  icon: string
  type: string
  hp: number
  atk: [number, number]
  desc: string
  skills: string
  floor: number
  reward: { gold: [number, number] }
  isBoss?: boolean
  deathMsg?: string
}

export type EnemyInstance = EnemyDef & {
  maxHp: number
  hp: number
  usedOffer?: boolean
  revived?: boolean
  riso?: boolean
}

export type RelicDef = {
  id: string
  name: string
  icon: string
  desc: string
  effect: string
}

export type ShopItemDef = {
  id: string
  name: string
  icon: string
  desc: string
  cost: number
  type: 'heal' | 'stat' | 'relic'
  stat?: 'discard' | 'gold_mult' | 'dmg_flat' | 'maxhp'
  val?: number
}

export type EventDef = {
  id: string
  title: string
  icon: string
  desc: string
  choices: { txt: string; action: string }[]
}

export type MapNodeType = 'combat' | 'shop' | 'event' | 'boss'

export type MapNode = {
  id: string
  floor: number
  n: number
  type: MapNodeType
  visited: boolean
  connections: string[]
}

// Snapshot do personagem vindo da ficha (Supabase) usado pra iniciar a run
export type CharacterSnapshot = {
  id: string
  name: string
  classId: ClassId
  con: number // usado pra HP extra opcional
  avatar_url: string | null
}
