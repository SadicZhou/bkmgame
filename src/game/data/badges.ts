/**
 * 章节徽记：持有某属性徽记后，玩家方该属性招式威力 ×1.1（敌方不享受）
 * @author zjh
 * @date 2026-10-15
 */

import type { ElementType as CreatureType } from './types'

export type BadgeId = 'flame' | 'tide' | 'leaf' | 'stone' | 'volt' | 'frost'

export interface BadgeDef {
  id: BadgeId
  name: string
  type: CreatureType
  /** 持有徽记的存档旗标 */
  flag: string
  color: number
  desc: string
}

/** 徽记威力加成 */
export const BADGE_POWER = 1.1

export const BADGES: Record<BadgeId, BadgeDef> = {
  flame: { id: 'flame', name: '焰之徽记', type: 'flame', flag: 'badge_flame', color: 0xff8a50, desc: '焰属性招式威力 +10%' },
  tide: { id: 'tide', name: '潮之徽记', type: 'tide', flag: 'badge_tide', color: 0x5ac8f0, desc: '潮属性招式威力 +10%' },
  leaf: { id: 'leaf', name: '叶之徽记', type: 'leaf', flag: 'badge_leaf', color: 0x7ad86a, desc: '叶属性招式威力 +10%' },
  stone: { id: 'stone', name: '岩之徽记', type: 'stone', flag: 'badge_stone', color: 0xc4a484, desc: '岩属性招式威力 +10%' },
  volt: { id: 'volt', name: '雷之徽记', type: 'volt', flag: 'badge_volt', color: 0xf5d442, desc: '雷属性招式威力 +10%' },
  frost: { id: 'frost', name: '霜之徽记', type: 'frost', flag: 'badge_frost', color: 0xb8e4ff, desc: '霜属性招式威力 +10%' },
}

/**
 * 已持有徽记对应的属性列表
 * @author zjh
 * @date 2026-10-15
 */
export function ownedBadgeTypes(hasFlag: (k: string) => boolean): CreatureType[] {
  return Object.values(BADGES)
    .filter((b) => hasFlag(b.flag))
    .map((b) => b.type)
}

/**
 * 已持有的徽记定义（用于界面展示）
 * @author zjh
 * @date 2026-10-15
 */
export function ownedBadges(hasFlag: (k: string) => boolean): BadgeDef[] {
  return Object.values(BADGES).filter((b) => hasFlag(b.flag))
}
