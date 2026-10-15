/**
 * 钓鱼图鉴与钓鱼大赛（纯逻辑，可注入随机源）
 * 状态挂在 WorldSave 上（fishLog / fishContest，旧存档缺省为空）。
 * @author zjh
 * @date 2026-10-15
 */

import {
  ANGLER_RECORD_RATE,
  CONTEST_ITEMS,
  CONTEST_TARGET_RATE,
  FISH_BASE_CM,
  FISH_ORDER,
  FISH_SIZE,
  RAIN_CONTEST,
  RECORD_FLAG_PREFIX,
} from '../data/fishing'
import type { Weather } from '../data/weather'
import type { Rng } from './Talent'

/** 单个物种的钓鱼记录 */
export interface FishRecord {
  count: number
  /** 最大体长（cm） */
  best: number
}

/** 当天的钓鱼大赛 */
export interface FishContest {
  /** 出题的天数 */
  day: number
  speciesId: string
  /** 达标体长（cm） */
  minSize: number
  /** 已钓到达标的鱼 */
  done: boolean
  /** 已领奖 */
  claimed: boolean
  /** 雨天限定题：必须在雨中钓到 */
  rain?: boolean
}

/** 持有钓鱼状态的对象（即 WorldSave） */
export interface FishStore {
  fishLog?: Record<string, FishRecord>
  fishContest?: FishContest | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * 随机体长：基准 × 0.75～1.30，强壮个体再 ×1.15
 * @author zjh
 * @date 2026-10-15
 */
export function rollFishSize(speciesId: string, strong: boolean, rng: Rng = Math.random): number {
  const base = FISH_BASE_CM[speciesId] ?? 20
  const rate = FISH_SIZE.min + rng() * (FISH_SIZE.max - FISH_SIZE.min)
  return round1(base * rate * (strong ? FISH_SIZE.strongBonus : 1))
}

/**
 * 登记一次上钩，返回是否首次钓到、是否刷新最大体长
 * @author zjh
 * @date 2026-10-15
 */
export function recordCatch(store: FishStore, speciesId: string, size: number): { first: boolean; newBest: boolean } {
  const log = (store.fishLog ??= {})
  const rec = log[speciesId]
  if (!rec) {
    log[speciesId] = { count: 1, best: size }
    return { first: true, newBest: true }
  }
  rec.count += 1
  const newBest = size > rec.best
  if (newBest) rec.best = size
  return { first: false, newBest }
}

/** 钓鱼记录是否集齐 */
export function fishLogComplete(store: FishStore): boolean {
  return FISH_ORDER.every((id) => (store.fishLog?.[id]?.count ?? 0) > 0)
}

/** 已钓到的种类数 */
export function fishLogCount(store: FishStore): number {
  return FISH_ORDER.filter((id) => (store.fishLog?.[id]?.count ?? 0) > 0).length
}

/**
 * 生成某天的大赛题目：在题库中按天轮换，目标体长 = 基准 × 1.1；雨天限定题为基准 × 1.0
 * @author zjh
 * @date 2026-10-15
 */
export function contestFor(day: number, pool: string[], rain = false): FishContest {
  const speciesId = pool[(day - 1 + pool.length) % pool.length]
  const rate = rain ? RAIN_CONTEST.targetRate : CONTEST_TARGET_RATE
  const contest: FishContest = { day, speciesId, minSize: round1((FISH_BASE_CM[speciesId] ?? 20) * rate), done: false, claimed: false }
  if (rain) contest.rain = true
  return contest
}

/** 当天进行中的大赛（不是今天的题目视为没有） */
export function todayContest(store: FishStore, day: number): FishContest | null {
  const c = store.fishContest
  return c && c.day === day ? c : null
}

/**
 * 上钩时检查大赛是否达标；首次达标返回 true
 * @author zjh
 * @date 2026-10-15
 */
export function judgeContest(store: FishStore, day: number, speciesId: string, size: number, weather: Weather | null = null): boolean {
  const c = todayContest(store, day)
  if (!c || c.done || c.speciesId !== speciesId || size < c.minSize) return false
  if (c.rain && weather !== 'rain') return false
  c.done = true
  return true
}

/** 当天大赛的轮换奖励道具 */
export function contestItem(day: number): string {
  return CONTEST_ITEMS[(day - 1 + CONTEST_ITEMS.length) % CONTEST_ITEMS.length]
}

/** 澈在该物种上的个人纪录（cm） */
export function anglerRecord(speciesId: string): number {
  return round1((FISH_BASE_CM[speciesId] ?? 20) * ANGLER_RECORD_RATE)
}

/** 打破该物种纪录后领奖用的旗标 */
export function recordFlag(speciesId: string): string {
  return `${RECORD_FLAG_PREFIX}${speciesId}`
}

/** 玩家最大体长是否超过澈的纪录 */
export function beatsRecord(store: FishStore, speciesId: string): boolean {
  return (store.fishLog?.[speciesId]?.best ?? 0) > anglerRecord(speciesId)
}

/**
 * 已打破但还没领奖的纪录（按钓鱼记录顺序）
 * @author zjh
 * @date 2026-10-15
 */
export function unclaimedRecords(store: FishStore, hasFlag: (flag: string) => boolean): string[] {
  return FISH_ORDER.filter((id) => beatsRecord(store, id) && !hasFlag(recordFlag(id)))
}
