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
  | 'rock'
  | 'ash'

export interface WarpDef {
  x: number
  y: number
  targetMap: string
  targetX: number
  targetY: number
  label?: string
  /** 需要某旗标才能通行 */
  requireFlag?: string
  /** 未满足条件时的提示 */
  lockedLines?: string[]
}

/**
 * talk 对话 · healer 回血 · clinic 小屋综合服务（回血/鉴定/休息）· shop 商店 · trainer/boss 对战
 * board 旅人告示板 · granny 记忆婆婆（遗忘/回忆技能）· storage 伙伴寄存所
 */
export type NpcRole = 'talk' | 'healer' | 'clinic' | 'shop' | 'trainer' | 'boss' | 'board' | 'granny' | 'storage'

export interface TeamMember {
  speciesId: string
  level: number
}

export interface NpcDef {
  id: string
  name: string
  x: number
  y: number
  color: number
  role?: NpcRole
  /** 默认对话行 */
  lines: string[]
  /** 按剧情进度覆盖台词：从上到下取第一个已达成旗标 */
  progressLines?: { flag: string; lines: string[] }[]
  /** 训练家/BOSS 的队伍 */
  team?: TeamMember[]
  /** 击败后写入的旗标 */
  defeatedKey?: string
  /** 战前台词 */
  challengeLines?: string[]
  /** 被击败后的台词 */
  afterLines?: string[]
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
  /** 户外地图：有天气、计入异象判定步数（遭遇表见 encounters.ts） */
  outdoor: boolean
  /** 室内地图：不显示夜晚滤镜 */
  indoor?: boolean
  bgColor: number
  /** 覆盖默认 path 地砖贴图（如山路） */
  pathTexture?: string
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

/** ASCII 图例 */
const LEGEND: Record<string, TileKind> = {
  '#': 'wall',
  R: 'rock',
  '.': 'path',
  ',': 'grass',
  '"': 'tall',
  '^': 'ash',
  '~': 'water',
  W: 'warp',
  D: 'door',
  _: 'floor',
}

/**
 * 把等宽 ASCII 行解析为格子数组；行宽不足按墙补齐
 * @author zjh
 * @date 2026-10-14
 */
function parseAscii(rows: string[]): { width: number; height: number; tiles: TileKind[] } {
  const width = Math.max(...rows.map((r) => r.length))
  const tiles: TileKind[] = []
  for (const row of rows) {
    for (let x = 0; x < width; x++) tiles.push(LEGEND[row[x] ?? '#'] ?? 'wall')
  }
  return { width, height: rows.length, tiles }
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
    outdoor: false,
    warps: [
      { x: 14, y: 6, targetMap: 'meadow', targetX: 2, targetY: 6, label: '青苔草地' },
      { x: 14, y: 7, targetMap: 'meadow', targetX: 2, targetY: 7, label: '青苔草地' },
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
          '余烬山巅的火种最近忽明忽暗，守护它的熔鬃狮变得焦躁不安。',
          '先去东边的青苔草地，赢过巡护员苔，他会放你进山道。',
          '高草里的野生伙伴可以用「安抚果」带回队伍，对方体力越低越容易成功。',
        ],
        progressLines: [
          {
            flag: 'boss_beaten',
            lines: [
              '火种又恢复了温暖的光，谢谢你，焰迹旅人！',
              '不过……最近各地的心火波动得厉害，总有人说看见了奇怪的「异象」。',
              '流星、花海、地火……据说每种异象都会唤来一只独一无二的伙伴。',
              '去东边的旅人告示板看看传闻吧。',
            ],
          },
          {
            flag: 'ranger_beaten',
            lines: [
              '你赢过苔了？了不起！',
              '余烬山道就在草地东边。熔鬃狮是焰属性，潮属性的伙伴会是好帮手。',
              '山道半途有温泉守望者，可以在那里歇脚。',
            ],
          },
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
          '听说伙伴到 9 级左右会进化，样子会变得超帅！',
        ],
      },
      {
        id: 'shop',
        name: '杂货商麦',
        role: 'shop',
        x: 5,
        y: 7,
        color: 0xe8c060,
        lines: ['欢迎光临！伤药、万灵药、PP 果、安抚果，应有尽有～'],
      },
      {
        id: 'board',
        name: '旅人告示板',
        role: 'board',
        x: 12,
        y: 5,
        color: 0xb08050,
        lines: ['告示板上贴满了天气预报和各地的传闻。'],
      },
      {
        id: 'granny',
        name: '记忆婆婆',
        role: 'granny',
        x: 3,
        y: 7,
        color: 0xb8a0d8,
        lines: ['孩子，伙伴们记性好着呢，忘掉的招式也能想起来。', '要我帮忙吗？'],
      },
      {
        id: 'storage',
        name: '寄存员纳',
        role: 'storage',
        x: 10,
        y: 9,
        color: 0x80c0a0,
        lines: ['这里是伙伴寄存所！队伍放不下的伙伴，我来好好照顾。'],
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
  // 横穿草地的安全步道，尽头通往余烬山道
  for (let x = 4; x <= 15; x++) {
    tiles[6 * w + x] = 'path'
    tiles[7 * w + x] = 'path'
  }
  tiles[6 * w + 16] = 'warp'
  tiles[7 * w + 16] = 'warp'

  const passLock = {
    requireFlag: 'ranger_beaten',
    lockedLines: ['前方是余烬山道，山路险峻。', '（巡护员苔守在这一带——先向他证明你的实力吧。）'],
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
    outdoor: true,
    warps: [
      { x: 1, y: 6, targetMap: 'town', targetX: 13, targetY: 6, label: '晨曦小镇' },
      { x: 1, y: 7, targetMap: 'town', targetX: 13, targetY: 7, label: '晨曦小镇' },
      { x: 16, y: 6, targetMap: 'pass', targetX: 2, targetY: 18, label: '余烬山道', ...passLock },
      { x: 16, y: 7, targetMap: 'pass', targetX: 2, targetY: 18, label: '余烬山道', ...passLock },
    ],
    npcs: [
      {
        id: 'ranger',
        name: '巡护员苔',
        role: 'trainer',
        x: 9,
        y: 5,
        color: 0x5b8c5a,
        lines: [],
        team: [
          { speciesId: 'leafkit', level: 5 },
          { speciesId: 'rockmite', level: 5 },
        ],
        defeatedKey: 'ranger_beaten',
        challengeLines: [
          '想进余烬山道？先过我这一关！',
          '提醒你一句：我的岩甲虫可不怕火，潮属性和叶属性的招式才是它的克星。',
          '……战斗开始！',
        ],
        afterLines: ['你和伙伴配合得真好。', '山道入口就在草地东边，路上小心。'],
      },
    ],
  }
}

/**
 * 建造余烬山道（第三区域，终点为 BOSS）
 * @author zjh
 * @date 2026-10-14
 */
function buildPass(): MapDef {
  const { width, height, tiles } = parseAscii([
    '##############',
    '#RRR......RRR#',
    '#RR........RR#',
    '#R..^^..^^..R#',
    '#R.^^^..^^^.R#',
    '#RR..R..R..RR#',
    '#~~..^^^^..RR#',
    '#~~..^^^^...R#',
    '#RR........RR#',
    '#R^^^RR..^^^R#',
    '#R^^^RR..^^^R#',
    '#R.......R..R#',
    '#RR..^^^^...R#',
    '#~~..^^^^..RR#',
    '#~~.......^^R#',
    '#R..RR....^^R#',
    '#R^^RR..R...R#',
    '#R^^....RR..R#',
    '#W.........RR#',
    '##############',
  ])

  return {
    id: 'pass',
    name: '余烬山道',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0x6b4a3a,
    pathTexture: 'tile-mountain-path',
    spawn: { x: 2, y: 18 },
    outdoor: true,
    warps: [{ x: 1, y: 18, targetMap: 'meadow', targetX: 15, targetY: 6, label: '青苔草地' }],
    npcs: [
      {
        id: 'hiker',
        name: '登山客峰',
        role: 'trainer',
        x: 8,
        y: 11,
        color: 0x8a6a4a,
        lines: [],
        team: [
          { speciesId: 'mistnewt', level: 9 },
          { speciesId: 'rockmite', level: 9 },
        ],
        defeatedKey: 'hiker_beaten',
        challengeLines: ['山道上的风可不温柔！让我看看你的本事！', '……战斗开始！'],
        afterLines: [
          '山顶的熔鬃狮很强，先去温泉那里休整一下吧。',
          '对了，它浑身是火——潮系和岩系的伙伴能克制它，叶系和焰系就别硬碰了。',
          '这条山道的雾泉螈、草地上的岩甲虫和碧波龟都很适合带上去。',
        ],
      },
      {
        id: 'spring',
        name: '泉守汐',
        role: 'healer',
        x: 3,
        y: 8,
        color: 0x7ec8c0,
        lines: [
          '温泉的热气能让伙伴们恢复元气。',
          '（队伍已全部恢复！）',
          '山顶就在北边。守护兽的火焰很烈，带上潮系或岩系的伙伴会安心很多。祝你好运。',
        ],
      },
      {
        id: 'boss',
        name: '焰心守护·烬',
        role: 'boss',
        x: 7,
        y: 1,
        color: 0xff7050,
        lines: [],
        team: [
          { speciesId: 'cindermoth', level: 11 },
          { speciesId: 'magmane', level: 13 },
        ],
        defeatedKey: 'boss_beaten',
        challengeLines: [
          '……旅人，你也是来夺走火种的吗？',
          '熔鬃狮在咆哮，火种的光芒已经乱了。',
          '若你真心守护它——就用你与伙伴的羁绊证明吧！',
          '……战斗开始！',
        ],
        afterLines: ['火种重新安静下来了。', '谢谢你，焰迹旅人。这条山道永远欢迎你。'],
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
    outdoor: false,
    indoor: true,
    warps: [
      { x: 4, y: 7, targetMap: 'town', targetX: 3, targetY: 4, label: '晨曦小镇' },
      { x: 5, y: 7, targetMap: 'town', targetX: 3, targetY: 4, label: '晨曦小镇' },
    ],
    npcs: [
      {
        id: 'healer',
        name: '疗愈师岚',
        role: 'clinic',
        x: 5,
        y: 3,
        color: 0x9b7ed9,
        lines: ['欢迎回来，旅人。要做点什么？'],
      },
    ],
  }
}

export const MAPS: Record<string, MapDef> = {
  town: buildTown(),
  meadow: buildMeadow(),
  pass: buildPass(),
  cabin: buildCabin(),
}

/**
 * 地图上可放置事件物件的空地：可通行、非传送/门、无 NPC
 * @author zjh
 * @date 2026-10-14
 */
export function openTiles(map: MapDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const k = map.tiles[y * map.width + x]
      if (isSolid(k) || k === 'warp' || k === 'door') continue
      if (map.npcs.some((n) => n.x === x && n.y === y)) continue
      if (map.warps.some((w) => w.x === x && w.y === y)) continue
      out.push({ x, y })
    }
  }
  return out
}

export function isSolid(kind: TileKind): boolean {
  return kind === 'wall' || kind === 'water' || kind === 'rock'
}

/** 是否为遇敌草丛（草地高草 / 山道灰烬草） */
export function isTallGrass(kind: TileKind): boolean {
  return kind === 'tall' || kind === 'ash'
}

export function tileAt(map: MapDef, x: number, y: number): TileKind | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null
  return map.tiles[y * map.width + x]
}

/**
 * 根据剧情旗标选出 NPC 当前台词
 * @author zjh
 * @date 2026-10-14
 */
export function npcLines(npc: NpcDef, hasFlag: (k: string) => boolean): string[] {
  const hit = npc.progressLines?.find((p) => hasFlag(p.flag))
  return hit ? hit.lines : npc.lines
}
