/**
 * 随机大事件（异象）与小事件：判定、阶段推进、小目标拾取、唯一个体生成（见 docs/planning/08）
 * @author zjh
 * @date 2026-10-14
 */

import { calcStats, createCreature, type CreatureInstance } from '../data/creatures'
import { ENCOUNTERS } from '../data/encounters'
import {
  MINOR_EVENTS,
  MINOR_RULES,
  PHENOMENA,
  PHENOMENON_BY_ID,
  PHENOMENON_RULES,
  type MinorEventId,
  type PhenomenonDef,
} from '../data/phenomena'
import type { Weather } from '../data/weather'
import { SHINY_RATE } from './Encounter'
import type { Rng } from './Talent'
import { dayOf, isFullMoon, isNight, type WorldSave } from './WorldClock'

/** 判定所需的外部信息 */
export interface PhenomenonEnv {
  hasFlag: (key: string) => boolean
  unlockedMaps: string[]
  /** 地图可放置物件的空地 */
  openTiles: (mapId: string) => { x: number; y: number }[]
  rng?: Rng
}

type Spot = { x: number; y: number }

/**
 * 异象当前是否满足发生条件
 * @author zjh
 * @date 2026-10-14
 */
export function conditionsMet(w: WorldSave, def: PhenomenonDef, env: PhenomenonEnv): boolean {
  if (!env.hasFlag(def.unlockFlag) || !env.unlockedMaps.includes(def.mapId)) return false
  if (w.phenomenon.caught.includes(def.id)) return false
  if ((w.phenomenon.cooldownUntilDay[def.id] ?? 0) > dayOf(w.totalSteps)) return false
  const weather = w.weatherByMap[def.mapId] as Weather | undefined
  if (def.weather && (!weather || !def.weather.includes(weather))) return false
  const night = isNight(w.totalSteps)
  if (def.time === 'day' && night) return false
  if (def.time === 'night' && !night) return false
  if (def.time === 'full_moon' && !isFullMoon(w.totalSteps)) return false
  return true
}

