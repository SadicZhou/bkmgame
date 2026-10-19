/**
 * 灰烬之塔：九层加塔顶。室内，不刷野生。谜题规则在 systems/Tower.ts
 * @author zjh
 * @date 2026-10-19
 */

import type { MapDef, NpcDef, TileKind } from './maps'
import { postgameNpcs } from './postgameNpcs'
import { TS, borderWalls, fill } from './mapKit'

const W = 11
const H = 8

/**
 * 空塔层：四周是墙，楼梯在北、回头的门在南
 * @author zjh
 * @date 2026-10-19
 */
function shell(paint?: (tiles: TileKind[]) => void): TileKind[] {
  const tiles = fill(W, H, 'path')
  borderWalls(tiles, W, H)
  tiles[1 * W + 5] = 'warp'
  tiles[6 * W + 5] = 'warp'
  paint?.(tiles)
  return tiles
}

function at(tiles: TileKind[], x: number, y: number, kind: TileKind): void {
  tiles[y * W + x] = kind
}

/**
 * 一层一张图。上楼旗标没到时，北楼梯会把人送回来
 * @author zjh
 * @date 2026-10-19
 */
function floor(opts: {
  id: string
  name: string
  bg: number
  upMap: string
  upFlag?: string
  downMap: string
  downX: number
  downY: number
  locked?: string
  npcs: NpcDef[]
  paint?: (tiles: TileKind[]) => void
}): MapDef {
  return {
    id: opts.id,
    name: opts.name,
    width: W,
    height: H,
    tileSize: TS,
    tiles: shell(opts.paint),
    bgColor: opts.bg,
    spawn: { x: 5, y: 5 },
    outdoor: false,
    indoor: true,
    warps: [
      {
        x: 5,
        y: 1,
        targetMap: opts.upMap,
        targetX: 5,
        targetY: 5,
        label: '往上',
        requireFlag: opts.upFlag,
        lockedLines: [opts.locked ?? '上面的门还关着。'],
      },
      { x: 5, y: 6, targetMap: opts.downMap, targetX: opts.downX, targetY: opts.downY, label: '往下' },
    ],
    npcs: opts.npcs,
  }
}

function ally(id: string, name: string, color: number, lines: string[]): NpcDef {
  return { id, name, x: 2, y: 5, color, lines }
}

function fire(): NpcDef {
  return {
    id: 'tower_fire',
    name: '篝火',
    role: 'healer',
    x: 8,
    y: 5,
    color: 0xffb050,
    lines: ['塔里每一层都留着一堆篝火。坐下来，灯还在。'],
  }
}

function guard(id: string, name: string, team: { speciesId: string; level: number }[], flag: string, lines: string[], extra?: Partial<NpcDef>): NpcDef {
  return {
    id,
    name,
    role: 'trainer',
    x: 5,
    y: 3,
    color: 0x3a3a48,
    defeatedKey: flag,
    hideIf: flag,
    challengeLines: lines,
    lines: ['……'],
    team,
    ...extra,
  }
}

/** 第 1 层：克制失效 */
export function buildTower1(): MapDef {
  return floor({
    id: 'tower1',
    name: '塔·一般',
    bg: 0xc8c0b0,
    upMap: 'tower2',
    upFlag: 'tower_floor_1',
    downMap: 'town',
    downX: 8,
    downY: 9,
    npcs: [
      ally('tower_ally_1', '小路', 0xf0d060, ['小路：（在塔门口挥手）旅人！我们的灯都在下面！']),
      fire(),
      guard('tower_guard_1', '熄灯会精英', [
        { speciesId: 'bushtail', level: 44 },
        { speciesId: 'nightcrow', level: 44 },
      ], 'tower_floor_1', ['这一层没有属性。你平时靠的克制，这里用不了。'], { neutral: true }),
    ],
  })
}

/** 第 2 层：地面发烫 */
export function buildTower2(): MapDef {
  return floor({
    id: 'tower2',
    name: '塔·焰',
    bg: 0xe09060,
    upMap: 'tower3',
    upFlag: 'tower_floor_2',
    downMap: 'tower1',
    downX: 5,
    downY: 4,
    npcs: [
      ally('tower_ally_2', '峰', 0xe07050, ['峰：地面是热的。每走十步就会烫一下。焰系打头就没事。']),
      fire(),
      guard('tower_guard_2', '熄灯会精英', [
        { speciesId: 'lanternlizard', level: 44 },
        { speciesId: 'wickling', level: 44 },
      ], 'tower_floor_2', ['两个人一起守。一个倒下，另一个还在。']),
    ],
  })
}

