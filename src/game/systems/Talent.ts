/**
 * 资质系统：四维资质掷骰、D～S 评级、能力倍率、星级（见 docs/planning/05-天赋与性格.md）
 * 纯函数，可注入随机源便于单元测试。
 * @author zjh
 * @date 2026-10-14
 */

import type { StatKey } from '../data/natures'

export type Talent = Record<StatKey, number>
export type TalentGrade = 'S' | 'A' | 'B' | 'C' | 'D'
export type Rng = () => number

export const TALENT_MAX = 20
export const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spd']

/** 评级区间（四项总和 0～80）与展示信息 */
export const GRADE_INFO: Record<TalentGrade, { min: number; label: string; color: string }> = {
  S: { min: 70, label: '天选', color: '#ffd040' },
  A: { min: 58, label: '卓越', color: '#6ab8ff' },
  B: { min: 44, label: '优秀', color: '#7ee08a' },
  C: { min: 28, label: '寻常', color: '#e8f5ee' },
  D: { min: 0, label: '平庸', color: '#9aa8a0' },
}

/**
 * 掷单项资质：下限 + 两次随机平均（三角分布，中间值更常见）
 * @author zjh
 * @date 2026-10-14
 */
export function rollStat(floor: number, rng: Rng = Math.random): number {
  const f = Math.max(0, Math.min(TALENT_MAX, floor))
  const span = TALENT_MAX - f + 1
  return Math.min(TALENT_MAX, f + Math.floor(((rng() + rng()) / 2) * span))
}

/**
 * 掷四维资质
 * @author zjh
 * @date 2026-10-14
 */
export function rollTalent(floor: number, rng: Rng = Math.random): Talent {
  return {
    hp: rollStat(floor, rng),
    atk: rollStat(floor, rng),
    def: rollStat(floor, rng),
    spd: rollStat(floor, rng),
  }
}

export function talentTotal(t: Talent): number {
  return t.hp + t.atk + t.def + t.spd
}

/**
 * 按总和评级
 * @author zjh
 * @date 2026-10-14
 */
export function talentGrade(t: Talent): TalentGrade {
  const total = talentTotal(t)
  if (total >= GRADE_INFO.S.min) return 'S'
  if (total >= GRADE_INFO.A.min) return 'A'
  if (total >= GRADE_INFO.B.min) return 'B'
  if (total >= GRADE_INFO.C.min) return 'C'
  return 'D'
}

/** 单项资质 → 能力倍率：0 → ×0.90，20 → ×1.10 */
export function talentMultiplier(value: number): number {
  return 0.9 + Math.max(0, Math.min(TALENT_MAX, value)) * 0.01
}

/** 单项资质星级：每 4 点 1 星，满 5 星 */
export function talentStars(value: number): string {
  const n = Math.min(5, Math.floor(value / 4))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

/** 天赋觉醒加成：A +3%，S +5%，其余无 */
export function awakenBonus(grade: TalentGrade): number {
  if (grade === 'S') return 1.05
  if (grade === 'A') return 1.03
  return 1
}

/** 觉醒等级 */
export const AWAKEN_LEVEL = 25

/** 每只伙伴最多使用资质果次数 */
export const FRUIT_LIMIT = 5

/** 资质果作用对象：只需资质与已用次数 */
export interface FruitTarget {
  talent: Talent
  fruitUsed?: number
}

/**
 * 检查能否对某项资质使用资质果；可用返回 null，否则返回原因
 * @author zjh
 * @date 2026-10-15
 */
export function fruitBlock(c: FruitTarget, stat?: StatKey): string | null {
  if ((c.fruitUsed ?? 0) >= FRUIT_LIMIT) return `已经吃过 ${FRUIT_LIMIT} 颗资质果了`
  if (stat && c.talent[stat] >= TALENT_MAX) return '这项资质已经满了'
  if (!stat && STAT_KEYS.every((k) => c.talent[k] >= TALENT_MAX)) return '资质已经全满了'
  return null
}

/**
 * 使用资质果：指定一项 +gain（上限 20），计入次数；返回实际增加量（不可用时为 0）
 * @author zjh
 * @date 2026-10-15
 */
export function applyFruit(c: FruitTarget, stat: StatKey, gain = 2): number {
  if (fruitBlock(c, stat)) return 0
  const before = c.talent[stat]
  c.talent[stat] = Math.min(TALENT_MAX, before + gain)
  c.fruitUsed = (c.fruitUsed ?? 0) + 1
  return c.talent[stat] - before
}
