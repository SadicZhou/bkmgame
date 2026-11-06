/**
 * 支线 S5-1 星砂收集者
 * @author zjh
 * @date 2026-11-06
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { SPECIES } from '../src/game/data/creatures'
import { ENCOUNTERS, tableFor } from '../src/game/data/encounters'
import { GameState } from '../src/game/state/GameState'
import { entryWeight, type EncounterContext } from '../src/game/systems/Encounter'
import {
  SAND_DONE,
  SAND_POUCH,
  SAND_SPOTS,
  STAR_SAND,
  STAR_SAND_NEED,
  pickStarSand,
  sandCount,
  turnInStarSand,
} from '../src/game/systems/StarSandQuest'

describe('星砂收集者 S5-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('SS-01 星图后荒原有十处星砂点', () => {
    expect(visibleNpcs(MAPS.dunes, () => false).some((n) => n.id === 'star_sand_1')).toBe(false)
    const chart = (k: string) => k === 'star_chart'
    for (const s of SAND_SPOTS) {
      expect(visibleNpcs(MAPS.dunes, chart).some((n) => n.id === `star_sand_${s.id}`)).toBe(true)
    }
  })

  it('SS-02 交十颗得星砂袋；荒原稀有权重 ×2', () => {
    GameState.setFlag('star_chart', true)
    expect(turnInStarSand()).toMatchObject({ reason: expect.stringContaining('再找') })
    for (const s of SAND_SPOTS) expect('lines' in pickStarSand(s.id)).toBe(true)
    expect(sandCount()).toBe(STAR_SAND_NEED)
    const done = turnInStarSand()
    expect(done).toHaveProperty('reward', true)
    expect(GameState.hasFlag(SAND_DONE)).toBe(true)
    expect(GameState.itemCount(SAND_POUCH)).toBe(1)
    expect(GameState.itemCount(STAR_SAND)).toBe(0)

    const table = tableFor(ENCOUNTERS.dunes, 'grass')!
    const rare = table.grass.find((e) => SPECIES[e.speciesId].rarity === 'rare')!
    const base: EncounterContext = {
      table,
      weather: 'sunny',
      night: true,
      leadLevel: 30,
      leadAbility: 'swift',
      stepsSince: 10,
      lureActive: false,
      repelActive: false,
      caught: [],
      rarePity: 0,
    }
    const plain = entryWeight(base, rare)
    const boosted = entryWeight({ ...base, sandPouch: true }, rare)
    expect(boosted).toBe(plain * 2)
  })
})
