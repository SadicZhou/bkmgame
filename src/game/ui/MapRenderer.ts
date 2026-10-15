/**
 * 地图渲染：把格子数组铺成图块。
 * - 墙按地图换造型：草地 / 小镇 / 湖畔 / 回音林为树林（草地上叠大树冠，相邻树冠重叠），山道为山崖，小屋为木墙
 * - 草地、小路、树、巨石按坐标哈希挑变体，避免整齐重复
 * - 水面、高草、灰烬草、传送点播放动画；水面与陆地相邻的边叠加岸线；小路与草地相接处叠加圆润草边
 * @author zjh
 * @date 2026-10-15
 */

import Phaser from 'phaser'
import { resolveTile, type HasFlag, type MapDef, type TileKind } from '../data/maps'
import { TILE_ANIMS, registerTileAnims, type TileAnimId } from '../graphics/tiles/AnimatedTiles'
import { GRASS_VARIANTS } from '../graphics/tiles/GroundTiles'
import { TREE_FOOT } from '../graphics/tiles/TerrainTiles'

/** 以树林为墙的地图：墙格先铺草，再叠一棵比格子大的树（相邻树冠重叠成林） */
const TREE_WALLS: Record<string, string[]> = {
  town: ['tree-crown-0', 'tree-crown-fruit', 'tree-crown-1', 'tree-crown-2'],
  meadow: ['tree-crown-0', 'tree-crown-1', 'tree-crown-2'],
  lake: ['tree-crown-1', 'tree-crown-2', 'tree-crown-0'],
  forest: ['tree-crown-2', 'tree-crown-1', 'tree-crown-2', 'tree-crown-0'],
}

/** 其余地图的墙体造型（整格贴图） */
const SOLID_WALLS: Record<string, string[]> = {
  pass: ['tile-cliff-0', 'tile-cliff-1'],
  cabin: ['tile-woodwall-0'],
}

/** 树冠深度：在地面装饰（0.6）之上、立式装饰（5）之下；越靠下的树越靠前 */
const TREE_DEPTH = 0.7

/** 会给相邻小路画草边的格子 */
const GRASSY = new Set<TileKind>(['grass', 'tall'])

/** 会被草边包住的格子 */
const PATHY = new Set<TileKind>(['path', 'warp'])

/** 木板通道：底下先铺一层水面动画 */
const PLANKS: Partial<Record<TileKind, string>> = { dock: 'tile-dock-0', bridge: 'tile-bridge-0' }

/** 岸线判定时视为水域的格子（木板下面也是水） */
const WATERY = new Set<TileKind>(['water', 'dock', 'bridge'])

/** 有动画的图块类型 */
const ANIMATED: Partial<Record<TileKind, TileAnimId>> = { water: 'water', tall: 'tall', ash: 'ash', warp: 'warp' }

/** 坐标哈希（同一位置每次结果相同） */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * 静态图块的贴图 key
 * @author zjh
 * @date 2026-10-14
 */
function staticKey(map: MapDef, kind: TileKind, x: number, y: number): string {
  const h = hash(x, y)
  switch (kind) {
    case 'grass':
      return h % 9 === 0 ? `tile-grass-flower-${h % 2}` : `tile-grass-${h % GRASS_VARIANTS}`
    case 'path':
      return `${map.pathTexture ?? 'tile-path'}-${h % 2}`
    case 'wall': {
      const list = SOLID_WALLS[map.id]
      return list ? list[h % list.length] : `tile-grass-${h % GRASS_VARIANTS}`
    }
    case 'rock':
      return `tile-boulder-${h % 2}`
    case 'floor':
      return 'tile-floor-0'
    case 'door':
      return 'tile-door-0'
    case 'ice':
      return `tile-ice-${h % 2}`
    default:
      return 'tile-grass-0'
  }
}

/** 水面四周非水的边叠加岸线 */
function addShores(scene: Phaser.Scene, map: MapDef, x: number, y: number, cx: number, cy: number, hasFlag: HasFlag): void {
  const sides: [string, number, number][] = [
    ['n', 0, -1],
    ['s', 0, 1],
    ['w', -1, 0],
    ['e', 1, 0],
  ]
  for (const [side, dx, dy] of sides) {
    const n = resolveTile(map, x + dx, y + dy, hasFlag)
    if (n && !WATERY.has(n)) scene.add.image(cx, cy, `tile-shore-${side}`).setDepth(0.5)
  }
}

