/**
 * 星砂秘境：五层小路按种子生成，同一颗种子的路是固定的
 * @author zjh
 * @date 2026-10-19
 */

import type { MapDef, NpcDef, TileKind } from './maps'
import { SPECIES } from './species'
import type { Weather } from './weather'

const WIDTH = 11
const HEIGHT = 9
const NAMES = ['', '星砂一层', '星砂二层', '星砂三层', '星砂四层', '星砂最深处']

export const RIFT_WEATHERS: Weather[] = ['sunny', 'fog', 'sand', 'storm', 'snow']

/**
 * 这一层的天气
 * @author zjh
 * @date 2026-10-19
 */
export function riftWeather(seed: number, floor: number): Weather {
  return RIFT_WEATHERS[(Math.abs(seed) + floor) % RIFT_WEATHERS.length]
}

/**
 * 最深处等着的稀有伙伴
 * @author zjh
 * @date 2026-10-19
 */
export function riftRare(seed: number): 'starcat' | 'auroradeer' {
  return Math.abs(seed) % 2 === 0 ? 'auroradeer' : 'starcat'
}

/**
 * 从入口走到楼梯（或稀有伙伴）的每一步，含起点
 * @author zjh
 * @date 2026-10-19
 */
export function riftTrail(seed: number, floor: number): { x: number; y: number }[] {
  return carve(seed, floor).trail
}

/**
 * 生成某一层地图
 * @author zjh
 * @date 2026-10-19
 */
export function buildRiftFloor(seed: number, floor: number): MapDef {
  const safeFloor = Math.min(5, Math.max(1, floor))
  const carved = carve(seed, safeFloor)
  const goal = carved.trail[carved.trail.length - 1]
  const rare = riftRare(seed)
  const npcs: NpcDef[] = []
  const warps: MapDef['warps'] = [
    {
      x: 5,
      y: 7,
      targetMap: safeFloor === 1 ? 'observatory' : `rift${safeFloor - 1}`,
      targetX: safeFloor === 1 ? 5 : 5,
      targetY: safeFloor === 1 ? 3 : 6,
      label: safeFloor === 1 ? '观星台' : NAMES[safeFloor - 1],
    },
  ]
  if (safeFloor < 5) {
    carved.tiles[goal.y * WIDTH + goal.x] = 'warp'
    warps.push({
      x: goal.x,
      y: goal.y,
      targetMap: `rift${safeFloor + 1}`,
      targetX: 5,
      targetY: 6,
      label: NAMES[safeFloor + 1],
    })
  } else {
    npcs.push({
      id: `rift_${rare}`,
      name: SPECIES[rare].name,
      x: goal.x,
      y: goal.y,
      color: rare === 'starcat' ? 0xf0e090 : 0x9ae0c0,
      role: 'trainer',
      recruit: true,
      showIf: 'game_clear',
      hideIf: `pal_${rare}`,
      team: [{ speciesId: rare, level: 50 }],
      challengeLines: [`${SPECIES[rare].name}从星砂里抬起头。`, '再比一场。这一次，它愿意跟着你。'],
      lines: ['它已经跟着你了。'],
    })
  }
  return {
    id: `rift${safeFloor}`,
    name: NAMES[safeFloor],
    width: WIDTH,
    height: HEIGHT,
    tileSize: 16,
    tiles: carved.tiles,
    bgColor: [0, 0x1a1840, 0x241848, 0x182838, 0x282018, 0x101828][safeFloor],
    spawn: { x: 5, y: 6 },
    outdoor: false,
    indoor: true,
    warps,
    npcs,
  }
}

/**
 * 从南边入口向上挖一条能走通的路
 * @author zjh
 * @date 2026-10-19
 */
function carve(seed: number, floor: number): { tiles: TileKind[]; trail: { x: number; y: number }[] } {
  const tiles: TileKind[] = Array.from({ length: WIDTH * HEIGHT }, () => 'wall')
  const paint = (x: number, y: number, kind: TileKind) => {
    tiles[y * WIDTH + x] = kind
  }
  const rand = rng((Math.abs(seed) * 97 + floor * 13) >>> 0)
  const trail: { x: number; y: number }[] = [{ x: 5, y: 6 }]
  paint(5, 6, 'floor')
  paint(5, 7, 'warp')
  let x = 5
  let y = 6
  while (y > 1) {
    if (rand() < 0.55) {
      const dir = rand() < 0.5 ? -1 : 1
      const nx = x + dir
      if (nx >= 2 && nx <= 8) {
        x = nx
        paint(x, y, 'floor')
        trail.push({ x, y })
      }
    }
    y -= 1
    paint(x, y, 'floor')
    trail.push({ x, y })
  }
  return { tiles, trail }
}

/** 固定种子的随机数，同一颗种子每次结果一样 */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967296
  }
}
