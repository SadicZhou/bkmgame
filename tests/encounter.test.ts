/**
 * 遭遇系统单元测试：安全步数、干旱保底、碾压、昼夜限定、驱兽香、异色概率
 * @author zjh
 * @date 2026-10-14
 */

import { describe, expect, it } from 'vitest'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { SAFE_STEPS, encounterRate, entryWeight, pickEncounter, type EncounterContext } from '../src/game/systems/Encounter'
import { seeded } from './helpers'

function ctx(over: Partial<EncounterContext> = {}): EncounterContext {
  return {
    table: ENCOUNTERS.meadow,
    weather: null,
    night: false,
    leadLevel: 5,
    leadAbility: 'none',
    stepsSince: 10,
    lureActive: false,
    repelActive: false,
    caught: [],
    rarePity: 0,
    ...over,
  }
}

describe('遇敌概率', () => {
  it('前 3 步绝不遇敌', () => {
    for (let i = 0; i <= SAFE_STEPS; i++) expect(encounterRate(ctx({ stepsSince: i }))).toBe(0)
    expect(encounterRate(ctx({ stepsSince: SAFE_STEPS + 1 }))).toBeGreaterThan(0)
  })

  it('干旱保底最多 ×2', () => {
    const base = ENCOUNTERS.meadow.baseRate
    expect(encounterRate(ctx({ stepsSince: 10000 }))).toBeCloseTo(base * 2)
  })

  it('首发远超本地等级时遇敌减半；引兽铃 ×1.5', () => {
    const normal = encounterRate(ctx())
    expect(encounterRate(ctx({ leadLevel: 50 }))).toBeCloseTo(normal / 2)
    expect(encounterRate(ctx({ lureActive: true }))).toBeCloseTo(normal * 1.5)
  })
})

describe('物种抽取', () => {
  it('夜行物种白天权重为 0', () => {
    const moth = ENCOUNTERS.pass.grass.find((e) => e.time === 'night')
    expect(moth).toBeDefined()
    expect(entryWeight(ctx({ table: ENCOUNTERS.pass }), moth!)).toBe(0)
    expect(entryWeight(ctx({ table: ENCOUNTERS.pass, night: true }), moth!)).toBeGreaterThan(0)
  })

  it('驱兽香：比首发等级低的不会出现', () => {
    const rng = seeded(3)
    for (let i = 0; i < 200; i++) expect(pickEncounter(ctx({ repelActive: true, leadLevel: 99 }), rng)).toBeNull()
  })

  it('异色约 1/400，强壮约 10%', () => {
    const rng = seeded(11)
    let shiny = 0
    let strong = 0
    const N = 40000
    for (let i = 0; i < N; i++) {
      const p = pickEncounter(ctx(), rng)!
      if (p.shiny) shiny++
      if (p.strong) strong++
    }
    expect(shiny / N).toBeGreaterThan(1 / 800)
    expect(shiny / N).toBeLessThan(1 / 200)
    expect(strong / N).toBeGreaterThan(0.08)
    expect(strong / N).toBeLessThan(0.12)
  })
})
