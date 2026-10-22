/**
 * 支线 S6-3 望的纸灯
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  HEART_LAMP,
  LAMP_PARTS,
  UNLIT_LAMP,
  WANG_LAMP_DONE,
  craftWangLamp,
  pickLampPart,
  placeWangLamp,
} from '../src/game/systems/PaperLampQuest'
import { DAY_STEPS, HALF_DAY_STEPS } from '../src/game/systems/WorldClock'

/** 第 7 天满月夜的步数 */
function fullMoonNightSteps(): number {
  return 6 * DAY_STEPS + HALF_DAY_STEPS + 10
}

describe('望的纸灯 S6-3', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('P-01 双子战后铃殿有望，峰顶有放灯台', () => {
    expect(visibleNpcs(MAPS.bellhall, () => false).some((n) => n.id === 'frost_wang')).toBe(false)
    const after = (k: string) => k === 'twins_beaten'
    expect(visibleNpcs(MAPS.bellhall, after).some((n) => n.id === 'frost_wang')).toBe(true)
    expect(visibleNpcs(MAPS.frostpeak, after).some((n) => n.id === 'wang_lamp_spot')).toBe(true)
  })

  it('P-02 三材料糊灯，满月夜放灯得心火纸灯', () => {
    GameState.setFlag('twins_beaten', true)
    expect(craftWangLamp()).toMatchObject({ reason: expect.stringContaining('还缺') })
    for (const p of LAMP_PARTS) expect('lines' in pickLampPart(p.id)).toBe(true)
    const crafted = craftWangLamp()
    expect(crafted).toHaveProperty('lines')
    expect(GameState.itemCount(UNLIT_LAMP)).toBe(1)
    expect(placeWangLamp(100)).toMatchObject({ reason: expect.stringMatching(/白天|满月/) })
    const night = HALF_DAY_STEPS + 10
    expect(placeWangLamp(night)).toMatchObject({ reason: expect.stringContaining('满月') })
    const placed = placeWangLamp(fullMoonNightSteps())
    expect(placed).toMatchObject({ done: true })
    expect(GameState.hasFlag(WANG_LAMP_DONE)).toBe(true)
    expect(GameState.itemCount(HEART_LAMP)).toBe(1)
    expect(GameState.itemCount(UNLIT_LAMP)).toBe(0)
  })
})
