/**
 * 支线 S1-1 登山客的护身符
 * @author zjh
 * @date 2026-11-09
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  AMULET_DONE,
  AMULET_GOT,
  AMULET_REWARD_COUNT,
  AMULET_REWARD_ITEM,
  AMULET_SPOT,
  AMULET_STARTED,
  pickHikerAmulet,
  talkHikerAmulet,
} from '../src/game/systems/HikerAmuletQuest'

describe('登山客的护身符 S1-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('A-01 击败峰后可接取；灰烬草出现护身符', () => {
    expect(talkHikerAmulet().kind).toBe('start')
    expect(GameState.hasFlag(AMULET_STARTED)).toBe(true)
    const open = (k: string) => k === AMULET_STARTED
    expect(visibleNpcs(MAPS.pass, open).some((n) => n.id === 'hiker_amulet_spot')).toBe(true)
    const spot = visibleNpcs(MAPS.pass, open).find((n) => n.id === 'hiker_amulet_spot')
    expect(spot?.x).toBe(AMULET_SPOT.x)
    expect(spot?.y).toBe(AMULET_SPOT.y)
  })

  it('A-02 捡符交还得强效喷雾 ×2', () => {
    talkHikerAmulet()
    expect('lines' in pickHikerAmulet()).toBe(true)
    expect(GameState.hasFlag(AMULET_GOT)).toBe(true)
    expect(GameState.itemCount('hiker_amulet')).toBe(1)
    const r = talkHikerAmulet()
    expect(r.kind).toBe('reward')
    expect(GameState.hasFlag(AMULET_DONE)).toBe(true)
    expect(GameState.itemCount('hiker_amulet')).toBe(0)
    expect(GameState.itemCount(AMULET_REWARD_ITEM)).toBe(AMULET_REWARD_COUNT)
  })
})
