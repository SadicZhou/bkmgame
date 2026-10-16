/**
 * 第五章星砂荒原：沙暴计步、落雷节奏、避雷针、绯的暖光
 * 纯函数，不读场景。剧本见 docs/story/05-第五章-星砂.md
 * @author zjh
 * @date 2026-10-16
 */

import { SPECIES } from '../data/creatures'

/** 每走满这么多步，有一半几率卷起沙暴 */
export const STORM_EVERY = 30
/** 沙暴持续步数 */
export const STORM_LEN = 15

export const DUNE_FLAGS = {
  unlocked: 'dunes_unlocked',
  chart: 'star_chart',
  rods: 'dunes_rods_lit',
  twins: 'dunes_met_twins',
  kindler: 'kindler_joined',
  falcon: 'falcon_beaten',
  chapter: 'chapter5_done',
} as const

export const rodFlag = (i: number) => `dune_rod_${i}`

/** 四根避雷针都亮起后，雷心坑的石门打开，落雷也不再弹人 */
export const ROD_IDS = [1, 2, 3, 4] as const

/** 石门（墙上的一格） */
export const DUNE_GATE = { x: 10, y: 3 }

/** 落雷格：亮、暗、暗、落，落在「落」拍上会被弹回 */
export const BOLTS = [
  { x: 8, y: 4 },
  { x: 10, y: 4 },
  { x: 12, y: 4 },
] as const

/** 被弹回的安全格（避雷针南侧） */
export const BOLT_SAFE = { x: 10, y: 5 }

export type BoltPhase = 'flash' | 'dark' | 'dark2' | 'strike'

/**
 * 落雷四拍。步数从 1 起算：1 亮、2 暗、3 暗、4 落，然后循环
 * @author zjh
 * @date 2026-10-16
 */
export function boltPhase(step: number): BoltPhase {
  const phases: BoltPhase[] = ['flash', 'dark', 'dark2', 'strike']
  const n = ((step % 4) + 4) % 4
  return phases[n === 0 ? 3 : n - 1]
}

/** 这一拍会落雷 */
export function boltStrikes(step: number): boolean {
  return boltPhase(step) === 'strike'
}

export function isBoltTile(x: number, y: number): boolean {
  return BOLTS.some((b) => b.x === x && b.y === y)
}

export function rodsLit(getFlag: (k: string) => unknown): boolean {
  return ROD_IDS.every((i) => !!getFlag(rodFlag(i)))
}

export interface StormTick {
  walk: number
  left: number
  started: boolean
  ended: boolean
}

/**
 * 走一步后的沙暴。暴风中每步减少剩余，结束后重新数 30 步
 * @author zjh
 * @date 2026-10-16
 */
export function tickDuneStorm(walk: number, left: number, rng: () => number): StormTick {
  if (left > 0) {
    const next = left - 1
    return { walk, left: next, started: false, ended: next === 0 }
  }
  const w = walk + 1
  if (w >= STORM_EVERY && rng() < 0.5) return { walk: 0, left: STORM_LEN, started: true, ended: false }
  if (w >= STORM_EVERY) return { walk: 0, left: 0, started: false, ended: false }
  return { walk: w, left: 0, started: false, ended: false }
}

/** 队伍里有雷系伙伴，或拿着蓄雷瓶，才能给避雷针充电 */
export function canChargeRod(party: { speciesId: string }[], hasBottle: boolean): boolean {
  return hasBottle || party.some((c) => SPECIES[c.speciesId]?.type === 'volt')
}

/**
 * 绯同行时，战前为还活着的伙伴回复 20% 最大体力。返回实际回复的只数
 * @author zjh
 * @date 2026-10-16
 */
export function healWithKindler(party: { hp: number; maxHp: number }[]): number {
  let n = 0
  for (const c of party) {
    if (c.hp <= 0 || c.hp >= c.maxHp) continue
    const add = Math.max(1, Math.floor(c.maxHp * 0.2))
    const before = c.hp
    c.hp = Math.min(c.maxHp, c.hp + add)
    if (c.hp > before) n += 1
  }
  return n
}

/** 星图上的九座灯台。点亮与否看对应旗标 */
export const BEACONS: { name: string; flag: string }[] = [
  { name: '焰', flag: 'badge_flame' },
  { name: '潮', flag: 'badge_tide' },
  { name: '叶', flag: 'badge_leaf' },
  { name: '岩', flag: 'badge_stone' },
  { name: '雷', flag: 'badge_volt' },
  { name: '霜', flag: 'chapter6_done' },
  { name: '风', flag: 'chapter7_done' },
  { name: '一般', flag: 'chapter8_done' },
  { name: '灵', flag: 'chapter9_done' },
]