/** 该格在这张地图上是否算「草」（树林墙底下也是草） */
function grassyAt(map: MapDef, x: number, y: number, hasFlag: HasFlag): boolean {
  const k = resolveTile(map, x, y, hasFlag)
  if (!k) return false
  return GRASSY.has(k) || (k === 'wall' && !SOLID_WALLS[map.id])
}

/**
 * 小路与草地相接处叠加草边：四边 + 外角削圆 + 内角补圆
 * @author zjh
 * @date 2026-10-15
 */
function addPathEdges(scene: Phaser.Scene, map: MapDef, x: number, y: number, cx: number, cy: number, hasFlag: HasFlag): void {
  const g = (dx: number, dy: number) => grassyAt(map, x + dx, y + dy, hasFlag)
  const n = g(0, -1)
  const s = g(0, 1)
  const w = g(-1, 0)
  const e = g(1, 0)
  const keys: string[] = []
  if (n) keys.push('n')
  if (s) keys.push('s')
  if (w) keys.push('w')
  if (e) keys.push('e')
  const corners: [string, boolean, boolean, number, number][] = [
    ['nw', n, w, -1, -1],
    ['ne', n, e, 1, -1],
    ['sw', s, w, -1, 1],
    ['se', s, e, 1, 1],
  ]
  for (const [c, a, b, dx, dy] of corners) {
    if (a && b) keys.push(c)
    else if (!a && !b && g(dx, dy)) keys.push(`i${c}`)
  }
  for (const k of keys) scene.add.image(cx, cy, `tile-pedge-${k}`).setDepth(0.5)
}

/** 树林墙：底下铺草，树以底边中点对齐格子底部，按行排深度 */
function addTree(scene: Phaser.Scene, map: MapDef, x: number, y: number, cx: number, cy: number): void {
  const list = TREE_WALLS[map.id] ?? TREE_WALLS.meadow
  const h = hash(x, y)
  scene.add.image(cx, cy, `tile-grass-${h % GRASS_VARIANTS}`)
  const ts = map.tileSize
  scene.add
    .image(cx, (y + 1) * ts + TREE_FOOT, list[h % list.length])
    .setOrigin(0.5, 1)
    .setDepth(TREE_DEPTH + y * 0.001)
}

/** 一格动画图块（水面 / 高草 / 灰烬草 / 传送点） */
function addAnimated(scene: Phaser.Scene, anim: TileAnimId, x: number, y: number, cx: number, cy: number): void {
  const def = TILE_ANIMS[anim]
  scene.add.sprite(cx, cy, `${def.prefix}-0`).play({ key: `anim-${anim}`, startFrame: (x + y * 2) % def.frames })
}

/**
 * 铺设整张地图（深度 0；岸线 0.5；木板 0.55）。格子按剧情状态解析（浮桥开放前画成水面）
 * @author zjh
 * @date 2026-10-14
 */
export function renderMap(scene: Phaser.Scene, map: MapDef, hasFlag: HasFlag): void {
  registerTileAnims(scene)
  const ts = map.tileSize
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const kind = resolveTile(map, x, y, hasFlag) as TileKind
      const cx = x * ts + ts / 2
      const cy = y * ts + ts / 2
      const anim = kind === 'tall' && hash(x, y) % 2 ? 'tallB' : ANIMATED[kind]
      const plank = PLANKS[kind]
      if (plank) {
        addAnimated(scene, 'water', x, y, cx, cy)
        scene.add.image(cx, cy, plank).setDepth(0.55)
      } else if (kind === 'wall' && !SOLID_WALLS[map.id]) {
        addTree(scene, map, x, y, cx, cy)
      } else if (anim) {
        addAnimated(scene, anim, x, y, cx, cy)
        if (kind === 'water') addShores(scene, map, x, y, cx, cy, hasFlag)
      } else {
        scene.add.image(cx, cy, staticKey(map, kind, x, y))
      }
      if (PATHY.has(kind)) addPathEdges(scene, map, x, y, cx, cy, hasFlag)
    }
  }
}
