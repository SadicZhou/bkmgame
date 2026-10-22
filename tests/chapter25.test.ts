/**
 * 支线 S7-1 迷路的雏鸟
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  CHICKS,
  CHICKS_DONE_FLAG,
  carryingChick,
  chicksHomeCount,
  claimChickReward,
  deliverChickAt,
  pickChick,
} from '../src/game/systems/ChickQuest'

describe('迷路的雏鸟 S7-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('B-01 羽毛岛有鸟妈妈与四只雏鸟；各岛有空巢', () => {
    const feather = visibleNpcs(MAPS.cloudfeather, () => false)
    expect(feather.some((n) => n.id === 'cloud_chick_mom')).toBe(true)
    expect(feather.filter((n) => n.id.startsWith('cloud_chick_') && n.id !== 'cloud_chick_mom')).toHaveLength(4)
    expect(visibleNpcs(MAPS.cloudstart, () => true).some((n) => n.id === 'cloud_nest_start')).toBe(true)
    expect(visibleNpcs(MAPS.cloudmill, () => true).some((n) => n.id === 'cloud_nest_mill')).toBe(true)
    expect(visibleNpcs(MAPS.cloudbridge, () => true).some((n) => n.id === 'cloud_nest_bridge')).toBe(true)
    expect(visibleNpcs(MAPS.cloudshrine, () => true).some((n) => n.id === 'cloud_nest_shrine')).toBe(true)
  })

  it('B-02 一次只能抱一只，送到对应巢才算回家', () => {
    expect(pickChick('start').ok).toBe(true)
    expect(carryingChick()).toBe('start')
    expect(pickChick('mill').ok).toBe(false)
    expect(deliverChickAt('cloudmill')?.lines[0]).toMatch(/不肯/)
    expect(deliverChickAt('cloudstart')?.justDone).toBe(false)
    expect(GameState.hasFlag('chick_home_start')).toBe(true)
    expect(carryingChick()).toBeNull()
    expect(chicksHomeCount()).toBe(1)
  })

  it('B-03 四只送齐后鸟妈妈给技能书顺风', () => {
    for (const c of CHICKS) {
      expect(pickChick(c.id).ok).toBe(true)
      const r = deliverChickAt(c.nestMap)
      expect(r).not.toBeNull()
    }
    expect(chicksHomeCount()).toBe(4)
    const reward = claimChickReward()
    expect(reward?.gotBook).toBe(true)
    expect(GameState.hasFlag(CHICKS_DONE_FLAG)).toBe(true)
    expect(GameState.itemCount('book_tailwind')).toBe(1)
    expect(claimChickReward()).toBeNull()
  })
})
