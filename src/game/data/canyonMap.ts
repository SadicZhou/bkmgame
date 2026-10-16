/**
 * 第四章地图：锤音镇、千岩峡谷（三段推石）、旧矿道（矿车道岔）
 * 剧情见 docs/story/04-第四章-磐谷.md，推石规则见 systems/Boulders.ts
 * @author zjh
 * @date 2026-10-16
 */

import { TS, parseAscii } from './mapKit'
import type { MapDef, NpcDef } from './maps'

export const CANYON_FLAGS = {
  unlocked: 'canyon_unlocked',
  metGranny: 'canyon_met_granny',
  gloves: 'canyon_gloves',
  deep: 'canyon_deep',
  cartFixed: 'canyon_cart_fixed',
  anvil: 'anvil_beaten',
  rhino: 'rhino_beaten',
  fossilDone: 'canyon_fossil_done',
  chest: 'canyon_cart_chest',
  side: 'canyon_cart_side',
} as const

export const fossilFlag = (id: string) => `canyon_fossil_${id}`
export const switchFlag = (i: number) => `cart_sw${i}`
export const oreFlag = (id: string) => `canyon_ore_${id}`

/** 峡谷里能捡的矿石，凑满 5 块交给锤铺学徒 */
export const ORES = [
  { id: '1', x: 5, y: 12 },
  { id: '2', x: 14, y: 12 },
  { id: '3', x: 6, y: 8 },
  { id: '4', x: 16, y: 8 },
  { id: '5', x: 7, y: 4 },
] as const

/** 巨石：推到 hole 上会沉下去，裂缝变为可走 */
export interface BoulderDef {
  id: string
  zone: 1 | 2 | 3
  x: number
  y: number
  hole?: { x: number; y: number }
}

/**
 * 与 buildCanyon 的墙对齐：
 * 区 1 把 (10,12) 的石头向北推进 (10,10) 的裂缝；
 * 区 2 把两块石头推上 (8,7)(12,7)，石门 (10,6) 打开；
 * 区 3 把三块石头推进 (9,2)(10,2)(11,2)，通往矿道。
 */
export const BOULDERS: BoulderDef[] = [
  { id: 'z1', zone: 1, x: 10, y: 12, hole: { x: 10, y: 10 } },
  { id: 'z2a', zone: 2, x: 8, y: 8 },
  { id: 'z2b', zone: 2, x: 12, y: 8 },
  { id: 'z3a', zone: 3, x: 9, y: 4, hole: { x: 9, y: 2 } },
  { id: 'z3b', zone: 3, x: 10, y: 4, hole: { x: 10, y: 2 } },
  { id: 'z3c', zone: 3, x: 11, y: 4, hole: { x: 11, y: 2 } },
]

/** 区 2 的踏板 */
export const PLATES = [
  { x: 8, y: 7 },
  { x: 12, y: 7 },
]

/** 石门（墙上的一格，两块踏板都压住才打开） */
export const GATE = { x: 10, y: 6 }

export const FOSSILS = [
  { id: 'a', x: 4, y: 12 },
  { id: 'b', x: 4, y: 8 },
  { id: 'c', x: 17, y: 4 },
] as const

/** 矿车三个道岔的正确路线 */
export const CART_DEEP = 'LRL'

function fossilProps(): NpcDef[] {
  return FOSSILS.map((f) => ({
    id: `fossil_${f.id}`,
    name: '化石',
    role: 'prop' as const,
    story: `fossil_${f.id}`,
    x: f.x,
    y: f.y,
    color: 0xc4a060,
    hideIf: fossilFlag(f.id),
    lines: [],
  }))
}

function oreProps(): NpcDef[] {
  return ORES.map((o) => ({
    id: `ore_${o.id}`,
    name: '矿石',
    role: 'prop' as const,
    story: `ore_${o.id}`,
    x: o.x,
    y: o.y,
    color: 0x8a7060,
    hideIf: oreFlag(o.id),
    lines: [],
  }))
}

/**
 * 锤音镇：镇长、向导峰、锤铺与旅店
 * @author zjh
 * @date 2026-10-16
 */
