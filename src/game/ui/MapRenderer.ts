/**
 * 地图渲染：把格子数组铺成图块。
 * - 墙按地图换造型：草地 / 小镇为树林，山道为山崖，小屋为木墙
 * - 草地、小路、树、巨石按坐标哈希挑变体，避免整齐重复
 * - 水面、高草、灰烬草、传送点播放动画；水面与陆地相邻的边叠加岸线
 * @author zjh
 * @date 2026-10-14
 */

import Phaser from 'phaser'
import { tileAt, type MapDef, type TileKind } from '../data/maps'
import { TILE_ANIMS, registerTileAnims, type TileAnimId } from '../graphics/tiles/AnimatedTiles'
import { GRASS_VARIANTS } from '../graphics/tiles/GroundTiles'

/** 各地图的墙体造型 */
const WALL_BY_MAP: Record<string, string[]> = {
  town: ['tile-tree-0', 'tile-tree-fruit', 'tile-tree-1', 'tile-tree-2'],
  meadow: ['tile-tree-0', 'tile-tree-1', 'tile-tree-2'],
  pass: ['tile-cliff-0', 'tile-cliff-1'],
  cabin: ['tile-woodwall-0'],
}

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
      const list = WALL_BY_MAP[map.id] ?? WALL_BY_MAP.meadow
      return list[h % list.length]
    }
    case 'rock':
      return `tile-boulder-${h % 2}`
    case 'floor':
      return 'tile-floor-0'
    case 'door':
      return 'tile-door-0'
    default:
      return 'tile-grass-0'
  }
}

/** 水面四周非水的边叠加岸线 */
function addShores(scene: Phaser.Scene, map: MapDef, x: number, y: number, cx: number, cy: number): void {
  const sides: [string, number, number][] = [
    ['n', 0, -1],
    ['s', 0, 1],
    ['w', -1, 0],
    ['e', 1, 0],
  ]
  for (const [side, dx, dy] of sides) {
    const n = tileAt(map, x + dx, y + dy)
    if (n && n !== 'water') scene.add.image(cx, cy, `tile-shore-${side}`).setDepth(0.5)
  }
}

/**
 * 铺设整张地图（深度 0；岸线 0.5）
 * @author zjh
 * @date 2026-10-14
 */
export function renderMap(scene: Phaser.Scene, map: MapDef): void {
  registerTileAnims(scene)
  const ts = map.tileSize
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const kind = map.tiles[y * map.width + x]
      const cx = x * ts + ts / 2
      const cy = y * ts + ts / 2
      const anim = ANIMATED[kind]
      if (anim) {
        const def = TILE_ANIMS[anim]
        scene.add.sprite(cx, cy, `${def.prefix}-0`).play({ key: `anim-${anim}`, startFrame: (x + y * 2) % def.frames })
        if (kind === 'water') addShores(scene, map, x, y, cx, cy)
      } else {
        scene.add.image(cx, cy, staticKey(map, kind, x, y))
      }
    }
  }
}
