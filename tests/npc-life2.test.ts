/**
 * v3.4.5 NPC 生活感 · 第三轮单元测试：菇菇派对支线、资质果、训练家再战、采集点日程、路人闲聊数据
 * 用例编号对应 docs/v3.4.3-npc-life-design.md §7 的 B-01 ~ B-08。
 * @author zjh
 * @date 2026-10-15
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decorBlocks } from '../src/game/data/decor'
import { ITEMS, ITEM_ORDER } from '../src/game/data/items'
import { MAPS, tileAt, visibleNpcs, type NpcDef } from '../src/game/data/maps'
import { MUSHROOMS, MUSH_FLAGS, mushCount, mushFlag } from '../src/game/data/mushrooms'
import { GameState } from '../src/game/state/GameState'
import { normalizeCreature } from '../src/game/systems/Growth'
import { rematchReady, rematchTeam, winDayKey } from '../src/game/systems/Rematch'
import { FRUIT_LIMIT, applyFruit, fruitBlock } from '../src/game/systems/Talent'
import { runStory, type StoryHost } from '../src/game/scenes/world/StoryEvents'

const forest = MAPS.forest
const ids = (flags: string[]) => visibleNpcs(forest, (k) => flags.includes(k)).map((n) => n.id)

/** 立即回调的剧情宿主：记录台词与提示 */
function fakeHost() {
  const said: string[] = []
  const toasts: string[] = []
  let refreshed = 0
  const host: StoryHost = {
    say: (lines, after) => {
      said.push(...lines)
      after?.()
    },
    healParty: () => {},
    toast: (m) => void toasts.push(m),
    refreshHud: () => {},
    playBridge: () => {},
    redraw: () => {},
    refreshNpcs: () => void refreshed++,
  }
  return { host, said, toasts, refreshes: () => refreshed }
}

describe('菇菇派对', () => {
  it('B-01 采集点：接委托前不出现；白天只见白天的菇、夜里只见发光菇；采过即消失', () => {
    const spots = (flags: string[]) => ids(flags).filter((id) => id.startsWith('mush_'))
    expect(spots([])).toEqual([])
    const day = spots([MUSH_FLAGS.quest])
    const night = spots([MUSH_FLAGS.quest, '@night'])
    expect(day).toHaveLength(4)
    expect(night).toHaveLength(4)
    expect(day.some((id) => night.includes(id))).toBe(false)
    expect(spots([MUSH_FLAGS.quest, mushFlag('redcap')])).not.toContain('mush_redcap')
    expect(spots([MUSH_FLAGS.quest, '@night', mushFlag('star')])).not.toContain('mush_star')
  })

  it('B-02 采集点与奶奶站在草地上，不压装饰、不与 NPC 重叠、不在采药人柏的巡逻线上', () => {
    const herbalist = forest.npcs.find((n) => n.id === 'forest_herbalist')!
    const patrolCells = new Set<string>()
    for (let x = herbalist.patrol![0].x; x <= herbalist.x; x++) patrolCells.add(`${x},${herbalist.y}`)
    const fixed = forest.npcs.filter((n) => !n.id.startsWith('mush_') && n.id !== 'mushroom_granny')
    const mine: NpcDef[] = forest.npcs.filter((n) => n.id.startsWith('mush_') || n.id === 'mushroom_granny')
    expect(mine).toHaveLength(9)
    const seen = new Set<string>()
    for (const n of mine) {
      const key = `${n.x},${n.y}`
      expect(tileAt(forest, n.x, n.y), n.id).toBe('grass')
      expect(decorBlocks('forest', n.x, n.y), n.id).toBe(false)
      expect(patrolCells.has(key), n.id).toBe(false)
      expect(fixed.some((o) => o.x === n.x && o.y === n.y), n.id).toBe(false)
      expect(seen.has(key), n.id).toBe(false)
      seen.add(key)
    }
  })

  it('B-03 剧情：接委托 → 采齐 8 种 → 交付得资质果与称号（只发一次）', () => {
    GameState.newGame('tideback')
    const { host, toasts, refreshes } = fakeHost()
    runStory('mushroom_granny', host, '伞灵菇老奶奶')
    expect(GameState.hasFlag(MUSH_FLAGS.quest)).toBe(true)
    expect(refreshes()).toBe(1)
    for (const m of MUSHROOMS) runStory(`mush_${m.id}`, host, m.name)
    expect(mushCount(GameState.hasFlag)).toBe(8)
    runStory('mushroom_granny', host, '伞灵菇老奶奶')
    expect(GameState.itemCount('talent_fruit')).toBe(1)
    expect(GameState.hasFlag(MUSH_FLAGS.title)).toBe(true)
    runStory('mushroom_granny', host, '伞灵菇老奶奶')
    expect(GameState.itemCount('talent_fruit')).toBe(1)
    expect(toasts.some((t) => t.includes('菇菇朋友'))).toBe(true)
  })

  it('B-04 未采齐时奶奶提示还差几种（区分白天 / 夜里）', () => {
    GameState.newGame('tideback')
    const { host, said } = fakeHost()
    runStory('mushroom_granny', host, '奶奶')
    runStory('mush_redcap', host, '红伞菇')
    said.length = 0
    runStory('mushroom_granny', host, '奶奶')
    expect(said.join('')).toContain('1/8')
    expect(said.join('')).toContain('白天的 3 种')
    expect(said.join('')).toContain('夜里的 4 种')
  })

  it('B-05 奶奶四方向行走图与 8 张菇贴图已生成', () => {
    expect(existsSync(resolve(__dirname, '../public/assets/chars/actor-mushgranny.png'))).toBe(true)
    for (const m of MUSHROOMS) expect(existsSync(resolve(__dirname, `../public/assets/props/mush-${m.id}.png`)), m.id).toBe(true)
  })
})

