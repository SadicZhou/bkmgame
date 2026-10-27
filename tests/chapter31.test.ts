/**
 * 支线 S5-3 沙丘商队
 * @author zjh
 * @date 2026-10-27
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  CARAVAN_ACTIVE,
  CARAVAN_DONE,
  CARAVAN_NEED,
  CARAVAN_STOCK,
  beginCaravan,
  caravanStormsDone,
  makeCaravanFoe,
  noteCaravanStormEnd,
} from '../src/game/systems/CaravanQuest'
import { DUNE_FLAGS } from '../src/game/systems/Dunes'

describe('沙丘商队 S5-3', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('C-01 荒原解锁后南侧有商队队长', () => {
    expect(visibleNpcs(MAPS.dunes, () => false).some((n) => n.id === 'dune_caravan')).toBe(false)
    const unlocked = (k: string) => k === DUNE_FLAGS.unlocked
    expect(visibleNpcs(MAPS.dunes, unlocked).some((n) => n.id === 'dune_caravan')).toBe(true)
  })

  it('C-02 沙暴中接护送，三场沙暴结束完成；商店货架齐', () => {
    expect(beginCaravan()).toMatchObject({ reason: expect.stringContaining('沙暴') })
    GameState.setFlag('dune_storm', 5)
    const start = beginCaravan()
    expect(start).toHaveProperty('lines')
    expect(GameState.hasFlag(CARAVAN_ACTIVE)).toBe(true)

    expect(noteCaravanStormEnd()).toEqual({ count: 1, justDone: false })
    expect(noteCaravanStormEnd()).toEqual({ count: 2, justDone: false })
    expect(noteCaravanStormEnd()).toEqual({ count: 3, justDone: true })
    expect(caravanStormsDone()).toBe(CARAVAN_NEED)
    expect(GameState.hasFlag(CARAVAN_DONE)).toBe(true)
    expect(GameState.hasFlag(CARAVAN_ACTIVE)).toBe(false)
    expect(noteCaravanStormEnd()).toBeNull()

    const foe = makeCaravanFoe(() => 0)
    expect(foe.speciesId).toBe('dunefin')
    expect(CARAVAN_STOCK.map((s) => s.id)).toEqual(['pp_honey', 'talent_fruit'])
  })
})
