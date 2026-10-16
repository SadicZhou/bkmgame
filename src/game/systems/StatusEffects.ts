/**
 * 异常状态与能力阶段：施加、免疫、行动前检查（见 docs/planning/06 第 3.1、4 节）
 * @author zjh
 * @date 2026-10-14
 */

import { SPECIES, battleName, type CreatureInstance } from '../data/creatures'
import type { StageKey, StatusId, VolatileId } from '../data/moves'
import { dealDamage, say, sideAnim, volOf, type BattleState, type Side } from './BattleCore'

export const STATUS_LABEL: Record<StatusId, string> = { burn: '灼烧', paralyze: '麻痹', freeze: '冻结' }
export const STATUS_ICON: Record<StatusId, string> = { burn: '灼', paralyze: '麻', freeze: '冻' }
const STAGE_LABEL: Record<StageKey, string> = { atk: '攻击', def: '防御', spd: '速度' }

/** 能力阶段倍率表：−3 … +3 */
const STAGE_MULT: Record<number, number> = { [-3]: 0.57, [-2]: 0.67, [-1]: 0.8, 0: 1, 1: 1.25, 2: 1.5, 3: 1.75 }

export function stageMultiplier(stage: number): number {
  return STAGE_MULT[Math.max(-3, Math.min(3, stage))]
}

/** 属性免疫：焰不灼烧、雷不麻痹、霜不冻结；「水泡」不灼烧 */
function immuneTo(c: CreatureInstance, status: StatusId): boolean {
  const type = SPECIES[c.speciesId].type
  if (status === 'burn') return type === 'flame' || c.abilityId === 'bubble'
  if (status === 'paralyze') return type === 'volt'
  return type === 'frost'
}

/**
 * 尝试施加主状态；已有主状态或免疫时失败
 * @author zjh
 * @date 2026-10-14
 */
export function tryApplyStatus(s: BattleState, side: Side, target: CreatureInstance, status: StatusId, loud: boolean): boolean {
  if (target.hp <= 0) return false
  if (target.status || immuneTo(target, status)) {
    if (loud) say(s, `但是对 ${battleName(target)} 没有效果……`)
    return false
  }
  target.status = status
  say(s, `${battleName(target)} ${STATUS_LABEL[status]}了！`, sideAnim(side, 'statusPlayer', 'statusEnemy'))
  return true
}

/**
 * 尝试施加附加状态（寄生 / 混乱）
 * @author zjh
 * @date 2026-10-14
 */
export function tryApplyVolatile(s: BattleState, side: Side, target: CreatureInstance, v: VolatileId, loud: boolean): boolean {
  if (target.hp <= 0) return false
  const vol = volOf(s, target)
  const type = SPECIES[target.speciesId].type
  if (v === 'seeded') {
    if (vol.seeded || type === 'leaf') {
      if (loud) say(s, `但是对 ${battleName(target)} 没有效果……`)
      return false
    }
    vol.seeded = true
    say(s, `${battleName(target)} 被种下了寄生种！`, sideAnim(side, 'statusPlayer', 'statusEnemy'))
    return true
  }
  if (vol.confused > 0 || type === 'spirit') {
    if (loud) say(s, `但是对 ${battleName(target)} 没有效果……`)
    return false
  }
  vol.confused = 2 + Math.floor(Math.random() * 3)
  say(s, `${battleName(target)} 混乱了！`, sideAnim(side, 'statusPlayer', 'statusEnemy'))
  return true
}

/**
 * 调整能力阶段（±3 封顶）
 * @author zjh
 * @date 2026-10-14
 */
export function changeStages(
  s: BattleState,
  side: Side,
  target: CreatureInstance,
  stages: Partial<Record<StageKey, number>>,
  opts: { blockDrops?: boolean } = {},
): void {
  if (target.hp <= 0) return
  const vol = volOf(s, target)
  for (const [key, delta] of Object.entries(stages) as [StageKey, number][]) {
    if (!delta) continue
    if (delta < 0 && opts.blockDrops) {
      say(s, `${battleName(target)} 的「不动」让能力没有下降！`)
      continue
    }
    const before = vol.stages[key]
    const after = Math.max(-3, Math.min(3, before + delta))
    if (after === before) {
      say(s, `${battleName(target)} 的${STAGE_LABEL[key]}已经无法再${delta > 0 ? '提升' : '降低'}了！`)
      continue
    }
    vol.stages[key] = after
    const much = Math.abs(after - before) >= 2 ? '大幅' : ''
    const up = delta > 0
    say(
      s,
      `${battleName(target)} 的${STAGE_LABEL[key]}${much}${up ? '提升' : '降低'}了！`,
      up ? sideAnim(side, 'buffPlayer', 'buffEnemy') : sideAnim(side, 'debuffPlayer', 'debuffEnemy'),
    )
  }
}

/** 行动前检查结果 */
export type BeforeMove = 'act' | 'skip'

/**
 * 行动前：冻结（25% 解冻）、麻痹（25% 无法行动）、混乱（33% 攻击自己）
 * @author zjh
 * @date 2026-10-14
 */
export function beforeMove(s: BattleState, side: Side, c: CreatureInstance): BeforeMove {
  const name = battleName(c)
  if (c.status === 'freeze') {
    if (Math.random() < 0.25) {
      c.status = null
      say(s, `${name} 的冰融化了！`)
    } else {
      say(s, `${name} 被冻住了，无法行动！`, sideAnim(side, 'statusPlayer', 'statusEnemy'))
      return 'skip'
    }
  }
  if (c.status === 'paralyze' && Math.random() < 0.25) {
    say(s, `${name} 身体麻痹，无法行动！`, sideAnim(side, 'statusPlayer', 'statusEnemy'))
    return 'skip'
  }
  const vol = volOf(s, c)
  if (c.abilityId === 'last_light' && c.hp * 2 < c.maxHp && !vol.lastLight) {
    vol.lastLight = true
    say(s, `「……灯灯？」${name} 羽尖亮起一圈暖光，这一回合没有出手。`, sideAnim(side, 'statusPlayer', 'statusEnemy'))
    return 'skip'
  }
  if (vol.confused > 0) {
    vol.confused -= 1
    if (vol.confused <= 0) {
      say(s, `${name} 的混乱解除了！`)
    } else if (Math.random() < 1 / 3) {
      const raw = ((2 * c.level) / 5 + 2) * 20 * (c.atk / Math.max(1, c.def))
      const dmg = dealDamage(c, Math.max(1, raw / 12))
      say(s, `${name} 混乱中攻击了自己！（-${dmg}）`, sideAnim(side, 'hurtPlayer', 'hurtEnemy'))
      return 'skip'
    }
  }
  return 'act'
}
