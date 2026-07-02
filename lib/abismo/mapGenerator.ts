// lib/abismo/mapGenerator.ts
export type MapNodeType = 'combat' | 'shop' | 'event' | 'boss'

export type MapNode = {
  id: string
  floor: number
  n: number
  type: MapNodeType
  visited: boolean
  connections: string[]
}

export type FloorMap = MapNode[][] // mapData[floorIndex] = lista de nós daquele andar

const TOTAL_FLOORS = 7

/**
 * Gera o mapa completo: 7 andares, cada um com 1-3 nós (exceto o primeiro
 * e o último, que têm sempre 1), e conexões entre andares adjacentes.
 * Andar 0 = sempre combate. Andar 6 (último) = sempre boss.
 */
export function generateMap(): FloorMap {
  const mapData: FloorMap = []

  for (let f = 0; f < TOTAL_FLOORS; f++) {
    const count = f === 0 ? 1 : f === TOTAL_FLOORS - 1 ? 1 : Math.random() < 0.5 ? 2 : 3
    const nodes: MapNode[] = []
    for (let n = 0; n < count; n++) {
      let type: MapNodeType
      if (f === TOTAL_FLOORS - 1) type = 'boss'
      else if (f === 0) type = 'combat'
      else {
        const r = Math.random()
        if (r < 0.45) type = 'combat'
        else if (r < 0.65) type = 'shop'
        else type = 'event'
      }
      nodes.push({ id: `f${f}n${n}`, floor: f, n, type, visited: false, connections: [] })
    }
    mapData.push(nodes)
  }

  // Conecta cada nó de um andar a 1-2 nós do andar seguinte
  for (let f = 0; f < TOTAL_FLOORS - 1; f++) {
    const cur = mapData[f]
    const nxt = mapData[f + 1]
    cur.forEach((node, i) => {
      const targets = [nxt[i % nxt.length]]
      if (nxt.length > 1 && Math.random() < 0.45) targets.push(nxt[(i + 1) % nxt.length])
      targets.forEach((t) => {
        if (!node.connections.includes(t.id)) node.connections.push(t.id)
      })
    })
  }

  return mapData
}

export function getNode(mapData: FloorMap, id: string): MapNode | null {
  for (const floor of mapData) {
    for (const n of floor) if (n.id === id) return n
  }
  return null
}

/** Um nó é acessível se for o nó atual (ainda não visitado) ou estiver conectado a partir do nó atual. */
export function isNodeAccessible(mapData: FloorMap, currentNodeId: string, nodeId: string): boolean {
  if (nodeId === currentNodeId) return true
  const cur = getNode(mapData, currentNodeId)
  return !!cur && cur.connections.includes(nodeId)
}

export function markVisited(mapData: FloorMap, nodeId: string): FloorMap {
  return mapData.map((floor) =>
    floor.map((n) => (n.id === nodeId ? { ...n, visited: true } : n))
  )
}

export const TYPE_ICON: Record<MapNodeType, string> = {
  combat: '⚔️',
  shop: '🏪',
  event: '❓',
  boss: '💀',
}

export const TYPE_LABEL: Record<MapNodeType, string> = {
  combat: 'Combate',
  shop: 'Loja',
  event: 'Evento',
  boss: 'BOSS',
}