/**
 * 终章「曦光」：烫脚、四音、克制失效、墨尘认输、守护战八回合
 * @author zjh
 * @date 2026-10-19
 */

import { describe, expect, it } from 'vitest'
import { calcDamage } from '../src/game/systems/BattleCalc'
import { playerFight, startBattle } from '../src/game/systems/BattleLogic'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { createCreature } from '../src/game/data/creatures'
import { MOVES } from '../src/game/data/moves'
import { heatTick, openTowerStairs, pressNote } from '../src/game/systems/Tower'

describe('终章 曦光', () => {
  it('C9-01 每 10 步烫脚，焰系首发免疫', () => {
    const mouse = createCreature('bushtail', 40)
    const before = mouse.hp
    expect(heatTick(9, [mouse])).toBeNull()
    expect(heatTick(10, [mouse])).toContain('发烫')
    expect(mouse.hp).toBeLessThan(before)
    const flame = createCreature('flarehorn', 40)
    const hp = flame.hp
    expect(heatTick(10, [flame, mouse])).toBeNull()
    expect(flame.hp).toBe(hp)
  })

  it('C9-02 四音必须按顺序，打赢并且解开才开楼梯', () => {
    const flags = new Set<string>()
    const has = (k: string) => flags.has(k)
    const set = (k: string, on = true) => (on ? flags.add(k) : flags.delete(k))
    expect(pressNote(2, has, set)).toContain('错了')
    expect(flags.size).toBe(0)
    expect(pressNote(1, has, set)).toContain('第 1 音')
    pressNote(2, has, set)
    pressNote(3, has, set)
    expect(pressNote(4, has, set)).toContain('四音齐鸣')
    set('tower_f4')
    openTowerStairs(has, (k) => flags.add(k))
    expect(has('tower_floor_4')).toBe(true)
  })

  it('C9-03 无属性场地克制失效', () => {
    const player = createCreature('flarehorn', 20)
    const foe = createCreature('sylvanfox', 20)
    const open = startBattle([player], [foe], 'wild')
    const shut = startBattle([createCreature('flarehorn', 20)], [createCreature('sylvanfox', 20)], 'wild', { neutral: true })
    const move = MOVES.ember_spit
    const normal = calcDamage(open, open.playerParty[0], open.enemyParty[0], move, () => 0.5)
    const flat = calcDamage(shut, shut.playerParty[0], shut.enemyParty[0], move, () => 0.5)
    expect(normal.mult).toBeGreaterThan(1)
    expect(flat.mult).toBe(1)
  })

  it('C9-04 夜幕鸦低于半血，墨尘认输', () => {
    const crow = createCreature('nightcrow', 50)
    crow.hp = Math.floor(crow.maxHp / 2) - 1
    const s = startBattle([createCreature('tideback', 5)], [crow], 'trainer', { surrender: true, trainerName: '墨尘' })
    playerFight(s, 0)
    expect(s.won).toBe(true)
    expect(s.over).toBe(true)
    expect(s.frames.some((f) => f.text.includes('灯灯'))).toBe(true)
  })

  it('C9-05 守护战打满 8 回合，伙伴不会倒下', () => {
    const player = createCreature('tideback', 8)
    const s = startBattle([player], [createCreature('dawnphoenix', 52)], 'trainer', { ordeal: true, trainerName: '曦焰凤' })
    let n = 0
    while (!s.over && n < 12) {
      playerFight(s, 0)
      n += 1
    }
    expect(s.won).toBe(true)
    expect(player.hp).toBeGreaterThan(0)
    expect(s.turn).toBeGreaterThan(8)
    const end = chapterEndFor('phoenix_trial')
    expect(end?.ending).toBe(true)
    const store = {
      flags: {} as Record<string, boolean>,
      getFlag(k: string) {
        return this.flags[k]
      },
      setFlag(k: string) {
        this.flags[k] = true
      },
      itemCount() {
        return 0
      },
      addItem() {},
    }
    if (end) grantChapterRewards(end, store)
    expect(store.flags.game_clear).toBe(true)
    expect(store.flags.badge_hearth).toBeUndefined()
  })
})