/**
 * 支线 S3-3 迷路的小鼠
 * @author zjh
 * @date 2026-11-06
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createCreature } from '../src/game/data/creatures'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  MICE_DONE,
  MICE_FRIENDSHIP,
  MOUSE_BABIES,
  miceFound,
  pickMouseBaby,
  turnInMice,
} from '../src/game/systems/MouseQuest'

describe('迷路的小鼠 S3-3', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('M-01 林解锁后有妈妈与三只宝宝', () => {
    expect(visibleNpcs(MAPS.forest, () => false).some((n) => n.id === 'mouse_mom')).toBe(false)
    const open = (k: string) => k === 'forest_unlocked'
    expect(visibleNpcs(MAPS.forest, open).some((n) => n.id === 'mouse_mom')).toBe(true)
    for (const b of MOUSE_BABIES) {
      expect(visibleNpcs(MAPS.forest, open).some((n) => n.id === `mouse_baby_${b.id}`)).toBe(true)
    }
  })

  it('M-02 找齐三只交还得喷雾与亲密度', () => {
    GameState.setFlag('forest_unlocked', true)
    const a = createCreature('flarehorn', 10, { rng: () => 0.5 })
    const before = a.friendship
    GameState.party = [a]
    expect(turnInMice()).toMatchObject({ reason: expect.stringContaining('还差') })
    for (const b of MOUSE_BABIES) expect('lines' in pickMouseBaby(b.id)).toBe(true)
    expect(miceFound()).toBe(3)
    const done = turnInMice()
    expect(done).toMatchObject({ reward: true })
    expect(GameState.hasFlag(MICE_DONE)).toBe(true)
    expect(GameState.itemCount('super_potion')).toBe(3)
    expect(a.friendship).toBeGreaterThanOrEqual(before + MICE_FRIENDSHIP)
  })
})
