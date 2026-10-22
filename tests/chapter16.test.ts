/**
 * 异象扩充 U07～U08（回音林）
 * @author zjh
 * @date 2026-10-22
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOVES, SPECIES, UNIQUE_ORDER, createCreature } from '../src/game/data/creatures'
import { PHENOMENON_BY_ID } from '../src/game/data/phenomena'
import { calcDamage } from '../src/game/systems/BattleCalc'
import { volOf } from '../src/game/systems/BattleCore'
import { playerFight, startBattle } from '../src/game/systems/BattleLogic'
import { conditionsMet, type PhenomenonEnv } from '../src/game/systems/Phenomenon'
import { DAY_STEPS, FULL_MOON_EVERY, createWorld, dayOf } from '../src/game/systems/WorldClock'
import { seeded } from './helpers'

afterEach(() => vi.restoreAllMocks())

const tiles = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) }))

function env(): PhenomenonEnv {
  return { hasFlag: () => true, unlockedMaps: ['forest'], openTiles: () => tiles }
}

describe('异象扩充 U07～U08', () => {
  it('F-01 千羽鸮与树灵童数据齐备', () => {
    expect(SPECIES.plumeowl.dexNo).toBe('U07')
    expect(SPECIES.treesprite.dexNo).toBe('U08')
    expect(PHENOMENON_BY_ID.bird_migration.uniqueSpeciesId).toBe('plumeowl')
    expect(PHENOMENON_BY_ID.ancient_whisper.uniqueSpeciesId).toBe('treesprite')
    expect(UNIQUE_ORDER).toEqual(expect.arrayContaining(['plumeowl', 'treesprite']))
  })

  it('F-02 百鸟迁徙要晴天白天；古树低语要满月夜', () => {
    const w = createWorld()
    w.weatherByMap.forest = 'sunny'
    w.totalSteps = 100
    expect(conditionsMet(w, PHENOMENON_BY_ID.bird_migration, env())).toBe(true)
    w.totalSteps = 700
    expect(conditionsMet(w, PHENOMENON_BY_ID.bird_migration, env())).toBe(false)

    // 凑满月夜：day % 7 === 0 且夜间
    const moonDay = FULL_MOON_EVERY
    w.totalSteps = (moonDay - 1) * DAY_STEPS + 700
    expect(dayOf(w.totalSteps) % FULL_MOON_EVERY).toBe(0)
    expect(conditionsMet(w, PHENOMENON_BY_ID.ancient_whisper, env())).toBe(true)
    w.totalSteps = (moonDay - 1) * DAY_STEPS + 100
    expect(conditionsMet(w, PHENOMENON_BY_ID.ancient_whisper, env())).toBe(false)
  })

  it('F-03 群羽：出场速度 +1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = createCreature('puffmouse', 20, { rng: seeded(1) })
    p.abilityId = 'none'
    const e = createCreature('plumeowl', 20, { rng: seeded(2) })
    const s = startBattle([p], [e], 'wild')
    expect(volOf(s, e).stages.spd).toBe(1)
    expect(s.frames.some((f) => f.text.includes('群羽'))).toBe(true)
  })

  it('F-04 守林：叶系伤害减半', () => {
    const atk = createCreature('leafkit', 30, { rng: seeded(3) })
    atk.abilityId = 'none'
    const guard = createCreature('treesprite', 30, { rng: seeded(4) })
    const plain = { ...structuredClone(guard), uid: 'plain-clone', abilityId: 'none' }
    const s = startBattle([atk], [guard], 'wild')
    const mid = () => 0.5
    const a = calcDamage(s, atk, guard, MOVES.leaf_tap, mid).dmg
    const b = calcDamage(s, atk, plain, MOVES.leaf_tap, mid).dmg
    expect(a / b).toBeCloseTo(0.5, 1)
  })

  it('F-05 年轮：回复四成体力并防 +1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = createCreature('treesprite', 20, { rng: seeded(6) })
    p.hp = Math.floor(p.maxHp / 2)
    const e = createCreature('puffmouse', 20, { rng: seeded(7) })
    e.abilityId = 'none'
    const s = startBattle([p], [e], 'wild')
    const slot = p.moves.findIndex((m) => m.id === 'tree_ring')
    expect(slot).toBeGreaterThanOrEqual(0)
    const before = p.hp
    playerFight(s, slot)
    expect(p.hp).toBeGreaterThan(before)
    expect(volOf(s, p).stages.def).toBe(1)
  })
})
