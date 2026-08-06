import { createClient } from '@/lib/supabase'

/**
 * Retorna o conjunto de ids "do outro lado" de qualquer bloqueio que
 * envolva o usuário atual — ou seja, gente que ele bloqueou E gente que
 * o bloqueou. Útil pra filtrar feed/listas sem se importar com a direção.
 */
export async function getBlockedIds(userId: string): Promise<Set<string>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

  const set = new Set<string>()
  ;(data || []).forEach((row: { blocker_id: string; blocked_id: string }) => {
    set.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id)
  })
  return set
}
