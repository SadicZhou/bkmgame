/**
 * 异象扩充 U09～U10（星砂荒原）
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
import { createWorld } from '../src/game/systems/WorldClock'
import { seeded } from './helpers'

afterEach(() => vi.restoreAllMocks())

const tiles = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) }))

function env(): PhenomenonEnv {
  return { hasFlag: () => true, unlockedMaps: ['dunes'], openTiles: () => tiles }
}

describe('异象扩充 U09～U10', () => {
  it('D-01 雷角麟与蜃影狐数据齐备', () => {
    expect(SPECIES.thundercorn.dexNo).toBe('U09')
    expect(SPECIES.miragefox.dexNo).toBe('U10')
    expect(PHENOMENON_BY_ID.thunder_night.uniqueSpeciesId).toBe('thundercorn')
    expect(PHENOMENON_BY_ID.sand_mirage.uniqueSpeciesId).toBe('miragefox')
    expect(UNIQUE_ORDER).toEqual(expect.arrayContaining(['thundercorn', 'miragefox']))
  })

  it('D-02 雷暴之夜要雷雨夜；沙海蜃楼要沙暴白天', () => {
    const w = createWorld()
    w.weatherByMap.dunes = 'storm'
    w.totalSteps = 700
    expect(conditionsMet(w, PHENOMENON_BY_ID.thunder_night, env())).toBe(true)
    w.totalSteps = 100
    expect(conditionsMet(w, PHENOMENON_BY_ID.thunder_night, env())).toBe(false)

    w.weatherByMap.dunes = 'sand'
    w.totalSteps = 100
    expect(conditionsMet(w, PHENOMENON_BY_ID.sand_mirage, env())).toBe(true)
    w.totalSteps = 700
    expect(conditionsMet(w, PHENOMENON_BY_ID.sand_mirage, env())).toBe(false)
  })

  it('D-03 引雷：雷系伤害减半并攻 +1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const atk = createCreature('sparkpuff', 40, { rng: seeded(1) })
    atk.abilityId = 'none'
    atk.moves[0] = { id: 'spark', pp: 30 }
    const rod = createCreature('thundercorn', 25, { rng: seeded(2) })
    const plain = { ...structuredClone(rod), uid: 'plain-rod', abilityId: 'none' }
    const s = startBattle([atk], [rod], 'wild')
    volOf(s, atk).stages.spd = 3
    const mid = () => 0.5
    const a = calcDamage(s, atk, rod, MOVES.spark, mid).dmg
    const b = calcDamage(s, atk, plain, MOVES.spark, mid).dmg
    expect(a).toBeLessThan(b)
    expect(a * 2).toBeGreaterThanOrEqual(b - 1)
    playerFight(s, 0)
    expect(volOf(s, rod).stages.atk).toBe(1)
    expect(s.frames.some((f) => f.text.includes('引雷'))).toBe(true)
  })

  it('D-04 幻影：首击减半，第二击正常', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const atk = createCreature('puffmouse', 40, { rng: seeded(3) })
    atk.abilityId = 'none'
    atk.moves[0] = { id: 'tackle', pp: 35 }
    const fox = createCreature('miragefox', 20, { rng: seeded(4) })
    const s = startBattle([atk], [fox], 'wild')
    volOf(s, atk).stages.spd = 3
    expect(volOf(s, fox).phantomShield).toBe(true)
    const mid = () => 0.5
    const first = calcDamage(s, atk, fox, MOVES.tackle, mid).dmg
    playerFight(s, 0)
    expect(volOf(s, fox).phantomShield).toBe(false)
    expect(s.frames.some((f) => f.text.includes('化解'))).toBe(true)
    const second = calcDamage(s, atk, fox, MOVES.tackle, mid).dmg
    expect(first).toBeLessThan(second)
    expect(first * 2).toBeGreaterThanOrEqual(second - 1)
  })

  it('D-05 蜃楼：对手攻、速各 −1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = createCreature('miragefox', 20, { rng: seeded(5) })
    const e = createCreature('puffmouse', 20, { rng: seeded(6) })
    e.abilityId = 'none'
    const s = startBattle([p], [e], 'wild')
    volOf(s, p).phantomShield = false
    const slot = p.moves.findIndex((m) => m.id === 'mirage_veil')
    expect(slot).toBeGreaterThanOrEqual(0)
    playerFight(s, slot)
    expect(volOf(s, e).stages.atk).toBe(-1)
    expect(volOf(s, e).stages.spd).toBe(-1)
  })
})
