/**
 * 钓鱼规则（纯逻辑，可单测）：甩竿后 1～3 秒咬钩，0.6 秒内按确认，85% 上钩
 * 表现见 ui/FishingOverlay；遭遇抽取见 systems/WorldTick.rollFishing。
 * @author zjh
 * @date 2026-10-15
 */

import { resolveTile, type HasFlag, type MapDef } from '../data/maps'
import type { Rng } from './Talent'

export type RodKind = 'rod' | 'goodRod'

export const FISHING = {
  biteMinMs: 1000,
  biteMaxMs: 3000,
  windowMs: 600,
  hookChance: 0.85,
} as const

/** 收竿判定结果：太早 / 上钩 / 溜走 */
export type ReelResult = 'early' | 'hooked' | 'escaped'

/**
 * 持有的最好钓竿；没有钓竿返回 null
 * @author zjh
 * @date 2026-10-15
 */
export function rodKindOf(itemCount: (id: string) => number): RodKind | null {
  if (itemCount('good_rod') > 0) return 'goodRod'
  if (itemCount('old_rod') > 0) return 'rod'
  return null
}

/**
 * 面前这一格能否下竿：必须是水面（未搭好的浮桥也算水面）
 * @author zjh
 * @date 2026-10-15
 */
export function canFishAt(map: MapDef, x: number, y: number, hasFlag: HasFlag): boolean {
  return resolveTile(map, x, y, hasFlag) === 'water'
}

/** 甩竿后到咬钩的等待时间（ms） */
export function rollBiteDelay(rng: Rng = Math.random): number {
  return Math.round(FISHING.biteMinMs + rng() * (FISHING.biteMaxMs - FISHING.biteMinMs))
}

/**
 * 收竿判定
 * @param sinceBiteMs 距咬钩的时间；咬钩前按键传负数
 * @author zjh
 * @date 2026-10-15
 */
export function judgeReel(sinceBiteMs: number, rng: Rng = Math.random): ReelResult {
  if (sinceBiteMs < 0) return 'early'
  if (sinceBiteMs > FISHING.windowMs) return 'escaped'
  return rng() < FISHING.hookChance ? 'hooked' : 'escaped'
}