export function buildHammerTown(): MapDef {
  const { width, height, tiles } = parseAscii([
    '##############',
    '#____#########',
    '#____#########',
    '#____#########',
    '#____________#',
    '#____________#',
    '#_____WW_____#',
    '##############',
  ])
  return {
    id: 'hammer',
    name: '锤音镇',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xc4a46a,
    spawn: { x: 6, y: 5 },
    outdoor: false,
    warps: [
      { x: 6, y: 6, targetMap: 'canyon', targetX: 15, targetY: 13, label: '千岩峡谷' },
      { x: 7, y: 6, targetMap: 'canyon', targetX: 15, targetY: 13, label: '千岩峡谷' },
    ],
    npcs: [
      {
        id: 'hammer_granny',
        name: '锤婆',
        story: 'hammer_granny',
        x: 3,
        y: 4,
        color: 0xc08060,
        lines: [],
      },
      {
        id: 'canyon_peak',
        name: '登山客峰',
        story: 'canyon_peak',
        x: 11,
        y: 4,
        color: 0x8a6a4a,
        lines: [],
      },
      {
        id: 'hammer_apprentice',
        name: '锤铺学徒',
        story: 'hammer_apprentice',
        x: 2,
        y: 3,
        color: 0xe0b070,
        lines: [],
      },
      {
        id: 'hammer_shop',
        name: '锤铺老板',
        role: 'shop',
        x: 3,
        y: 2,
        color: 0xd0a060,
        lines: ['锤子暂时别敲。', '伤药和复苏草倒是管够。'],
      },
      {
        id: 'hammer_inn',
        name: '旅店老板',
        role: 'healer',
        x: 8,
        y: 4,
        color: 0xf0d0a0,
        lines: ['山在抖，觉不好睡。', '要休息的话，我帮你的伙伴回复。'],
      },
    ],
  }
}

/**
 * 千岩峡谷：由南向北依次是裂缝、踏板石门、三石桥，尽头是旧矿道
 * @author zjh
 * @date 2026-10-16
 */
export function buildCanyon(): MapDef {
  const { width, height, tiles } = parseAscii([
    '######################',
    '###########W##########',
    '######################',
    '##..................##',
    '##..................##',
    '##..................##',
    '######################',
    '##..................##',
    '##..................##',
    '##..................##',
    '######################',
    '##..................##',
    '##..................##',
    '##..""""......""""..##',
    '######W########W###W##',
    '######################',
  ])
  return {
    id: 'canyon',
    name: '千岩峡谷',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0xb09070,
    spawn: { x: 6, y: 13 },
    outdoor: true,
    warps: [
      { x: 6, y: 14, targetMap: 'forest', targetX: 26, targetY: 6, label: '回音林' },
      { x: 15, y: 14, targetMap: 'hammer', targetX: 6, targetY: 5, label: '锤音镇' },
      {
        x: 19,
        y: 14,
        targetMap: 'dunes',
        targetX: 8,
        targetY: 7,
        label: '星砂荒原',
        requireFlag: 'dunes_unlocked',
        lockedLines: ['南边的沙丘还被雷云盖着。', '岩灯台亮了以后，这条路才会开。'],
      },
      { x: 10, y: 1, targetMap: 'mine', targetX: 8, targetY: 9, label: '旧矿道' },
    ],
    npcs: [
      {
        id: 'canyon_reset',
        name: '木牌',
        role: 'sign',
        story: 'boulder_reset',
        x: 3,
        y: 13,
        color: 0x8a6a4a,
        lines: [],
      },
      {
        id: 'canyon_carving',
        name: '石壁刻字',
        role: 'sign',
        x: 16,
        y: 4,
        color: 0x9a8a70,
        lines: ['（旧矿工刻在石壁上的字。）', '「心火不会伤人，伤人的是不听山的声音。」'],
      },
      ...fossilProps(),
      ...oreProps(),
    ],
  }
}

/**
 * 旧矿道：三个道岔，LRL 通往深处
 * @author zjh
 * @date 2026-10-16
 */
