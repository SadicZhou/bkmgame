/**
 * 属性克制表与资质系统单元测试
 * @author zjh
 * @date 2026-10-14
 */

import { describe, expect, it } from 'vitest'
import { ALL_TYPES, typeMultiplier } from '../src/game/data/types'
import {
  GRADE_INFO,
  STAT_KEYS,
  TALENT_MAX,
  rollTalent,
  talentGrade,
  talentMultiplier,
  talentStars,
  talentTotal,
} from '../src/game/systems/Talent'
import { seeded } from './helpers'

describe('属性克制', () => {
  it('所有倍率只取 0.5 / 0.75 / 1 / 1.5，且没有免疫', () => {
    for (const a of ALL_TYPES) {
      for (const d of ALL_TYPES) expect([0.5, 0.75, 1, 1.5]).toContain(typeMultiplier(a, d))
    }
  })

  it('初始三角：焰 > 叶 > 潮 > 焰', () => {
    expect(typeMultiplier('flame', 'leaf')).toBe(1.5)
    expect(typeMultiplier('leaf', 'tide')).toBe(1.5)
    expect(typeMultiplier('tide', 'flame')).toBe(1.5)
    expect(typeMultiplier('leaf', 'flame')).toBe(0.75)
  })

  it('一般系打灵系只有 0.5，灵系打一般系 1.5', () => {
    expect(typeMultiplier('normal', 'spirit')).toBe(0.5)
    expect(typeMultiplier('spirit', 'normal')).toBe(1.5)
  })
})

describe('资质', () => {
  it('每项在 [下限, 20] 之间', () => {
    const rng = seeded(1)
    for (let i = 0; i < 500; i++) {
      const t = rollTalent(8, rng)
      for (const k of STAT_KEYS) {
        expect(t[k]).toBeGreaterThanOrEqual(8)
        expect(t[k]).toBeLessThanOrEqual(TALENT_MAX)
      }
    }
  })

  it('评级边界：S≥70，A≥58，B≥44，C≥28', () => {
    const mk = (n: number) => ({ hp: n, atk: n, def: n, spd: n })
    expect(talentGrade(mk(18))).toBe('S') // 72
    expect(talentGrade({ hp: 17, atk: 17, def: 18, spd: 18 })).toBe('S') // 70
    expect(talentGrade({ hp: 17, atk: 17, def: 17, spd: 18 })).toBe('A') // 69
    expect(talentGrade(mk(11))).toBe('B') // 44
    expect(talentGrade(mk(7))).toBe('C') // 28
    expect(talentGrade(mk(6))).toBe('D') // 24
    expect(GRADE_INFO.S.min).toBe(70)
  })

  it('普通物种（下限 0）分布：S 很稀有，C/B 最常见', () => {
    const rng = seeded(42)
    const count: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }
    const N = 5000
    for (let i = 0; i < N; i++) count[talentGrade(rollTalent(0, rng))]++
    expect(count.S / N).toBeLessThan(0.05)
    expect((count.B + count.C) / N).toBeGreaterThan(0.5)
  })

  it('能力倍率 0.9~1.1，星级每 4 点 1 星', () => {
    expect(talentMultiplier(0)).toBeCloseTo(0.9)
    expect(talentMultiplier(20)).toBeCloseTo(1.1)
    expect(talentMultiplier(99)).toBeCloseTo(1.1)
    expect(talentStars(20)).toBe('★★★★★')
    expect(talentStars(3)).toBe('☆☆☆☆☆')
    expect(talentTotal({ hp: 1, atk: 2, def: 3, spd: 4 })).toBe(10)
  })
})
