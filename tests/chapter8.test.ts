/**
 * v3.10 第八章「长夜」：盟友守灯、余光、守灯、初灯徽记
 * @author zjh
 * @date 2026-10-16
 */

import { describe, expect, it } from 'vitest'
import { onRoundEnd } from '../src/game/systems/AbilityHooks'
import { startBattle } from '../src/game/systems/BattleLogic'
import { beforeMove } from '../src/game/systems/StatusEffects'
import { lightAllyLamps, syncNightRelay } from '../src/game/systems/Night'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { createCreature } from '../src/game/data/creatures'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { volOf } from '../src/game/systems/BattleCore'
import { settleBattle } from '../src/game/scenes/battle/BattleSettle'
import { GameState } from '../src/game/state/GameState'
import { seeded } from './helpers'

describe('v3.10 长夜', () => {
  it('C8-01 三位盟友预先守灯，广场和钟楼仍要自己打', () => {
    const flags = new Set(['kindler_joined', 'anvil_beaten', 'twins_beaten'])
    const has = (k: string) => flags.has(k)
    const set = (k: string) => flags.add(k)
    expect(lightAllyLamps(has, set)).toEqual(['旅店', '商店', '阿禾家'])
    expect(syncNightRelay(has, set)).toBe(false)
    set('night_lamp_square')
    set('night_lamp_clock')
    expect(syncNightRelay(has, set)).toBe(true)
    const town = MAPS.town
    const night = visibleNpcs(town, (k) => k === 'night_started' || k === 'night_lamp_shop').map((n) => n.id)
    expect(night).toContain('night_lamp_square')
    expect(night).not.toContain('night_lamp_shop')
    expect(night).not.toContain('mochen')
  })

  it('C8-02 余光只愣一次；守灯在三分之一血以下抬防御', () => {
    const crow = createCreature('nightcrow', 45, { rng: seeded(1) })
    crow.abilityId = 'last_light'
    crow.hp = Math.floor(crow.maxHp / 2) - 1
    const s = startBattle([createCreature('puffmouse', 20, { rng: seeded(2) })], [crow], 'trainer')
    expect(beforeMove(s, 'enemy', crow)).toBe('skip')
    expect(beforeMove(s, 'enemy', crow)).toBe('act')
    const bear = createCreature('hearthbear', 46, { rng: seeded(3) })
    bear.hp = Math.floor(bear.maxHp / 3) - 1
    const b = startBattle([createCreature('puffmouse', 20, { rng: seeded(4) })], [bear], 'boss')
    onRoundEnd(b)
    expect(volOf(b, bear).stages.def).toBe(2)
    onRoundEnd(b)
    expect(volOf(b, bear).stages.def).toBe(2)
  })

  it('C8-03 墨尘战失败留在原地；暖灯熊发放初灯徽记', () => {
    const coins = GameState.coins
    const foe = createCreature('puffmouse', 5, { rng: seeded(5) })
    const s = startBattle([createCreature('puffmouse', 5, { rng: seeded(6) })], [foe], 'trainer')
    s.won = false
    const settled = settleBattle(s, {
      kind: 'trainer',
      enemies: [foe],
      stayOnLoss: true,
      lossFlags: ['mochen_met'],
      weather: null,
      night: true,
      returnMapId: 'town',
      returnX: 9,
      returnY: 3,
    })
    expect(GameState.getFlag('mochen_met')).toBe(true)
    expect(GameState.mapId).toBe('town')
    expect(GameState.playerX).toBe(9)
    expect(GameState.coins).toBe(coins)
    expect(settled.next).toBeUndefined()
    const end = chapterEndFor('bear_beaten')
    expect(end?.badge).toBe('hearth')
    expect(end?.card?.title).toContain('长夜')
    const store = {
      flags: {} as Record<string, boolean>,
      items: {} as Record<string, number>,
      getFlag(k: string) {
        return this.flags[k]
      },
      setFlag(k: string) {
        this.flags[k] = true
      },
      itemCount(id: string) {
        return this.items[id] ?? 0
      },
      addItem(id: string) {
        this.items[id] = (this.items[id] ?? 0) + 1
      },
    }
    grantChapterRewards(end!, store)
    expect(store.flags.badge_hearth).toBe(true)
    expect(store.flags.chapter8_done).toBe(true)
    expect(store.items.kid_lamp).toBe(1)
  })
})
