/**
 * 异象扩充 U11～U12（极光之夜 / 日蚀）
 * @author zjh
 * @date 2026-10-22
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOVES, SPECIES, UNIQUE_ORDER, createCreature } from '../src/game/data/creatures'
import { PHENOMENA, PHENOMENON_BY_ID } from '../src/game/data/phenomena'
import { calcDamage } from '../src/game/systems/BattleCalc'
import { volOf } from '../src/game/systems/BattleCore'
import { playerFight, startBattle } from '../src/game/systems/BattleLogic'
import { conditionsMet, type PhenomenonEnv } from '../src/game/systems/Phenomenon'
import { createWorld } from '../src/game/systems/WorldClock'
import { seeded } from './helpers'

afterEach(() => vi.restoreAllMocks())

const tiles = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) }))

function env(maps = ['frostpeak', 'meadow']): PhenomenonEnv {
  return { hasFlag: () => true, unlockedMaps: maps, openTiles: () => tiles }
}

describe('异象扩充 U11～U12', () => {
  it('A-01 极光狐与蚀影数据齐备', () => {
    expect(SPECIES.aurorafox.dexNo).toBe('U11')
    expect(SPECIES.eclipsesprite.dexNo).toBe('U12')
    expect(PHENOMENON_BY_ID.aurora_night.uniqueSpeciesId).toBe('aurorafox')
    expect(PHENOMENON_BY_ID.solar_eclipse.uniqueSpeciesId).toBe('eclipsesprite')
    expect(UNIQUE_ORDER).toHaveLength(12)
    expect(UNIQUE_ORDER).toEqual(expect.arrayContaining(['aurorafox', 'eclipsesprite']))
  })

  it('A-02 极光之夜要晴夜；日蚀要白天且其余异象已收', () => {
    const w = createWorld()
    w.weatherByMap.frostpeak = 'sunny'
    w.totalSteps = 700
    expect(conditionsMet(w, PHENOMENON_BY_ID.aurora_night, env())).toBe(true)
    w.weatherByMap.frostpeak = 'snow'
    expect(conditionsMet(w, PHENOMENON_BY_ID.aurora_night, env())).toBe(false)

    w.totalSteps = 100
    w.phenomenon.caught = PHENOMENA.filter((p) => p.id !== 'solar_eclipse').map((p) => p.id)
    expect(conditionsMet(w, PHENOMENON_BY_ID.solar_eclipse, env())).toBe(true)
    w.phenomenon.caught = w.phenomenon.caught.slice(0, -1)
    expect(conditionsMet(w, PHENOMENON_BY_ID.solar_eclipse, env())).toBe(false)
    w.phenomenon.caught = PHENOMENA.filter((p) => p.id !== 'solar_eclipse').map((p) => p.id)
    w.totalSteps = 700
    expect(conditionsMet(w, PHENOMENON_BY_ID.solar_eclipse, env())).toBe(false)
  })

  it('A-03 极光幕：出场后受伤减半档，三回合后消失', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const atk = createCreature('puffmouse', 40, { rng: seeded(1) })
    atk.abilityId = 'none'
    atk.moves[0] = { id: 'tackle', pp: 35 }
    const fox = createCreature('aurorafox', 25, { rng: seeded(2) })
    const s = startBattle([atk], [fox], 'wild')
    volOf(s, atk).stages.spd = 3
    expect(volOf(s, fox).auroraTurns).toBe(3)
    const mid = () => 0.5
    const withVeil = calcDamage(s, atk, fox, MOVES.tackle, mid).dmg
    volOf(s, fox).auroraTurns = 0
    const bare = calcDamage(s, atk, fox, MOVES.tackle, mid).dmg
    expect(withVeil).toBeLessThan(bare)
    expect(withVeil / bare).toBeCloseTo(0.75, 1)
  })

  it('A-04 蚀日：非灵系招式变弱，灵系不受影响', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const spirit = createCreature('wisp', 30, { rng: seeded(3) })
    spirit.abilityId = 'none'
    spirit.moves[0] = { id: 'glim_shot', pp: 30 }
    const normal = createCreature('puffmouse', 30, { rng: seeded(4) })
    normal.abilityId = 'none'
    normal.moves[0] = { id: 'tackle', pp: 35 }
    const shadow = createCreature('eclipsesprite', 30, { rng: seeded(5) })
    const s = startBattle([spirit], [shadow], 'wild')
    expect(s.eclipseField).toBe(true)
    const mid = () => 0.5
    const spiritHit = calcDamage(s, spirit, shadow, MOVES.glim_shot, mid).dmg
    s.eclipseField = false
    const spiritBare = calcDamage(s, spirit, shadow, MOVES.glim_shot, mid).dmg
    expect(spiritHit).toBe(spiritBare)

    s.eclipseField = true
    const normHit = calcDamage(s, normal, shadow, MOVES.tackle, mid).dmg
    s.eclipseField = false
    const normBare = calcDamage(s, normal, shadow, MOVES.tackle, mid).dmg
    expect(normHit).toBeLessThan(normBare)
    expect(normHit * 10).toBeLessThanOrEqual(normBare * 9 + 2)
  })

  it('A-05 日蚀之刻会吸血', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = createCreature('eclipsesprite', 25, { rng: seeded(6) })
    p.hp = Math.floor(p.maxHp / 2)
    const e = createCreature('puffmouse', 20, { rng: seeded(7) })
    e.abilityId = 'none'
    const s = startBattle([p], [e], 'wild')
    volOf(s, p).stages.spd = 3
    const slot = p.moves.findIndex((m) => m.id === 'eclipse_hour')
    expect(slot).toBeGreaterThanOrEqual(0)
    const before = p.hp
    playerFight(s, slot)
    expect(p.hp).toBeGreaterThan(before)
  })
})
