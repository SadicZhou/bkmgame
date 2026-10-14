/**
 * 地图与碰撞格子数据（原创色块地图）
 * @author zjh
 * @date 2026-10-14
 */

export type TileKind =
  | 'grass'
  | 'path'
  | 'wall'
  | 'water'
  | 'floor'
  | 'tall'
  | 'door'
  | 'warp'

export interface WarpDef {
  x: number
  y: number
  targetMap: string
  targetX: number
  targetY: number
  label?: string
}

export interface NpcDef {
  id: string
  name: string
  x: number
  y: number
  color: number
  /** 对话行 */
  lines: string[]
  /** 固定对战（可选） */
  battleSpeciesId?: string
  battleLevel?: number
  defeatedKey?: string
}

export interface MapDef {
  id: string
  name: string
  width: number
  height: number
  tileSize: number
  /** 行优先：每格 TileKind */
  tiles: TileKind[]
  warps: WarpDef[]
  npcs: NpcDef[]
  spawn: { x: number; y: number }
  /** 高草遇敌概率（每步） */
  wildChance: number
  wildPool: { speciesId: string; minLv: number; maxLv: number }[]
  bgColor: number
}

const TS = 32

function fill(w: number, h: number, kind: TileKind): TileKind[] {
  return Array.from({ length: w * h }, () => kind)
}

function setRect(
  tiles: TileKind[],
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: TileKind,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      tiles[y * w + x] = kind
    }
  }
}

function borderWalls(tiles: TileKind[], w: number, h: number): void {
  for (let x = 0; x < w; x++) {
    tiles[x] = 'wall'
    tiles[(h - 1) * w + x] = 'wall'
  }
  for (let y = 0; y < h; y++) {
    tiles[y * w] = 'wall'
    tiles[y * w + (w - 1)] = 'wall'
  }
}

/**
 * 建造晨曦小镇
 * @author zjh
 * @date 2026-10-14
 */
function buildTown(): MapDef {
  const w = 16
  const h = 12
  const tiles = fill(w, h, 'path')
  borderWalls(tiles, w, h)
  setRect(tiles, w, 2, 2, 5, 4, 'grass')
  setRect(tiles, w, 10, 2, 13, 5, 'grass')
  setRect(tiles, w, 6, 7, 9, 9, 'grass')
  // 小屋入口
  tiles[3 * w + 3] = 'door'
  // 通往草地
  tiles[6 * w + 14] = 'warp'
  tiles[7 * w + 14] = 'warp'

  return {
    id: 'town',
    name: '晨曦小镇',
    width: w,
    height: h,
    tileSize: TS,
    tiles,
    bgColor: 0x8fd99a,
    spawn: { x: 8, y: 8 },
    wildChance: 0,
    wildPool: [],
    warps: [
      { x: 14, y: 6, targetMap: 'meadow', targetX: 1, targetY: 6, label: '青苔草地' },
      { x: 14, y: 7, targetMap: 'meadow', targetX: 1, targetY: 7, label: '青苔草地' },
      { x: 3, y: 3, targetMap: 'cabin', targetX: 4, targetY: 6, label: '旅人小屋' },
    ],
    npcs: [
      {
        id: 'elder',
        name: '旅长阿禾',
        x: 8,
        y: 4,
        color: 0xc49a6c,
        lines: [
          '欢迎来到晨曦小镇，焰迹旅人。',
          '东边草地有野生伙伴出没，记得先准备好队伍。',
          '按空格或点触对话；菜单可存档。祝旅途顺利！',
        ],
      },
      {
        id: 'kid',
        name: '小路',
        x: 11,
        y: 8,
        color: 0xf0a0c0,
        lines: [
          '我在草丛里看见一只翠叶狐！',
          '听说小屋里的阿姨能帮伙伴恢复精神。',
        ],
      },
    ],
  }
}

/**
 * 建造青苔草地
 * @author zjh
 * @date 2026-10-14
 */
function buildMeadow(): MapDef {
  const w = 18
  const h = 12
  const tiles = fill(w, h, 'grass')
  borderWalls(tiles, w, h)
  setRect(tiles, w, 1, 5, 3, 8, 'path')
  setRect(tiles, w, 4, 2, 14, 9, 'tall')
  setRect(tiles, w, 12, 1, 16, 3, 'water')
  tiles[6 * w + 1] = 'warp'
  tiles[7 * w + 1] = 'warp'
  // 小路中的安全步道
  for (let x = 4; x <= 10; x++) {
    tiles[6 * w + x] = 'path'
    tiles[7 * w + x] = 'path'
  }

  return {
    id: 'meadow',
    name: '青苔草地',
    width: w,
    height: h,
    tileSize: TS,
    tiles,
    bgColor: 0x6ecf7e,
    spawn: { x: 2, y: 6 },
    wildChance: 0.18,
    wildPool: [
      { speciesId: 'leafkit', minLv: 3, maxLv: 6 },
      { speciesId: 'rockmite', minLv: 3, maxLv: 5 },
      { speciesId: 'tideback', minLv: 4, maxLv: 6 },
    ],
    warps: [
      { x: 1, y: 6, targetMap: 'town', targetX: 13, targetY: 6, label: '晨曦小镇' },
      { x: 1, y: 7, targetMap: 'town', targetX: 13, targetY: 7, label: '晨曦小镇' },
    ],
    npcs: [
      {
        id: 'ranger',
        name: '巡护员苔',
        x: 9,
        y: 5,
        color: 0x5b8c5a,
        lines: [
          '高草里会突然遇敌，若想练级就大胆走进去。',
          '想休息的话，回镇上小屋找疗愈师。',
        ],
        battleSpeciesId: 'rockmite',
        battleLevel: 7,
        defeatedKey: 'ranger_beaten',
      },
    ],
  }
}

/**
 * 建造旅人小屋（室内）
 * @author zjh
 * @date 2026-10-14
 */
function buildCabin(): MapDef {
  const w = 10
  const h = 8
  const tiles = fill(w, h, 'floor')
  borderWalls(tiles, w, h)
  tiles[7 * w + 4] = 'warp'
  tiles[7 * w + 5] = 'warp'
  setRect(tiles, w, 2, 2, 3, 3, 'wall')

  return {
    id: 'cabin',
    name: '旅人小屋',
    width: w,
    height: h,
    tileSize: TS,
    tiles,
    bgColor: 0xd4a86a,
    spawn: { x: 4, y: 5 },
    wildChance: 0,
    wildPool: [],
    warps: [
      { x: 4, y: 7, targetMap: 'town', targetX: 3, targetY: 4, label: '晨曦小镇' },
      { x: 5, y: 7, targetMap: 'town', targetX: 3, targetY: 4, label: '晨曦小镇' },
    ],
    npcs: [
      {
        id: 'healer',
        name: '疗愈师岚',
        x: 5,
        y: 3,
        color: 0x9b7ed9,
        lines: [
          '把伙伴带来吧，我帮你恢复体力。',
          '（队伍已全部恢复！）',
          '外面的世界很大，记得常常存档。',
        ],
      },
    ],
  }
}

export const MAPS: Record<string, MapDef> = {
  town: buildTown(),
  meadow: buildMeadow(),
  cabin: buildCabin(),
}

export function isSolid(kind: TileKind): boolean {
  return kind === 'wall' || kind === 'water'
}

export function isTallGrass(kind: TileKind): boolean {
  return kind === 'tall'
}

export function tileAt(map: MapDef, x: number, y: number): TileKind | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null
  return map.tiles[y * map.width + x]
}
