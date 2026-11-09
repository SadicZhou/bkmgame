/**
 * 支线 S2-2 雾泉螈的蛋
 * @author zjh
 * @date 2026-11-09
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { stepWorld } from '../src/game/systems/WorldTick'
import {
  EGG_DONE,
  EGG_GOT,
  EGG_NEED_STEPS,
  EGG_STARTED,
  eggStepsLeft,
  makeEggMistnewt,
  pickMistEgg,
} from '../src/game/systems/MistEggQuest'

describe('雾泉螈的蛋 S2-2', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('E-01 击败沧澜鲸后岛上有蛋', () => {
    expect(visibleNpcs(MAPS.lake, () => false).some((n) => n.id === 'mist_egg')).toBe(false)
    const open = (k: string) => k === 'whale_beaten'
    expect(visibleNpcs(MAPS.lake, open).some((n) => n.id === 'mist_egg')).toBe(true)
    expect(pickMistEgg()).toMatchObject({ reason: expect.stringContaining('不安宁') })
    GameState.setFlag('whale_beaten', true)
    expect('lines' in pickMistEgg()).toBe(true)
    expect(GameState.hasFlag(EGG_GOT)).toBe(true)
    expect(GameState.hasFlag(EGG_STARTED)).toBe(true)
    expect(eggStepsLeft()).toBe(EGG_NEED_STEPS)
  })

  it('E-02 走满 200 步孵出雾泉螈', () => {
    GameState.setFlag('whale_beaten', true)
    pickMistEgg()
    for (let i = 0; i < EGG_NEED_STEPS - 1; i++) {
      const r = stepWorld('lake', 9, 10, null)
      expect(r.eggHatch).toBeUndefined()
    }
    expect(eggStepsLeft()).toBe(1)
    const last = stepWorld('lake', 9, 10, null)
    expect(last.eggHatch).toBeTruthy()
    expect(GameState.hasFlag(EGG_DONE)).toBe(true)
    expect(
      GameState.party.some((c) => c.speciesId === 'mistnewt') ||
        GameState.storage.some((c) => c.speciesId === 'mistnewt'),
    ).toBe(true)
    const c = makeEggMistnewt(() => 0.5)
    expect(Math.min(c.talent.hp, c.talent.atk, c.talent.def, c.talent.spd)).toBeGreaterThanOrEqual(12)
  })
})
