/**
 * v3.3 打磨：澈的纪录、雨天限定题、慢速回归的选招策略
 * 用例编号见 docs/v3.3-polish-design.md 第 5 节。
 * @author zjh
 * @date 2026-10-15
 */

import { describe, expect, it } from 'vitest'
import { pickMove } from '../src/dev/autoBattle'
import { MOVES, createCreature } from '../src/game/data/creatures'
import { ANGLER_RECORD_RATE, FISH_BASE_CM, FISH_ORDER, RAIN_CONTEST } from '../src/game/data/fishing'
import { startBattle } from '../src/game/systems/BattleLogic'
import {
  anglerRecord,
  beatsRecord,
  contestFor,
  judgeContest,
  recordCatch,
  recordFlag,
  unclaimedRecords,
  type FishStore,
} from '../src/game/systems/FishLog'

describe('澈的纪录', () => {
  it('U-01 纪录 = 基准 × 1.2，且正常体长上限（1.3 倍）可以打破', () => {
    for (const id of FISH_ORDER) {
      expect(anglerRecord(id)).toBeCloseTo(FISH_BASE_CM[id] * ANGLER_RECORD_RATE, 1)
      expect(FISH_BASE_CM[id] * 1.3).toBeGreaterThan(anglerRecord(id))
    }
  })

  it('U-02 只有超过纪录且未领奖的物种出现在待领列表', () => {
    const store: FishStore = {}
    recordCatch(store, 'bubblefin', anglerRecord('bubblefin') + 0.5)
    recordCatch(store, 'coralfin', anglerRecord('coralfin') - 1)
    recordCatch(store, 'wavefin', anglerRecord('wavefin'))
    expect(beatsRecord(store, 'bubblefin')).toBe(true)
    expect(beatsRecord(store, 'wavefin')).toBe(false)
    const flags = new Set<string>()
    expect(unclaimedRecords(store, (f) => flags.has(f))).toEqual(['bubblefin'])
    flags.add(recordFlag('bubblefin'))
    expect(unclaimedRecords(store, (f) => flags.has(f))).toEqual([])
  })
})

describe('雨天限定题', () => {
  it('U-03 雨天出题标记 rain，目标为基准 × 1.0；晴天题不带标记', () => {
    const rain = contestFor(3, ['bubblefin', 'mistnewt'], true)
    expect(rain.rain).toBe(true)
    expect(rain.minSize).toBeCloseTo(FISH_BASE_CM[rain.speciesId] * RAIN_CONTEST.targetRate, 1)
    expect(contestFor(3, ['bubblefin', 'mistnewt']).rain).toBeUndefined()
  })

  it('U-04 雨天题必须在雨中钓到才算达标', () => {
    const store: FishStore = { fishContest: contestFor(1, ['bubblefin'], true) }
    const size = 99
    expect(judgeContest(store, 1, 'bubblefin', size, 'fog')).toBe(false)
    expect(judgeContest(store, 1, 'bubblefin', size, null)).toBe(false)
    expect(judgeContest(store, 1, 'bubblefin', size, 'rain')).toBe(true)
  })

  it('U-05 普通题不限天气（兼容旧存档的题目）', () => {
    const store: FishStore = { fishContest: contestFor(1, ['bubblefin']) }
    expect(judgeContest(store, 1, 'bubblefin', 99, 'sunny')).toBe(true)
  })
})

describe('慢速回归选招', () => {
  it('U-06 优先选克制对手的高威力攻击招式，跳过 PP 为 0 的招式', () => {
    const me = createCreature('torrentshell', 20)
    const foe = createCreature('magmane', 13)
    const b = startBattle([me], [foe], 'wild')
    const i = pickMove(b)
    const m = MOVES[me.moves[i].id]
    expect(m.category).toBe('attack')
    expect(m.type).toBe('tide')

    me.moves[i].pp = 0
    const j = pickMove(b)
    expect(j).not.toBe(i)
    expect(me.moves[j].pp).toBeGreaterThan(0)
  })
})
