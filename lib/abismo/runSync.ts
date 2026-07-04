// lib/abismo/runSync.ts
// Camada de sincronização multiplayer via Supabase Realtime.
// Guarda o mapa + estado de combate da run numa linha só, e avisa
// os dois navegadores via Realtime sempre que ela muda.

import { createClient } from '@/lib/supabase'
import { generateMap, type FloorMap } from './mapGenerator'
import type { CombatState } from './combatEngine'

export type ClassId = string

export type RunStatus = 'waiting' | 'map' | 'combat' | 'won' | 'lost'

/** Stats do personagem que sobrevivem entre um combate e outro dentro da mesma run. */
export type RunPlayerStats = {
  characterId: string
  characterName: string
  classId: ClassId
  avatarUrl: string | null
  hp: number
  maxHp: number
  gold: number
  relics: string[]
  inventory: string[]
  /** Bônus permanentes comprados na loja / ganhos em eventos, ao longo da run. */
  extraDiscards?: number
  dmgBonus?: number
  goldMult?: number
  /** Bônus de uso único, consumido no próximo combate que o jogador iniciar. */
  bonusDiscardsNextCombat?: number
}

export type AbismoRun = {
  id: string
  host_user_id: string
  host_character_id: string
  host_stats: RunPlayerStats
  guest_user_id: string | null
  guest_character_id: string | null
  guest_stats: RunPlayerStats | null
  floor_map: FloorMap
  current_node_id: string
  combat_state: CombatState | null
  /** Quem tá com a vez de combate agora. null = ninguém em combate (mapa livre pros dois). */
  combat_turn_user_id: string | null
  status: RunStatus
  created_at: string
  updated_at: string
}

/** Cria uma sala nova. O host já entra direto no mapa; fica 'waiting' até um segundo jogador entrar. */
export async function createRun(hostUserId: string, hostStats: RunPlayerStats): Promise<AbismoRun> {
  const supabase = createClient()
  const floorMap = generateMap()
  const { data, error } = await supabase
    .from('abismo_runs')
    .insert({
      host_user_id: hostUserId,
      host_character_id: hostStats.characterId,
      host_stats: hostStats,
      floor_map: floorMap,
      current_node_id: floorMap[0][0].id,
      status: 'waiting',
      combat_turn_user_id: null,
    })
    .select()
    .single()
  if (error) throw error
  return data as AbismoRun
}

/** Segundo jogador entra numa sala existente usando o ID da run (compartilhado por link/código). */
export async function joinRun(runId: string, guestUserId: string, guestStats: RunPlayerStats): Promise<AbismoRun> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('abismo_runs')
    .update({
      guest_user_id: guestUserId,
      guest_character_id: guestStats.characterId,
      guest_stats: guestStats,
      status: 'map',
    })
    .eq('id', runId)
    .is('guest_user_id', null) // evita 2 pessoas entrarem na mesma vaga
    .select()
    .single()
  if (error) throw error
  return data as AbismoRun
}

export async function getRun(runId: string): Promise<AbismoRun | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('abismo_runs').select('*').eq('id', runId).single()
  if (error) return null
  return data as AbismoRun
}

/** Assina mudanças em tempo real na run. Chama onUpdate toda vez que o outro jogador altera algo. Retorna a função de cleanup. */
export function subscribeToRun(runId: string, onUpdate: (run: AbismoRun) => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel(`abismo_run_${runId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'abismo_runs', filter: `id=eq.${runId}` },
      (payload) => onUpdate(payload.new as AbismoRun)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** Salva progresso (mapa, nó atual, estado de combate, stats dos jogadores, status, vez de combate). */
export async function updateRun(
  runId: string,
  patch: Partial<
    Pick<
      AbismoRun,
      'floor_map' | 'current_node_id' | 'combat_state' | 'status' | 'host_stats' | 'guest_stats' | 'combat_turn_user_id'
    >
  >
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('abismo_runs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) throw error
}

/**
 * Tenta travar a vez de combate pro usuário. Usa uma condição atômica no
 * WHERE (combat_turn_user_id is null) pra evitar que os dois jogadores
 * entrem em combate ao mesmo tempo por uma coincidência de cliques.
 * Retorna null se a vez já tiver sido tomada por outro jogador antes.
 */
export async function tryStartCombat(
  runId: string,
  userId: string,
  patch: Partial<Pick<AbismoRun, 'floor_map' | 'current_node_id' | 'combat_state' | 'status' | 'host_stats' | 'guest_stats'>>
): Promise<AbismoRun | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('abismo_runs')
    .update({ ...patch, combat_turn_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', runId)
    .is('combat_turn_user_id', null)
    .select()
    .single()
  if (error) return null
  return data as AbismoRun
}

export async function deleteRun(runId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('abismo_runs').delete().eq('id', runId)
  if (error) throw error
}