export function buildMine(): MapDef {
  const { width, height, tiles } = parseAscii([
    '##################',
    '####.##########.##',
    '####.##########.##',
    '####.##########.##',
    '##...........#####',
    '##...........#####',
    '##...........#####',
    '##...........#####',
    '##...........#####',
    '##...........#####',
    '########W#########',
    '##################',
  ])
  return {
    id: 'mine',
    name: '旧矿道',
    width,
    height,
    tileSize: TS,
    tiles,
    bgColor: 0x6a5a4a,
    spawn: { x: 8, y: 9 },
    outdoor: false,
    indoor: true,
    warps: [{ x: 8, y: 10, targetMap: 'canyon', targetX: 10, targetY: 3, label: '千岩峡谷' }],
    npcs: [
      {
        id: 'canyon_miner',
        name: '旧矿工阿岩',
        story: 'canyon_miner',
        x: 4,
        y: 8,
        color: 0xa09070,
        lines: [],
      },
      ...[1, 2, 3].map((i) => ({
        id: `cart_sw${i}`,
        name: `道岔 ${i}`,
        role: 'prop' as const,
        story: `cart_sw${i}`,
        x: 2 + (i - 1) * 2,
        y: 5,
        color: 0xd0b060,
        lines: [] as string[],
      })),
      {
        id: 'mine_cart',
        name: '矿车',
        role: 'prop',
        story: 'mine_cart',
        x: 3,
        y: 7,
        color: 0x8a7060,
        lines: [],
      },
      {
        id: 'mine_badge',
        name: '旧徽章',
        role: 'prop',
        story: 'mine_badge',
        x: 14,
        y: 3,
        color: 0xe0c070,
        showIf: CANYON_FLAGS.deep,
        hideIf: 'got_dust_badge',
        lines: [],
      },
      {
        id: 'canyon_anvil',
        name: '掘手·砧',
        role: 'trainer',
        x: 15,
        y: 2,
        color: 0xc06040,
        showIf: CANYON_FLAGS.deep,
        hideIf: CANYON_FLAGS.anvil,
        lines: [],
        team: [
          { speciesId: 'cragdog', level: 26 },
          { speciesId: 'bouldermite', level: 27 },
          { speciesId: 'drillmole', level: 28 },
        ],
        defeatedKey: CANYON_FLAGS.anvil,
        challengeLines: [
          '别过来！再往前走一步，这里就会塌！',
          '我爸是矿工。十年前，就是这条矿道。岩灯台亮起来的那天，山塌了。',
          '首领说，心火会让山活过来，活过来的山会动，会塌，会吃人。',
          '所以我要把岩灯台挖出来，丢进深谷。这样锤音镇就安全了！',
        ],
        winLines: [
          '砧：……我打不过你。',
          '（峡谷又轻轻摇了一下。这一次，岩灯台微微亮了。）',
          '锤婆：砧！',
          '锤婆：傻孩子……你爸那天，是冲进矿道去救被困的磐角犀幼崽。山塌，是因为有人在灯台下面乱挖。',
          '锤婆：心火没有吃掉你爸。是你爸，用心火救下了一条命。',
          '砧：（铁镐掉在地上）',
          '锤婆：还有你们那个首领……我认得他。十年前，他是阿禾旅团里最年轻的孩子，手很稳，会修灯。',
        ],
      },
      {
        id: 'ridgerhino',
        name: '磐角犀',
        role: 'boss',
        x: 15,
        y: 2,
        color: 0xc4a484,
        showIf: CANYON_FLAGS.anvil,
        lines: [],
        team: [{ speciesId: 'ridgerhino', level: 30 }],
        defeatedKey: CANYON_FLAGS.rhino,
        challengeLines: ['（岩壁裂开。一只巨大的磐角犀站了起来，背上的岩甲布满十年前的裂痕。）', '（它看着砧，又看着你。然后低下了角。）'],
        winLines: [
          '砧：我不回熄灯会了。我要留下来修矿道。',
          '砧：旅人，如果你见到首领，帮我告诉他：山没有错。',
        ],
      },
    ],
  }
}
