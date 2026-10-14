/**
 * 世界时钟：步数驱动的昼夜 / 天数 / 满月，以及各地图天气轮换
 * @author zjh
 * @date 2026-10-14
 */

import type { CreatureInstance } from '../data/creatures'
import type { MinorEventId } from '../data/phenomena'
import { WEATHER_ROLL_STEPS, WEATHER_TABLES, type Weather } from '../data/weather'
import type { Rng } from './Talent'

/** 昼夜各持续步数 */
export const HALF_DAY_STEPS = 600
export const DAY_STEPS = HALF_DAY_STEPS * 2
/** 每隔几天一次满月 */
export const FULL_MOON_EVERY = 7

export interface PhenomenonState {
  activeId: string | null
  stepsLeft: number
  /** 小目标物件位置（已拾取的会移除） */
  goalSpots: { x: number; y: number }[]
  goalDone: number
  /** 是否已获得异象信物 */
  token: boolean
  pity: number
  nextRollAt: number
  cooldownUntilDay: Record<string, number>
  /** 已生成但尚未收服的唯一个体，逃走后复用 */
  pendingUniques: Record<string, CreatureInstance>
  caught: string[]
}

export interface MinorEventState {
  id: MinorEventId | null
  mapId: string | null
  stepsLeft: number
  speciesId?: string
  spot?: { x: number; y: number }
  nextRollAt: number
}

/** 存档中的世界状态 */
export interface WorldSave {
  totalSteps: number
  outdoorSteps: number
  weatherByMap: Record<string, Weather>
  nextWeatherRoll: number
  stepsSinceEncounter: number
  rarePity: Record<string, number>
  lureSteps: number
  repelSteps: number
  phenomenon: PhenomenonState
  minor: MinorEventState
}

/**
 * 新世界：所有地图默认晴天
 * @author zjh
 * @date 2026-10-14
 */
export function createWorld(): WorldSave {
  const weatherByMap: Record<string, Weather> = {}
  for (const id of Object.keys(WEATHER_TABLES)) weatherByMap[id] = 'sunny'
  return {
    totalSteps: 0,
    outdoorSteps: 0,
    weatherByMap,
    nextWeatherRoll: WEATHER_ROLL_STEPS,
    stepsSinceEncounter: 0,
    rarePity: {},
    lureSteps: 0,
    repelSteps: 0,
    phenomenon: {
      activeId: null,
      stepsLeft: 0,
      goalSpots: [],
      goalDone: 0,
      token: false,
      pity: 0,
      nextRollAt: 250,
      cooldownUntilDay: {},
      pendingUniques: {},
      caught: [],
    },
    minor: { id: null, mapId: null, stepsLeft: 0, nextRollAt: 150 },
  }
}

/** 第几天（从 1 开始） */
export function dayOf(steps: number): number {
  return Math.floor(steps / DAY_STEPS) + 1
}

export function isNight(steps: number): boolean {
  return steps % DAY_STEPS >= HALF_DAY_STEPS
}

export function isFullMoon(steps: number): boolean {
  return isNight(steps) && dayOf(steps) % FULL_MOON_EVERY === 0
}

/** 距离下一次昼夜切换的步数 */
export function stepsToNextPhase(steps: number): number {
  return HALF_DAY_STEPS - (steps % HALF_DAY_STEPS)
}

/** 当前时段 0~1 的进度（黄昏/黎明渐变用） */
export function phaseProgress(steps: number): number {
  return (steps % HALF_DAY_STEPS) / HALF_DAY_STEPS
}

/** 时段图标与文字 */
export function timeLabel(steps: number): string {
  if (isFullMoon(steps)) return '🌕 满月夜'
  return isNight(steps) ? '☾ 夜' : '☀ 昼'
}

/**
 * 按地图天气表加权抽一个天气
 * @author zjh
 * @date 2026-10-14
 */
export function rollWeather(mapId: string, rng: Rng = Math.random): Weather {
  const table = WEATHER_TABLES[mapId]
  if (!table) return 'sunny'
  const entries = Object.entries(table) as [Weather, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [w, weight] of entries) {
    r -= weight
    if (r < 0) return w
  }
  return entries[0][0]
}

/** 一步推进后发生的时钟事件 */
export interface ClockEvents {
  phaseChanged: boolean
  weatherChanged: boolean
}

/**
 * 推进一步：更新步数、昼夜，到点时重掷所有地图天气
 * @author zjh
 * @date 2026-10-14
 */
export function advanceClock(w: WorldSave, outdoor: boolean, rng: Rng = Math.random): ClockEvents {
  const wasNight = isNight(w.totalSteps)
  w.totalSteps += 1
  if (outdoor) w.outdoorSteps += 1
  if (w.lureSteps > 0) w.lureSteps -= 1
  if (w.repelSteps > 0) w.repelSteps -= 1
  let weatherChanged = false
  if (w.totalSteps >= w.nextWeatherRoll) {
    for (const id of Object.keys(WEATHER_TABLES)) w.weatherByMap[id] = rollWeather(id, rng)
    w.nextWeatherRoll = w.totalSteps + WEATHER_ROLL_STEPS
    weatherChanged = true
  }
  return { phaseChanged: wasNight !== isNight(w.totalSteps), weatherChanged }
}

/**
 * 小屋休息：直接跳到下一个白天或夜晚的开始（天气随之重掷）
 * @author zjh
 * @date 2026-10-14
 */
export function restUntil(w: WorldSave, target: 'day' | 'night', rng: Rng = Math.random): void {
  const dayStart = Math.floor(w.totalSteps / DAY_STEPS) * DAY_STEPS
  let next = target === 'day' ? dayStart + DAY_STEPS : dayStart + HALF_DAY_STEPS
  if (next <= w.totalSteps) next += DAY_STEPS
  w.totalSteps = next
  for (const id of Object.keys(WEATHER_TABLES)) w.weatherByMap[id] = rollWeather(id, rng)
  w.nextWeatherRoll = w.totalSteps + WEATHER_ROLL_STEPS
}

/** 地图当前天气；室内/城镇返回 null（无效果） */
export function weatherOf(w: WorldSave, mapId: string): Weather | null {
  return w.weatherByMap[mapId] ?? null
}
