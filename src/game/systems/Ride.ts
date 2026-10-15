/**
 * 骑乘规则（纯函数）：能否上坐骑、骑乘时能否进入某格、对遇敌的影响、移动时长
 * @author zjh
 * @date 2026-10-15
 */

import { MOUNTS, MOUNT_SKILLS, type MountSkill } from '../data/mounts'
import { isSolid, type TileKind } from '../data/maps'

type HasFlag = (k: string) => boolean

/** 能否骑乘的判定对象 */
export interface RideTarget {
  speciesId: string
  hp: number
}

/**
 * 不能骑乘的原因；可以骑乘返回 null
 * @author zjh
 * @date 2026-10-15
 */
export function rideBlock(c: RideTarget | null | undefined, outdoor: boolean): string | null {
  if (!c) return '还没有指定坐骑（菜单 → 队伍 → 选择伙伴 → 设为坐骑）'
  if (!MOUNTS[c.speciesId]) return '它的体型不适合骑乘'
  if (c.hp <= 0) return '它累倒了，先让它休息一下吧'
  if (!outdoor) return '这里不方便骑乘'
  return null
}

/** 该骑乘能力在当前剧情下是否已生效 */
export function skillActive(skill: MountSkill | null, hasFlag: HasFlag): boolean {
  if (!skill) return false
  const flag = MOUNT_SKILLS[skill].unlockFlag
  return !flag || hasFlag(flag)
}

/**
 * 骑乘中能否进入该格：踏浪可下水，攀岩可翻岩石；墙始终不可通行
 * @param skill 当前生效的骑乘能力（未骑乘或未解锁传 null）
 * @author zjh
 * @date 2026-10-15
 */
export function passable(tile: TileKind | null, skill: MountSkill | null): boolean {
  if (!tile) return false
  if (tile === 'water') return skill === 'surf'
  if (tile === 'rock') return skill === 'climb'
  return !isSolid(tile)
}

/** 骑乘中下坐骑：不能停在水面 / 岩石上 */
export function canDismountOn(tile: TileKind | null): boolean {
  return !!tile && !isSolid(tile)
}

/**
 * 骑乘对遇敌来源的修正：焰步走灰烬草不遇敌；林隐走高草一半机率不遇敌
 * @param source 原本的遇敌来源（null 表示本步不判定遇敌）
 * @author zjh
 * @date 2026-10-15
 */
export function rideEncounterSource<S extends string>(tile: TileKind, source: S | null, skill: MountSkill | null, rng: () => number = Math.random): S | null {
  if (!source || !skill) return source
  if (skill === 'blaze' && tile === 'ash') return null
  if (skill === 'quiet' && tile === 'tall' && rng() < 0.5) return null
  return source
}

/** 骑乘时每格的移动时长 */
export function rideMoveMs(baseMs: number, speciesId: string | null): number {
  const m = speciesId ? MOUNTS[speciesId] : undefined
  return m ? Math.round(baseMs / m.speed) : baseMs
}