/** 从空地中随机挑 n 个（排除异象中心） */
function pickSpots(tiles: Spot[], n: number, exclude: Spot, rng: Rng): Spot[] {
  const pool = tiles.filter((t) => Math.abs(t.x - exclude.x) + Math.abs(t.y - exclude.y) > 1)
  const out: Spot[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return out
}

/**
 * 开始一个异象
 * @author zjh
 * @date 2026-10-14
 */
export function startPhenomenon(w: WorldSave, def: PhenomenonDef, env: PhenomenonEnv): void {
  const rng = env.rng ?? Math.random
  const p = w.phenomenon
  p.activeId = def.id
  p.stepsLeft = PHENOMENON_RULES.duration
  p.goalSpots = pickSpots(env.openTiles(def.mapId), PHENOMENON_RULES.goalCount[def.goal], def.center, rng)
  p.goalDone = 0
  p.token = false
  p.pity = 0
}

/**
 * 每走 250 户外步判定一次是否发生异象（含保底）
 * @author zjh
 * @date 2026-10-14
 */
export function rollPhenomenon(w: WorldSave, env: PhenomenonEnv): PhenomenonDef | null {
  const p = w.phenomenon
  if (w.outdoorSteps < p.nextRollAt) return null
  p.nextRollAt = w.outdoorSteps + PHENOMENON_RULES.rollInterval
  if (p.activeId) return null
  const rng = env.rng ?? Math.random
  const candidates = PHENOMENA.filter((d) => conditionsMet(w, d, env))
  if (!candidates.length || rng() >= PHENOMENON_RULES.baseChance + p.pity * PHENOMENON_RULES.pityStep) {
    p.pity += 1
    return null
  }
  const def = candidates[Math.floor(rng() * candidates.length)]
  startPhenomenon(w, def, env)
  return def
}

export function activePhenomenon(w: WorldSave): PhenomenonDef | null {
  return w.phenomenon.activeId ? PHENOMENON_BY_ID[w.phenomenon.activeId] ?? null : null
}

export type PhenomenonEnd = 'caught' | 'failed' | 'faded'

/**
 * 结束异象：收服 → 永久结束；失败 → 冷却 3 天；消散 → 无惩罚
 * @author zjh
 * @date 2026-10-14
 */
export function endPhenomenon(w: WorldSave, reason: PhenomenonEnd): void {
  const p = w.phenomenon
  const id = p.activeId
  if (!id) return
  if (reason === 'caught') {
    if (!p.caught.includes(id)) p.caught.push(id)
    delete p.pendingUniques[id]
  } else if (reason === 'failed') {
    p.cooldownUntilDay[id] = dayOf(w.totalSteps) + PHENOMENON_RULES.cooldownDays
  }
  p.activeId = null
  p.stepsLeft = 0
  p.goalSpots = []
  p.goalDone = 0
  p.token = false
}

/**
 * 每步推进：倒计时结束或条件消失（天气/时段变化）时异象消散
 * @author zjh
 * @date 2026-10-14
 */
export function tickPhenomenon(w: WorldSave, env: PhenomenonEnv): PhenomenonDef | null {
  const def = activePhenomenon(w)
  if (!def) return null
  w.phenomenon.stepsLeft -= 1
  if (w.phenomenon.stepsLeft <= 0 || !conditionsMet(w, def, env)) {
    endPhenomenon(w, 'faded')
    return def
  }
  return null
}

/** 当前可见的小目标点：追踪类只显示下一个足迹 */
export function visibleGoalSpots(w: WorldSave, mapId: string): Spot[] {
  const def = activePhenomenon(w)
  if (!def || def.mapId !== mapId || w.phenomenon.token) return []
  return def.goal === 'track' ? w.phenomenon.goalSpots.slice(0, 1) : [...w.phenomenon.goalSpots]
}

export interface GoalProgress {
  def: PhenomenonDef
  done: number
  total: number
  tokenGained: boolean
}

/**
 * 踩到小目标点时拾取
 * @author zjh
 * @date 2026-10-14
 */
export function collectGoalAt(w: WorldSave, mapId: string, x: number, y: number): GoalProgress | null {
  const def = activePhenomenon(w)
  if (!def) return null
  const hit = visibleGoalSpots(w, mapId).find((s) => s.x === x && s.y === y)
  if (!hit) return null
  const p = w.phenomenon
  p.goalSpots = p.goalSpots.filter((s) => s !== hit)
  p.goalDone += 1
  const total = PHENOMENON_RULES.goalCount[def.goal]
  const tokenGained = p.goalDone >= total
  if (tokenGained) p.token = true
  return { def, done: p.goalDone, total, tokenGained }
}

/**
 * 取得本次异象的唯一个体：首次生成并写入存档，逃走后复用同一只（资质/性格/异色不变）
 * 返回副本供战斗使用，存档中的个体保持满状态。
 * @author zjh
 * @date 2026-10-14
 */
export function uniqueForBattle(w: WorldSave, def: PhenomenonDef, level: number, rng: Rng = Math.random): CreatureInstance {
  const p = w.phenomenon
  let stored = p.pendingUniques[def.id]
  if (!stored) {
    stored = createCreature(def.uniqueSpeciesId, level, { shiny: rng() < SHINY_RATE, rng })
    p.pendingUniques[def.id] = stored
  }
  const c = structuredClone(stored)
  c.level = Math.max(c.level, level)
  Object.assign(c, calcStats(c))
  c.hp = c.maxHp
  c.status = null
  return c
}

// ───────────────────────── 小事件 ─────────────────────────

export interface MinorStart {
  id: MinorEventId
  mapId: string
  speciesId?: string
}

/**
 * 每走 150 户外步判定一次小事件
 * @author zjh
 * @date 2026-10-14
 */
export function rollMinor(w: WorldSave, env: PhenomenonEnv): MinorStart | null {
  const m = w.minor
  if (w.outdoorSteps < m.nextRollAt) return null
  m.nextRollAt = w.outdoorSteps + MINOR_RULES.rollInterval
  const rng = env.rng ?? Math.random
  if (m.id || !env.unlockedMaps.length || rng() >= MINOR_RULES.chance) return null
  const ids = Object.keys(MINOR_EVENTS) as MinorEventId[]
  const id = ids[Math.floor(rng() * ids.length)]
  const mapId = env.unlockedMaps[Math.floor(rng() * env.unlockedMaps.length)]
  m.id = id
  m.mapId = mapId
  m.stepsLeft = MINOR_EVENTS[id].duration
  m.speciesId = undefined
  m.spot = undefined
  if (id === 'migration') {
    const pool = (ENCOUNTERS[mapId]?.grass ?? []).filter((e) => !e.time)
    m.speciesId = pool[Math.floor(rng() * pool.length)]?.speciesId
  } else if (id === 'crystal') {
    const tiles = env.openTiles(mapId)
    m.spot = tiles[Math.floor(rng() * tiles.length)]
  }
  return { id, mapId, speciesId: m.speciesId }
}

/** 每步推进小事件，结束时返回其 id */
export function tickMinor(w: WorldSave): MinorEventId | null {
  const m = w.minor
  if (!m.id) return null
  m.stepsLeft -= 1
  if (m.stepsLeft > 0) return null
  const ended = m.id
  clearMinor(w)
  return ended
}

export function clearMinor(w: WorldSave): void {
  w.minor = { id: null, mapId: null, stepsLeft: 0, nextRollAt: w.minor.nextRollAt }
}

/** 心火结晶奖励 */
export type CrystalReward = { kind: 'coins'; amount: number } | { kind: 'item'; itemId: string }

const CRYSTAL_ITEMS = ['super_potion', 'full_heal', 'pp_fruit', 'honey_berry', 'lure_bell']

/**
 * 踩到心火结晶时拾取
 * @author zjh
 * @date 2026-10-14
 */
export function collectCrystalAt(w: WorldSave, mapId: string, x: number, y: number, rng: Rng = Math.random): CrystalReward | null {
  const m = w.minor
  if (m.id !== 'crystal' || m.mapId !== mapId || !m.spot || m.spot.x !== x || m.spot.y !== y) return null
  clearMinor(w)
  if (rng() < 0.5) return { kind: 'coins', amount: 50 + Math.floor(rng() * 101) }
  return { kind: 'item', itemId: CRYSTAL_ITEMS[Math.floor(rng() * CRYSTAL_ITEMS.length)] }
}
