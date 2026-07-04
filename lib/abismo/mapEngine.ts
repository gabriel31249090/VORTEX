// lib/abismo/mapEngine.ts
import type { MapNode, MapNodeType } from './types'

const TOTAL_FLOORS = 7

export function generateMap(): MapNode[][] {
  const mapData: MapNode[][] = []

  for (let f = 0; f < TOTAL_FLOORS; f++) {
    const count = f === 0 ? 1 : f === 6 ? 1 : Math.random() < 0.5 ? 2 : 3
    const nodes: MapNode[] = []
    for (let n = 0; n < count; n++) {
      let type: MapNodeType
      if (f === 6) type = 'boss'
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

  for (let f = 0; f < TOTAL_FLOORS - 1; f++) {
    const cur = mapData[f]
    const nxt = mapData[f + 1]
    cur.forEach((node, i) => {
      const targets = [nxt[i % nxt.length]]
      if (nxt.length > 1 && Math.random() < 0.45) targets.push(nxt[(i + 1) % nxt.length])
      targets.forEach(t => {
        if (!node.connections.includes(t.id)) node.connections.push(t.id)
      })
    })
  }

  return mapData
}

export function getNode(mapData: MapNode[][], id: string): MapNode | null {
  for (const floor of mapData) {
    for (const n of floor) {
      if (n.id === id) return n
    }
  }
  return null
}

export function getNodeById(mapData: MapNode[][], id: string | null): MapNode | null {
  if (!id) return null
  return getNode(mapData, id)
}
