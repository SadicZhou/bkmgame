/**
 * 支线 S6-2 雪人大赛
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { tickCold } from '../src/game/systems/Frost'
import {
  SNOWMAN_DONE_FLAG,
  SNOWMAN_PARTS,
  buildSnowman,
  pickSnowPart,
  snowmanPartsReady,
} from '../src/game/systems/SnowmanQuest'

describe('雪人大赛 S6-2', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('S-01 山麓有雪孩与雪人台；山上有雪球和炭', () => {
    const village = visibleNpcs(MAPS.frostvillage, () => false)
    expect(village.some((n) => n.id === 'snow_kid')).toBe(true)
    expect(village.some((n) => n.id === 'snow_pile')).toBe(true)
    const peak = visibleNpcs(MAPS.frostpeak, () => false)
    expect(peak.some((n) => n.id === 'snow_ball_spot')).toBe(true)
    expect(peak.some((n) => n.id === 'coal_eyes_spot')).toBe(true)
  })

  it('S-02 三样材料齐了才能堆，堆完得围巾', () => {
    expect(buildSnowman()).toMatchObject({ reason: expect.stringContaining('还缺') })
    for (const p of SNOWMAN_PARTS) {
      const r = pickSnowPart(p.id)
      expect('lines' in r).toBe(true)
    }
    expect(snowmanPartsReady()).toBe(true)
    const built = buildSnowman()
    expect(built).toMatchObject({ gotScarf: true })
    expect(GameState.hasFlag(SNOWMAN_DONE_FLAG)).toBe(true)
    expect(GameState.itemCount('warm_scarf')).toBe(1)
    expect(SNOWMAN_PARTS.every((p) => GameState.itemCount(p.id) === 0)).toBe(true)
  })

  it('S-03 围巾使寒冷涨速减半', () => {
    expect(tickCold(0, 0, false, false).cold).toBe(1)
    expect(tickCold(0, 0, false, true).cold).toBe(0.5)
    expect(tickCold(0, 0, true, false).cold).toBe(0.5)
  })
})
