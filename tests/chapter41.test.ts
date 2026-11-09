/**
 * 支线 S0-1 小路的翠叶狐
 * @author zjh
 * @date 2026-11-09
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  FOX_DONE,
  FOX_FOUND,
  FOX_REWARD_COUNT,
  FOX_REWARD_ITEM,
  FOX_SPOT,
  FOX_STARTED,
  FOX_TALK_NEED,
  findLostFox,
  foxTalks,
  talkKidFox,
} from '../src/game/systems/LostFoxQuest'

describe('小路的翠叶狐 S0-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('F-01 对话三次后接取；草地出现翠叶狐', () => {
    expect(talkKidFox().kind).toBe('chat')
    expect(foxTalks()).toBe(1)
    expect(talkKidFox().kind).toBe('chat')
    expect(talkKidFox().kind).toBe('start')
    expect(GameState.hasFlag(FOX_STARTED)).toBe(true)
    expect(foxTalks()).toBe(FOX_TALK_NEED)
    const open = (k: string) => k === FOX_STARTED
    const fox = visibleNpcs(MAPS.meadow, open).find((n) => n.id === 'lost_fox')
    expect(fox).toBeTruthy()
    expect(fox?.x).toBe(FOX_SPOT.x)
    expect(fox?.y).toBe(FOX_SPOT.y)
  })

  it('F-02 找回交还得安抚信标 ×3', () => {
    for (let i = 0; i < FOX_TALK_NEED; i++) talkKidFox()
    expect('lines' in findLostFox()).toBe(true)
    expect(GameState.hasFlag(FOX_FOUND)).toBe(true)
    const before = GameState.itemCount(FOX_REWARD_ITEM)
    const r = talkKidFox()
    expect(r.kind).toBe('reward')
    expect(GameState.hasFlag(FOX_DONE)).toBe(true)
    expect(GameState.itemCount(FOX_REWARD_ITEM)).toBe(before + FOX_REWARD_COUNT)
    expect(talkKidFox().kind).toBe('done')
  })
})
