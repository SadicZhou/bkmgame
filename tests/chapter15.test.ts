/**
 * 异象扩充 U04～U06 与异象录全收集（SP-5）
 * @author zjh
 * @date 2026-10-20
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOVES, SPECIES, UNIQUE_ORDER, createCreature } from '../src/game/data/creatures'
import { PHENOMENA, PHENOMENON_BY_ID } from '../src/game/data/phenomena'
import { rollHit } from '../src/game/systems/BattleCalc'
import { volOf } from '../src/game/systems/BattleCore'
import { playerFight, startBattle } from '../src/game/systems/BattleLogic'
import { SHINY_RATE } from '../src/game/systems/Encounter'
import { conditionsMet, type PhenomenonEnv } from '../src/game/systems/Phenomenon'
import { UNIQUE_SHINY, uniqueDexComplete } from '../src/game/systems/Postgame'
import { createWorld } from '../src/game/systems/WorldClock'
import { seeded } from './helpers'

afterEach(() => vi.restoreAllMocks())

const tiles = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) }))

function env(): PhenomenonEnv {
  return { hasFlag: () => true, unlockedMaps: ['meadow', 'pass', 'lake'], openTiles: () => tiles }
}

describe('异象扩充 U04～U06', () => {
  it('U-01 三种唯一精灵与异象条目齐备', () => {
    expect(SPECIES.rockidol.dexNo).toBe('U04')
    expect(SPECIES.mistcarp.dexNo).toBe('U05')
    expect(SPECIES.tideshark.dexNo).toBe('U06')
    expect(PHENOMENON_BY_ID.stone_awaken.uniqueSpeciesId).toBe('rockidol')
    expect(PHENOMENON_BY_ID.mist_tide.uniqueSpeciesId).toBe('mistcarp')
    expect(PHENOMENON_BY_ID.tide_reverse.uniqueSpeciesId).toBe('tideshark')
    expect(UNIQUE_ORDER).toEqual(expect.arrayContaining(['rockidol', 'mistcarp', 'tideshark']))
  })

  it('U-02 石林苏醒要沙暴；千年雾潮要雾；潮汐倒流要雨夜', () => {
    const w = createWorld()
    w.weatherByMap.pass = 'sand'
    w.weatherByMap.lake = 'fog'
    expect(conditionsMet(w, PHENOMENON_BY_ID.stone_awaken, env())).toBe(true)
    expect(conditionsMet(w, PHENOMENON_BY_ID.mist_tide, env())).toBe(true)
    w.totalSteps = 700
    w.weatherByMap.lake = 'rain'
    expect(conditionsMet(w, PHENOMENON_BY_ID.tide_reverse, env())).toBe(true)
    w.weatherByMap.lake = 'sunny'
    expect(conditionsMet(w, PHENOMENON_BY_ID.tide_reverse, env())).toBe(false)
  })

  it('U-03 不动：能力下降无效', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = createCreature('puffmouse', 20, { rng: seeded(1) })
    p.abilityId = 'none'
    p.moves[0] = { id: 'growl', pp: 40 }
    const e = createCreature('rockidol', 20, { rng: seeded(2) })
    const s = startBattle([p], [e], 'wild')
    playerFight(s, 0)
    expect(volOf(s, e).stages.atk).toBe(0)
    expect(s.frames.some((f) => f.text.includes('不动'))).toBe(true)
  })

  it('U-04 雾隐：雾天比普通防守方更难命中', () => {
    const atk = createCreature('puffmouse', 20, { rng: seeded(3) })
    atk.abilityId = 'none'
    const mist = createCreature('mistcarp', 20, { rng: seeded(4) })
    const plain = createCreature('tideback', 20, { rng: seeded(5) })
    plain.abilityId = 'none'
    const sMist = startBattle([atk], [mist], 'wild')
    sMist.weather = 'fog'
    const sPlain = startBattle([atk], [plain], 'wild')
    sPlain.weather = 'fog'
    // 雾 −5% 后：普防 0.95；雾隐再 ×0.85 → 0.8075
    expect(rollHit(sPlain, MOVES.tackle, plain, () => 0.9)).toBe(true)
    expect(rollHit(sMist, MOVES.tackle, mist, () => 0.9)).toBe(false)
    expect(rollHit(sMist, MOVES.tackle, mist, () => 0.8)).toBe(true)
  })

  it('U-05 潮歌：出场约三成令对手混乱', () => {
    let confused = 0
    const N = 80
    for (let i = 0; i < N; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(i / N)
      const p = createCreature('puffmouse', 20, { rng: seeded(i + 10) })
      p.abilityId = 'none'
      const e = createCreature('tideshark', 20, { rng: seeded(i + 20) })
      const s = startBattle([p], [e], 'wild')
      if (volOf(s, p).confused > 0) confused++
      vi.restoreAllMocks()
    }
    expect(confused).toBeGreaterThan(15)
    expect(confused).toBeLessThan(45)
  })

  it('U-06 鲛人之歌：混乱 + 自身速 +1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = createCreature('tideshark', 20, { rng: seeded(5) })
    const e = createCreature('puffmouse', 20, { rng: seeded(6) })
    e.abilityId = 'none'
    const s = startBattle([p], [e], 'wild')
    const slot = p.moves.findIndex((m) => m.id === 'siren_song')
    expect(slot).toBeGreaterThanOrEqual(0)
    // 若潮歌已在出场时触发混乱，先清零再测招式
    volOf(s, e).confused = 0
    volOf(s, p).stages.spd = 0
    playerFight(s, slot)
    expect(volOf(s, e).confused).toBeGreaterThan(0)
    expect(volOf(s, p).stages.spd).toBe(1)
  })
})

describe('异象录全收集 SP-5', () => {
  it('S-01 收齐全部异象条目才算完成', () => {
    expect(uniqueDexComplete([])).toBe(false)
    expect(uniqueDexComplete(PHENOMENA.slice(0, -1).map((d) => d.id))).toBe(false)
    expect(uniqueDexComplete(PHENOMENA.map((d) => d.id))).toBe(true)
  })

  it('S-02 全收集异色倍率 ×2', () => {
    expect(SHINY_RATE * UNIQUE_SHINY).toBeCloseTo(1 / 200)
  })
})
