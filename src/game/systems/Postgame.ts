/**
 * 通关后：冠军之路回血、灯灯足迹、守护兽收服与九灯徽章
 * @author zjh
 * @date 2026-10-19
 */

import { SPECIES, createCreature, type CreatureInstance } from '../data/creatures'

/** 九只守护兽。收服旗标是 pal_物种 id */
export const GUARDIANS = ['magmane', 'tidewhale', 'echodeer', 'ridgerhino', 'stormfalcon', 'frostcrane', 'galeroc', 'hearthbear', 'dawnphoenix'] as const

/** 九灯徽章：玩家所有招式再 ×1.03 */
export const NINE_LIGHTS_POWER = 1.03

/**
 * 收服旗标
 * @author zjh
 * @date 2026-10-19
 */
export function palFlag(speciesId: string): string {
  return `pal_${speciesId}`
}

/**
 * 回复最大体力的 30%
 * @author zjh
 * @date 2026-10-19
 */
export function healThird(party: { hp: number; maxHp: number }[]): number {
  let healed = 0
  for (const c of party) {
    if (c.hp <= 0 || c.hp >= c.maxHp) continue
    const gain = Math.max(1, Math.floor(c.maxHp * 0.3))
    const next = Math.min(c.maxHp, c.hp + gain)
    if (next !== c.hp) healed += 1
    c.hp = next
  }
  return healed
}

/** 灯灯走过的五处旧地 */
export const TRACE_FLAGS = ['trace_pass', 'trace_lake', 'trace_forest', 'trace_town', 'trace_tower'] as const

/**
 * 已经走过几处
 * @author zjh
 * @date 2026-10-19
 */
export function traceCount(has: (key: string) => boolean): number {
  return TRACE_FLAGS.filter((k) => has(k)).length
}

/** 发守护兽时需要的存档操作 */
export interface GuardianStore {
  has(key: string): boolean
  set(key: string): void
  add(creature: CreatureInstance): 'party' | 'storage'
  mark(speciesId: string): void
}

/**
 * 打赢再战后收服一次。九只到齐时点亮九灯徽章
 * @author zjh
 * @date 2026-10-19
 */
export function grantGuardian(speciesId: string, level: number, store: GuardianStore): string[] {
  const flag = palFlag(speciesId)
  if (store.has(flag)) return []
  const pet = createCreature(speciesId, level, { talentFloor: 12 })
  const where = store.add(pet)
  store.mark(speciesId)
  store.set(flag)
  const name = SPECIES[speciesId].name
  const lines = [where === 'party' ? `${name} 加入了队伍。` : `${name} 去了寄存所。`]
  if (!store.has('nine_lights') && GUARDIANS.every((id) => store.has(palFlag(id)))) {
    store.set('nine_lights')
    lines.push('九灯徽章亮了。你的招式都更有力了一点。')
  }
  return lines
}
