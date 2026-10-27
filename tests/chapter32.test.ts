/**
 * 支线 S5-2 观星之夜
 * @author zjh
 * @date 2026-10-27
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { DAY_STEPS, HALF_DAY_STEPS } from '../src/game/systems/WorldClock'
import {
  STARGAZE_DONE,
  STAR_CONSTELLATIONS,
  STAR_SCOPE,
  aimStar,
  canStargaze,
  starsFound,
} from '../src/game/systems/StargazeQuest'

/** 第 7 天满月夜 */
function fullMoonNightSteps(): number {
  return 6 * DAY_STEPS + HALF_DAY_STEPS + 10
}

describe('观星之夜 S5-2', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('S-01 拿到星图后观星台有镜筒；仅满月夜可观星', () => {
    expect(visibleNpcs(MAPS.observatory, () => false).some((n) => n.id === 'dune_telescope')).toBe(false)
    const chart = (k: string) => k === 'star_chart'
    expect(visibleNpcs(MAPS.observatory, chart).some((n) => n.id === 'dune_telescope')).toBe(true)
    GameState.setFlag('star_chart', true)
    expect(canStargaze(100)).toBe(false)
    expect(canStargaze(fullMoonNightSteps())).toBe(true)
  })

  it('S-02 找齐五座星座得观星镜', () => {
    GameState.setFlag('star_chart', true)
    GameState.world.totalSteps = fullMoonNightSteps()
    for (const s of STAR_CONSTELLATIONS) {
      expect(aimStar(s.id, 'wrong').ok).toBe(false)
      const r = aimStar(s.id, s.answer)
      expect(r.ok).toBe(true)
      if (r.ok && s !== STAR_CONSTELLATIONS[STAR_CONSTELLATIONS.length - 1]) {
        expect(r.justDone).toBe(false)
      }
    }
    expect(starsFound()).toBe(5)
    expect(GameState.hasFlag(STARGAZE_DONE)).toBe(true)
    expect(GameState.itemCount(STAR_SCOPE)).toBe(1)
    expect(canStargaze(fullMoonNightSteps())).toBe(false)
  })
})
