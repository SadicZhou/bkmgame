/**
 * v3.2 湖畔打磨：钓鱼记录、钓鱼大赛、条件遭遇（雾天稀有鱼 / 冰冕鹅）、湖心岛布局
 * 用例编号见 docs/v3.2-lake-polish-design.md 第 7 节。
 * @author zjh
 * @date 2026-10-15
 */

import { describe, expect, it } from 'vitest'
import { SPECIES } from '../src/game/data/creatures'
import { DECOR } from '../src/game/data/decor'
import { ENCOUNTERS, tableFor } from '../src/game/data/encounters'
import { FISH_BASE_CM, FISH_ORDER } from '../src/game/data/fishing'
import { MAPS, tileAt } from '../src/game/data/maps'
import { entryWeight, type EncounterContext } from '../src/game/systems/Encounter'
import {
  contestFor,
  contestItem,
  fishLogComplete,
  fishLogCount,
  judgeContest,
  recordCatch,
  rollFishSize,
  todayContest,
  type FishStore,
} from '../src/game/systems/FishLog'

function ctx(source: 'rod' | 'goodRod' | 'ice', over: Partial<EncounterContext> = {}): EncounterContext {
  return {
    table: tableFor(ENCOUNTERS.lake, source)!,
    weather: null,
    night: false,
    leadLevel: 20,
    leadAbility: 'none',
    stepsSince: 10,
    lureActive: false,
    repelActive: false,
    caught: [],
    rarePity: 0,
    ...over,
  }
}

const weightOf = (c: EncounterContext, id: string) => {
  const e = c.table.grass.find((x) => x.speciesId === id)!
  return entryWeight(c, e)
}

describe('钓鱼记录', () => {
  it('体长：rng=0 为基准 ×0.75，rng→1 为 ×1.3，强壮再 ×1.15', () => {
    const base = FISH_BASE_CM.coralfin
    expect(rollFishSize('coralfin', false, () => 0)).toBeCloseTo(base * 0.75, 1)
    expect(rollFishSize('coralfin', false, () => 0.9999)).toBeCloseTo(base * 1.3, 0)
    expect(rollFishSize('coralfin', true, () => 0)).toBeCloseTo(base * 0.75 * 1.15, 1)
  })

  it('T-05 登记：首次、次数累加、刷新最大体长', () => {
    const store: FishStore = {}
    expect(recordCatch(store, 'bubblefin', 15)).toEqual({ first: true, newBest: true })
    expect(recordCatch(store, 'bubblefin', 12)).toEqual({ first: false, newBest: false })
    expect(recordCatch(store, 'bubblefin', 20.5)).toEqual({ first: false, newBest: true })
    expect(store.fishLog!.bubblefin).toEqual({ count: 3, best: 20.5 })
    expect(fishLogCount(store)).toBe(1)
  })

  it('T-07 集齐 6 种才算完成', () => {
    const store: FishStore = {}
    FISH_ORDER.slice(0, 5).forEach((id) => recordCatch(store, id, 10))
    expect(fishLogComplete(store)).toBe(false)
    recordCatch(store, FISH_ORDER[5], 10)
    expect(fishLogComplete(store)).toBe(true)
  })
})

describe('钓鱼大赛', () => {
  const pool = ['bubblefin', 'mistnewt']

  it('按天轮换题目，目标 = 基准 ×1.1', () => {
    expect(contestFor(1, pool).speciesId).toBe('bubblefin')
    expect(contestFor(2, pool).speciesId).toBe('mistnewt')
    expect(contestFor(3, pool).minSize).toBeCloseTo(FISH_BASE_CM.bubblefin * 1.1, 1)
    expect(contestItem(1)).not.toBe(contestItem(2))
  })

  it('T-06 只有当天、同物种、达标体长才算；只算一次', () => {
    const store: FishStore = { fishContest: contestFor(1, pool) }
    const target = store.fishContest!.minSize
    expect(judgeContest(store, 2, 'bubblefin', 99)).toBe(false)
    expect(judgeContest(store, 1, 'mistnewt', 99)).toBe(false)
    expect(judgeContest(store, 1, 'bubblefin', target - 0.1)).toBe(false)
    expect(judgeContest(store, 1, 'bubblefin', target)).toBe(true)
    expect(judgeContest(store, 1, 'bubblefin', target + 5)).toBe(false)
    expect(todayContest(store, 1)!.done).toBe(true)
    expect(todayContest(store, 2)).toBeNull()
  })
})

describe('条件遭遇', () => {
  it('T-04 雾灯鳐只在起雾时上钩（旧钓竿 / 好钓竿）', () => {
    for (const rod of ['rod', 'goodRod'] as const) {
      expect(weightOf(ctx(rod, { weather: 'sunny' }), 'lanternray')).toBe(0)
      expect(weightOf(ctx(rod, { weather: 'rain' }), 'lanternray')).toBe(0)
      expect(weightOf(ctx(rod, { weather: 'fog' }), 'lanternray')).toBeGreaterThan(0)
    }
    expect(SPECIES.lanternray.rarity).toBe('rare')
  })

  it('T-03 冰冕鹅：需要击败沧澜鲸且在夜晚', () => {
    const whale = (k: string) => k === 'whale_beaten'
    expect(weightOf(ctx('ice', { night: true }), 'icecrown')).toBe(0)
    expect(weightOf(ctx('ice', { night: false, hasFlag: whale }), 'icecrown')).toBe(0)
    expect(weightOf(ctx('ice', { night: true, hasFlag: whale }), 'icecrown')).toBeGreaterThan(0)
  })

  it('钓鱼记录涵盖湖畔全部可钓物种', () => {
    const lake = ENCOUNTERS.lake
    const fishable = new Set([...(lake.rod ?? []), ...(lake.goodRod ?? [])].map((e) => e.speciesId))
    expect(new Set(FISH_ORDER)).toEqual(fishable)
  })
})

describe('湖心岛布局', () => {
  it('T-01 沧澜鲸在第 2 行水面上，脚下一格是可站立的湖心岛；灯台在第 3 行', () => {
    const lake = MAPS.lake
    const whale = lake.npcs.find((n) => n.id === 'whale')!
    expect([whale.x, whale.y]).toEqual([10, 2])
    expect(tileAt(lake, 10, 2)).toBe('water')
    expect(tileAt(lake, 10, 3)).not.toBe('water')
    expect(DECOR.lake.find((d) => d.key === 'decor-lighthouse')!.y).toBe(3)
  })
})