/** 第 3 层：拉开水闸才能过河。守关在水的北岸 */
export function buildTower3(): MapDef {
  const map = floor({
    id: 'tower3',
    name: '塔·潮',
    bg: 0x68b0d0,
    upMap: 'tower4',
    upFlag: 'tower_floor_3',
    downMap: 'tower2',
    downX: 5,
    downY: 4,
    npcs: [
      ally('tower_ally_3', '泉守汐', 0x3a8fb7, ['汐：水闸在左边。拉开，水才会退。澈让我把这句话带到。']),
      fire(),
      {
        id: 'tower_sluice',
        name: '水闸',
        story: 'tower_sluice',
        x: 1,
        y: 4,
        color: 0x8ec8e0,
        hideIf: 'tower_sluice',
        lines: ['一把旧闸。'],
      },
      guard('tower_guard_3', '熄灯会精英', [{ speciesId: 'wavefin', level: 45 }], 'tower_floor_3', ['水退了也没用。人还在。']),
    ],
    paint: (tiles) => {
      for (let x = 2; x <= 8; x++) at(tiles, x, 3, 'water')
    },
  })
  const guardNpc = map.npcs.find((n) => n.id === 'tower_guard_3')
  if (guardNpc) guardNpc.y = 2
  return map
}

/** 第 4 层：四音石，顺序 1 到 4 */
export function buildTower4(): MapDef {
  const notes: NpcDef[] = [2, 4, 6, 8].map((x, i) => ({
    id: `tower_note_${i + 1}`,
    name: `音石${i + 1}`,
    story: `tower_note_${i + 1}`,
    x,
    y: 4,
    color: 0x7ecf8a,
    lines: ['一块会响的石头。'],
  }))
  return floor({
    id: 'tower4',
    name: '塔·叶',
    bg: 0x6aaa58,
    upMap: 'tower5',
    upFlag: 'tower_floor_4',
    downMap: 'tower3',
    downX: 5,
    downY: 4,
    locked: '藤蔓还封着楼梯。先按顺序敲响四块音石，再打赢守关。',
    npcs: [
      ally('tower_ally_4', '苔', 0x4caf6a, ['苔：从左往右，第一、二、三、四。敲错就重来。']),
      fire(),
      ...notes,
      guard('tower_guard_4', '熄灯会精英', [{ speciesId: 'sylvanfox', level: 45 }], 'tower_f4', ['藤蔓听我的，不听石头的。']),
    ],
  })
}

/** 第 5 层：石头挡在楼梯口 */
export function buildTower5(): MapDef {
  return floor({
    id: 'tower5',
    name: '塔·岩',
    bg: 0xb09878,
    upMap: 'tower6',
    upFlag: 'tower_floor_5',
    downMap: 'tower4',
    downX: 5,
    downY: 4,
    locked: '石头还挡着，守关的人也还在。',
    npcs: [
      ally('tower_ally_5', '砧', 0xc08050, ['砧：那块石头，用手推。锤婆说你推得动。']),
      fire(),
      {
        id: 'tower_rock',
        name: '巨石',
        story: 'tower_rock',
        x: 5,
        y: 2,
        color: 0x8a8070,
        hideIf: 'tower_rock_moved',
        lines: ['一块挡住楼梯的石头。'],
      },
      guard('tower_guard_5', '熄灯会精英', [{ speciesId: 'cragdog', level: 46 }], 'tower_f5', ['石头我来守。']),
    ],
    paint: (tiles) => {
      at(tiles, 4, 2, 'wall')
      at(tiles, 6, 2, 'wall')
    },
  })
}

/** 第 6 层：躲开落雷格 */
export function buildTower6(): MapDef {
  return floor({
    id: 'tower6',
    name: '塔·雷',
    bg: 0xd0c060,
    upMap: 'tower7',
    upFlag: 'tower_floor_6',
    downMap: 'tower5',
    downX: 5,
    downY: 4,
    npcs: [
      ally('tower_ally_6', '穗', 0xf0d878, ['穗：雷只劈左右。走最中间那一列。']),
      fire(),
      guard('tower_guard_6', '熄灯会精英', [{ speciesId: 'voltbadger', level: 46 }], 'tower_floor_6', ['你躲过雷了。躲不过我。']),
    ],
  })
}

/** 第 7 层：冰面往北滑。守关站在冰面北侧的停靠点 */
export function buildTower7(): MapDef {
  const map = floor({
    id: 'tower7',
    name: '塔·霜',
    bg: 0xb8d8f0,
    upMap: 'tower8',
    upFlag: 'tower_floor_7',
    downMap: 'tower6',
    downX: 5,
    downY: 4,
    npcs: [
      ally('tower_ally_7', '望', 0xd0e8f8, ['望：从冰的南边往北滑，会停在楼梯前。朔让我把停靠的位置告诉你。']),
      fire(),
      guard('tower_guard_7', '熄灯会精英', [{ speciesId: 'icecrown', level: 47 }], 'tower_floor_7', ['冰停住了。人还没停。']),
    ],
    paint: (tiles) => {
      for (let x = 1; x <= 9; x++) at(tiles, x, 3, 'ice')
    },
  })
  const guardNpc = map.npcs.find((n) => n.id === 'tower_guard_7')
  if (guardNpc) guardNpc.y = 2
  return map
}

