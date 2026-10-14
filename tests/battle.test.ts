/**
 * 战斗数值与流程单元测试：克制、本系、能力阶段、状态免疫、PP、挣扎、收服加成
 * @author zjh
 * @date 2026-10-14
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOVES, createCreature, type CreatureInstance } from '../src/game/data/creatures'
import { catchChance } from '../src/game/data/items'
import { calcDamage } from '../src/game/systems/BattleCalc'
import { volOf } from '../src/game/systems/BattleCore'
import { playerFight, startBattle } from '../src/game/systems/BattleLogic'
import { stageMultiplier, tryApplyStatus } from '../src/game/systems/StatusEffects'
import { seeded } from './helpers'

/** 固定 0.5：不会心、随机系数 1.0 */
const mid = () => 0.5

function mk(speciesId: string, level = 50): CreatureInstance {
  const c = createCreature(speciesId, level, { rng: seeded(7), nature: 'calm' })
  c.abilityId = 'none'
  return c
}

afterEach(() => vi.restoreAllMocks())

describe('伤害计算', () => {
  it('效果拔群 1.5 是效果一般 0.75 的 2 倍', () => {
    const atk = mk('flarehorn')
    const leaf = mk('leafkit')
    const tide = { ...structuredClone(leaf), uid: 'tide-clone', speciesId: 'tideback' }
    const s = startBattle([atk], [leaf], 'wild')
    const move = MOVES.ember_spit
    const a = calcDamage(s, atk, leaf, move, mid).dmg
    const b = calcDamage(s, atk, tide, move, mid).dmg
    expect(a / b).toBeCloseTo(2, 1)
  })

  it('本系加成 ×1.2', () => {
    const flame = mk('flarehorn')
    const normal = { ...structuredClone(flame), uid: 'normal-clone', speciesId: 'puffmouse' }
    const def = mk('rockmite')
    const s = startBattle([flame], [def], 'wild')
    const tackle = MOVES.tackle
    const withStab = calcDamage(s, normal, def, tackle, mid).dmg
    const without = calcDamage(s, flame, def, tackle, mid).dmg
    expect(withStab / without).toBeCloseTo(1.2, 1)
  })

  it('能力阶段：+2 攻击约 ×1.5', () => {
    const atk = mk('flarehorn')
    const def = mk('rockmite')
    const s = startBattle([atk], [def], 'wild')
    const base = calcDamage(s, atk, def, MOVES.tackle, mid).dmg
    volOf(s, atk).stages.atk = 2
    const boosted = calcDamage(s, atk, def, MOVES.tackle, mid).dmg
    expect(boosted / base).toBeCloseTo(1.5, 1)
    expect(stageMultiplier(-3)).toBeCloseTo(0.57)
    expect(stageMultiplier(9)).toBe(stageMultiplier(3))
  })
})

describe('状态与 PP', () => {
  it('焰系免疫灼烧，其他属性可被灼烧且不能叠加', () => {
    const fire = mk('flarehorn')
    const leaf = mk('leafkit')
    const s = startBattle([fire], [leaf], 'wild')
    expect(tryApplyStatus(s, 'player', fire, 'burn', false)).toBe(false)
    expect(tryApplyStatus(s, 'enemy', leaf, 'burn', false)).toBe(true)
    expect(tryApplyStatus(s, 'enemy', leaf, 'paralyze', false)).toBe(false)
  })

  it('出招消耗 1 PP', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = mk('flarehorn', 10)
    const e = mk('puffmouse', 5)
    const s = startBattle([p], [e], 'wild')
    const before = p.moves[0].pp
    playerFight(s, 0)
    expect(p.moves[0].pp).toBe(before - 1)
  })

  it('PP 为 0 的技能不能用；全部耗尽后可以挣扎（自身受反伤）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = mk('flarehorn', 10)
    const e = mk('puffmouse', 10)
    p.moves.forEach((m) => (m.pp = 0))
    const s = startBattle([p], [e], 'wild')
    s.frames.length = 0
    playerFight(s, 0)
    expect(s.frames.at(-1)?.text).toContain('PP')
    const hpBefore = p.hp
    const enemyBefore = e.hp
    playerFight(s, -1)
    expect(e.hp).toBeLessThan(enemyBefore)
    expect(p.hp).toBeLessThan(hpBefore)
  })
})

describe('收服', () => {
  it('异象信物使成功率翻倍（未触顶时）', () => {
    const base = catchChance(50, 100, 1, { speciesRate: 0.4 })
    const token = catchChance(50, 100, 1, { speciesRate: 0.4, token: true })
    expect(token).toBeGreaterThan(base)
    expect(catchChance(1, 100, 99)).toBeLessThanOrEqual(0.95)
    expect(catchChance(100, 100, 0.01)).toBeGreaterThanOrEqual(0.03)
  })
})
