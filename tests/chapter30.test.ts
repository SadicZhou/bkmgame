/**
 * 支线 S8-1 一家一盏灯
 * @author zjh
 * @date 2026-10-23
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createCreature } from '../src/game/data/creatures'
import { MOVES } from '../src/game/data/moves'
import { MAPS, visibleNpcs, type NpcDef } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { WICK_CHARM_SPIRIT, calcDamage, wickCharmPowerMod } from '../src/game/systems/BattleCalc'
import { startBattle } from '../src/game/systems/BattleLogic'
import {
  HOUSES,
  HOUSE_WICK,
  LAMPS_DONE,
  WICK_CHARM,
  WICK_SPOTS,
  beginLamps,
  canDeliverLamp,
  deliverLamp,
  lampsDelivered,
  pickHouseWick,
} from '../src/game/systems/HouseLampQuest'

describe('一家一盏灯 S8-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('L-01 第八章后有灯芯筐；接任务后八处灯芯出现', () => {
    expect(visibleNpcs(MAPS.town, () => false).some((n) => n.id === 'lamp_basket')).toBe(false)
    const ch8 = (k: string) => k === 'chapter8_done'
    expect(visibleNpcs(MAPS.town, ch8).some((n) => n.id === 'lamp_basket')).toBe(true)
    beginLamps()
    const started = (k: string) => k === 'chapter8_done' || k === 'side_lamps_started'
    for (const s of WICK_SPOTS) {
      const map = MAPS[s.mapId]
      expect(visibleNpcs(map, started).some((n) => n.id === `house_wick_${s.id}`)).toBe(true)
    }
  })

  it('L-02 捡齐灯芯并送八户得灯芯饰；灵系 ×1.05', () => {
    GameState.setFlag('chapter8_done', true)
    beginLamps()
    for (const s of WICK_SPOTS) expect('lines' in pickHouseWick(s.id)).toBe(true)
    expect(GameState.itemCount(HOUSE_WICK)).toBe(8)

    for (let i = 0; i < HOUSES.length; i++) {
      const house = HOUSES[i]
      const npc = { id: house.npcIds[0], name: house.place } as NpcDef
      expect(canDeliverLamp(npc)?.id).toBe(house.id)
      const r = deliverLamp(house, house.place)
      if (i < HOUSES.length - 1) expect(r.justDone).toBe(false)
      else expect(r.justDone).toBe(true)
    }
    expect(lampsDelivered()).toBe(8)
    expect(GameState.hasFlag(LAMPS_DONE)).toBe(true)
    expect(GameState.itemCount(WICK_CHARM)).toBe(1)
    expect(GameState.itemCount(HOUSE_WICK)).toBe(0)

    const a = createCreature('wisp', 20, { rng: () => 0.5 })
    const foe = createCreature('puffmouse', 5, { rng: () => 0.5 })
    const s = startBattle([a], [foe], 'wild')
    const move = MOVES.glim_shot
    expect(wickCharmPowerMod(s, a, move)).toBe(WICK_CHARM_SPIRIT)
    const withCharm = calcDamage(s, a, foe, move, () => 0.5).dmg
    GameState.consumeItem(WICK_CHARM)
    const without = calcDamage(s, a, foe, move, () => 0.5).dmg
    expect(withCharm).toBeGreaterThan(without)
  })
})
