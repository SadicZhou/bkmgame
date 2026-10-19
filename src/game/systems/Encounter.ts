/**
 * 遇敌判定与物种抽取（见 docs/planning/04-遭遇系统.md）
 * 纯函数，可注入随机源便于单元测试。
 * @author zjh
 * @date 2026-10-14
 */

import { SPECIES } from '../data/creatures'
import type { EncounterEntry, EncounterTable } from '../data/encounters'
import { weatherEncounterMod, weatherSpeciesMod, type Weather } from '../data/weather'
import type { Rng } from './Talent'

/** 进入地图 / 战斗结束后的安全步数 */
export const SAFE_STEPS = 3
/** 稀有保底：连续多少次遇敌未出稀有种后加权 */
export const RARE_PITY = 30
export const SHINY_RATE = 1 / 400
export const STRONG_RATE = 0.1

export interface EncounterContext {
  table: EncounterTable
  weather: Weather | null
  night: boolean
  leadLevel: number
  leadAbility: string
  /** 距上次遇敌（或进图）走了几步 */
  stepsSince: number
  lureActive: boolean
  repelActive: boolean
  caught: string[]
  rarePity: number
  /** 小事件：迁徙潮物种 / 闪耀时刻 */
  migrationSpecies?: string
  shimmer?: boolean
  /** 剧情旗标（条目 requireFlag 用；不传视为都没有） */
  hasFlag?: (key: string) => boolean
  /** 星砂护符等对异色率的倍率，默认 1 */
  shinyMod?: number
  /** 金钓竿：稀有伙伴权重再乘 2 */
  goldRod?: boolean
}

export interface EncounterPick {
  speciesId: string
  level: number
  strong: boolean
  shiny: boolean
  rare: boolean
}

function maxWildLevel(table: EncounterTable): number {
  return Math.max(...table.grass.map((e) => e.maxLv))
}

/**
 * 本步遇敌概率 = 地形基础 × 干旱保底 × 引兽铃 × 天气 × 碾压 × 驱散
 * @author zjh
 * @date 2026-10-14
 */
export function encounterRate(ctx: EncounterContext): number {
  if (ctx.stepsSince <= SAFE_STEPS) return 0
  const drought = Math.min(2, 1 + 0.02 * (ctx.stepsSince - SAFE_STEPS))
  const lure = ctx.lureActive ? 1.5 : 1
  const crush = ctx.leadLevel >= maxWildLevel(ctx.table) + 10 ? 0.5 : 1
  const dispel = ctx.leadAbility === 'dispel' ? 0.7 : 1
  return ctx.table.baseRate * drought * lure * weatherEncounterMod(ctx.weather) * crush * dispel
}

/**
 * 单个条目的实际权重
 * @author zjh
 * @date 2026-10-14
 */
export function entryWeight(ctx: EncounterContext, e: EncounterEntry): number {
  if (e.time === 'night' && !ctx.night) return 0
  if (e.time === 'day' && ctx.night) return 0
  if (e.weather && !(ctx.weather && e.weather.includes(ctx.weather))) return 0
  if (e.requireFlag && !ctx.hasFlag?.(e.requireFlag)) return 0
  const sp = SPECIES[e.speciesId]
  const rare = sp.rarity === 'rare'
  let w = e.weight
  if (!ctx.caught.includes(e.speciesId)) w *= 1.2
  w *= weatherSpeciesMod(ctx.weather, sp.type)
  if (rare && ctx.rarePity >= RARE_PITY) w *= 3
  if (rare && ctx.lureActive) w *= 2
  if (rare && ctx.goldRod) w *= 2
  if (rare && ctx.leadAbility === 'guide') w *= 1.5
  if (ctx.migrationSpecies === e.speciesId) w *= 5
  return w
}

/**
 * 按权重抽物种、等级、强壮与异色；驱兽香生效且等级低于首发时返回 null
 * @author zjh
 * @date 2026-10-14
 */
export function pickEncounter(ctx: EncounterContext, rng: Rng = Math.random): EncounterPick | null {
  const weighted = ctx.table.grass.map((e) => ({ e, w: entryWeight(ctx, e) })).filter((x) => x.w > 0)
  if (!weighted.length) return null
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let r = rng() * total
  let entry = weighted[weighted.length - 1].e
  for (const x of weighted) {
    r -= x.w
    if (r < 0) {
      entry = x.e
      break
    }
  }
  const strong = rng() < STRONG_RATE
  const level = entry.minLv + Math.floor(rng() * (entry.maxLv - entry.minLv + 1)) + (strong ? 2 : 0)
  if (ctx.repelActive && level < ctx.leadLevel) return null
  const shiny = rng() < SHINY_RATE * (ctx.shimmer ? 3 : 1) * (ctx.shinyMod ?? 1)
  return { speciesId: entry.speciesId, level, strong, shiny, rare: SPECIES[entry.speciesId].rarity === 'rare' }
}

/** 遭遇表中是否有稀有种（决定是否累计保底） */
export function hasRare(table: EncounterTable): boolean {
  return table.grass.some((e) => SPECIES[e.speciesId].rarity === 'rare')
}