/** 第 8 层：往右被风送到平台。楼梯在平台上，不在正北 */
export function buildTower8(): MapDef {
  const map = floor({
    id: 'tower8',
    name: '塔·风',
    bg: 0x9fd0c0,
    upMap: 'tower9',
    upFlag: 'tower_floor_8',
    downMap: 'tower7',
    downX: 5,
    downY: 4,
    npcs: [
      ally('tower_ally_8', '鸢', 0x88c0d8, ['鸢：面具我摘了。站到左边，朝右走，风会把你托到平台上。']),
      fire(),
      guard('tower_guard_8', '熄灯会精英', [
        { speciesId: 'chimekite', level: 47 },
        { speciesId: 'skyfinch', level: 47 },
      ], 'tower_floor_8', ['风帮了你。我不会。']),
    ],
    paint: (tiles) => {
      for (let x = 2; x <= 6; x++) {
        at(tiles, x, 2, 'wall')
        at(tiles, x, 4, 'wall')
      }
    },
  })
  map.tiles[1 * W + 5] = 'path'
  map.tiles[2 * W + 7] = 'warp'
  const up = map.warps[0]
  if (up) {
    up.x = 7
    up.y = 2
  }
  const guardNpc = map.npcs.find((n) => n.id === 'tower_guard_8')
  if (guardNpc) {
    guardNpc.x = 8
    guardNpc.y = 3
  }
  return map
}

/** 第 9 层：绯守在楼梯下 */
export function buildTower9(): MapDef {
  return floor({
    id: 'tower9',
    name: '塔·灵',
    bg: 0xc0b0d8,
    upMap: 'towertop',
    upFlag: 'tower_floor_9',
    downMap: 'tower8',
    downX: 5,
    downY: 4,
    locked: '绯还站在那儿。先听她把话说完。',
    npcs: [
      {
        id: 'tower_fei',
        name: '执灯·绯',
        story: 'tower_fei',
        x: 2,
        y: 3,
        color: 0xe07050,
        lines: ['上面就是灯台。'],
      },
      fire(),
    ],
  })
}

/** 塔顶：墨尘，然后是曦焰凤 */
export function buildTowerTop(): MapDef {
  return {
    id: 'towertop',
    name: '灵之灯台',
    width: W,
    height: H,
    tileSize: TS,
    tiles: shell((tiles) => {
      tiles[1 * W + 5] = 'path'
    }),
    bgColor: 0x2a2840,
    spawn: { x: 5, y: 5 },
    outdoor: false,
    indoor: true,
    warps: [{ x: 5, y: 6, targetMap: 'tower9', targetX: 5, targetY: 4, label: '往下' }],
    npcs: [
      {
        id: 'tower_mochen',
        name: '墨尘',
        role: 'trainer',
        x: 5,
        y: 3,
        color: 0x2a2a38,
        showIf: 'tower_floor_9',
        hideIf: 'mochen_beaten',
        defeatedKey: 'mochen_beaten',
        surrender: true,
        challengeLines: [
          '墨尘：十年前，这里是山腰。灯灯就是在这里熄灭的。',
          '墨尘：我建了这座塔，想把所有的心火都封进来。',
          '墨尘：可是这一路，你点亮了八座灯。每点亮一座，我就听见一次——有人在笑。',
          '阿禾：尘。',
          '墨尘：师父，别说话。让我和旅人打完这一场。',
        ],
        winLines: ['墨尘放下了手。夜幕鸦肩上，有一团很小的暖光。'],
        lines: ['……'],
        team: [
          { speciesId: 'inkcrow', level: 48 },
          { speciesId: 'lanternlizard', level: 48 },
          { speciesId: 'icecrown', level: 48 },
          { speciesId: 'cragdog', level: 49 },
          { speciesId: 'chimekite', level: 49 },
          { speciesId: 'nightcrow', level: 50 },
        ],
      },
      {
        id: 'tower_phoenix',
        name: '曦焰凤',
        role: 'boss',
        x: 5,
        y: 2,
        color: 0xfff0c0,
        showIf: 'mochen_beaten',
        hideIf: 'phoenix_trial',
        defeatedKey: 'phoenix_trial',
        ordeal: true,
        challengeLines: [
          '灯台自己亮了一下。',
          '曦焰凤：十年前，我看见一团很小的光，为了一个男孩冲进火里。',
          '曦焰凤：它熄灭之前，把最后一点心火交给了一只路过的小乌鸦。',
          '曦焰凤：孩子，它从来没有消失。',
          '曦焰凤：坚持下去。这不是要分出胜负的一战。',
        ],
        lines: ['……'],
        team: [{ speciesId: 'dawnphoenix', level: 52 }],
      },
      ...postgameNpcs('towertop'),
    ],
  }
}