describe('资质果', () => {
  it('B-06 指定一项 +2、上限 20、每只最多 5 次；读档保留次数；不在商店出售', () => {
    const c = { talent: { hp: 19, atk: 10, def: 20, spd: 5 }, fruitUsed: 0 }
    expect(applyFruit(c, 'hp')).toBe(1)
    expect(c.talent.hp).toBe(20)
    expect(fruitBlock(c, 'hp')).toBeTruthy()
    expect(applyFruit(c, 'def')).toBe(0)
    for (let i = 0; i < 4; i++) applyFruit(c, 'atk')
    expect(c.talent.atk).toBe(18)
    expect(c.fruitUsed).toBe(FRUIT_LIMIT)
    expect(fruitBlock(c)).toContain('5')
    expect(applyFruit(c, 'spd')).toBe(0)

    expect(ITEMS.talent_fruit.kind).toBe('talent')
    expect(ITEM_ORDER).toContain('talent_fruit')
    expect(ITEMS.talent_fruit.price).toBe(0)
    const restored = normalizeCreature({ uid: 'x', speciesId: 'flarehorn', level: 5, hp: 10, maxHp: 10, fruitUsed: 3 })
    expect(restored.fruitUsed).toBe(3)
  })
})

describe('训练家再战', () => {
  const npc: NpcDef = { id: 't', name: 'T', x: 0, y: 0, color: 0, lines: [], role: 'trainer', defeatedKey: 't_beaten', rematchDays: 2, team: [{ speciesId: 'a', level: 15 }, { speciesId: 'b', level: 16 }] }

  it('B-07 击败后满 2 天才可再战；未击败 / 未配置不可；旧档无记录按第 0 天算', () => {
    const flags: Record<string, boolean | number> = {}
    const get = (k: string) => flags[k]
    expect(rematchReady(npc, get, 9)).toBe(false)
    flags.t_beaten = true
    expect(rematchReady(npc, get, 1)).toBe(false)
    expect(rematchReady(npc, get, 2)).toBe(true)
    flags[winDayKey('t_beaten')] = 5
    expect(rematchReady(npc, get, 6)).toBe(false)
    expect(rematchReady(npc, get, 7)).toBe(true)
    expect(rematchReady({ ...npc, rematchDays: undefined }, get, 99)).toBe(false)
    const patrols = ['ranger', 'hiker', 'lake_fisher', 'forest_herbalist']
    const all = Object.values(MAPS).flatMap((m) => m.npcs)
    for (const id of patrols) expect(all.find((n) => n.id === id)?.rematchDays, id).toBe(2)
  })

  it('B-08 再战等级：至少原等级 +3×(次数+1)，向玩家最高等级靠拢，上限 50', () => {
    expect(rematchTeam(npc.team!, 10, 0).map((m) => m.level)).toEqual([18, 19])
    expect(rematchTeam(npc.team!, 30, 0).map((m) => m.level)).toEqual([29, 30])
    expect(rematchTeam(npc.team!, 10, 2).map((m) => m.level)).toEqual([24, 25])
    expect(rematchTeam(npc.team!, 60, 0).map((m) => m.level)).toEqual([50, 50])
  })
})

describe('路人闲聊', () => {
  it('B-09 小镇路人都配了闲聊短句（每句不超过 8 个字，气泡放得下）', () => {
    for (const id of ['elder', 'kid', 'town_farmer', 'town_florist']) {
      const npc = MAPS.town.npcs.find((n) => n.id === id)!
      expect(npc.chat?.length, id).toBeGreaterThan(0)
      expect(npc.emote, id).toBeTruthy()
      for (const line of npc.chat!) expect(line.length, `${id}: ${line}`).toBeLessThanOrEqual(8)
    }
  })
})
