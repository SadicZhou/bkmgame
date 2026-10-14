/**
 * 世界时钟与异象单元测试：昼夜、休息、天气轮换、异象判定 / 保底 / 小目标 / 冷却 / 唯一个体复用 / 消散
 * @author zjh
 * @date 2026-10-14
 */

import { describe, expect, it } from 'vitest'
import { PHENOMENON_BY_ID, PHENOMENON_RULES } from '../src/game/data/phenomena'
import {
  collectGoalAt,
  conditionsMet,
  endPhenomenon,
  rollPhenomenon,
  startPhenomenon,
  tickPhenomenon,
  uniqueForBattle,
  type PhenomenonEnv,
} from '../src/game/systems/Phenomenon'
import { advanceClock, createWorld, dayOf, isNight, restUntil } from '../src/game/systems/WorldClock'
import { stepWorld } from '../src/game/systems/WorldTick'
import { GameState } from '../src/game/state/GameState'
import { sequence } from './helpers'

const tiles = Array.from({ length: 100 }, (_, i) => ({ x: i % 10, y: Math.floor(i / 10) }))

function env(rng: () => number = () => 0): PhenomenonEnv {
  return { hasFlag: () => true, unlockedMaps: ['meadow', 'pass'], openTiles: () => tiles, rng }
}

/** 晴朗的夜晚、刚好到判定点 */
function nightWorld() {
  const w = createWorld()
  w.totalSteps = 700
  w.outdoorSteps = 250
  w.weatherByMap.meadow = 'sunny'
  return w
}

describe('世界时钟', () => {
  it('600 步切换昼夜，1200 步一天', () => {
    expect(isNight(599)).toBe(false)
    expect(isNight(600)).toBe(true)
    expect(dayOf(1199)).toBe(1)
    expect(dayOf(1200)).toBe(2)
  })

  it('休息直接跳到下一个夜晚 / 天亮', () => {
    const w = createWorld()
    w.totalSteps = 100
    restUntil(w, 'night')
    expect(w.totalSteps).toBe(600)
    restUntil(w, 'day')
    expect(w.totalSteps).toBe(1200)
  })

  it('第 300 步重掷天气并报告变化', () => {
    const w = createWorld()
    let changed = 0
    for (let i = 0; i < 300; i++) if (advanceClock(w, true).weatherChanged) changed++
    expect(changed).toBe(1)
    expect(w.outdoorSteps).toBe(300)
  })
})

describe('异象', () => {
  it('条件：流星雨只在晴夜；花海只在晴天白天', () => {
    const w = nightWorld()
    expect(conditionsMet(w, PHENOMENON_BY_ID.meteor_shower, env())).toBe(true)
    expect(conditionsMet(w, PHENOMENON_BY_ID.flower_bloom, env())).toBe(false)
    w.weatherByMap.meadow = 'rain'
    expect(conditionsMet(w, PHENOMENON_BY_ID.meteor_shower, env())).toBe(false)
  })

  it('未通关（无旗标）时不会发生', () => {
    const w = nightWorld()
    expect(rollPhenomenon(w, { ...env(), hasFlag: () => false })).toBeNull()
  })

  it('判定失败累积保底，成功后清零', () => {
    const w = nightWorld()
    expect(rollPhenomenon(w, env(() => 0.99))).toBeNull()
    expect(w.phenomenon.pity).toBe(1)
    w.outdoorSteps = w.phenomenon.nextRollAt
    const def = rollPhenomenon(w, env(sequence(0.07, 0, 0.3, 0.6, 0.9)))
    expect(def?.id).toBe('meteor_shower')
    expect(w.phenomenon.pity).toBe(0)
    expect(w.phenomenon.goalSpots).toHaveLength(PHENOMENON_RULES.goalCount.collect)
  })

  it('拾满小目标获得信物；击倒后冷却 3 天', () => {
    const w = nightWorld()
    rollPhenomenon(w, env())
    const spots = [...w.phenomenon.goalSpots]
    let last = null
    for (const s of spots) last = collectGoalAt(w, 'meadow', s.x, s.y)
    expect(last?.tokenGained).toBe(true)
    expect(w.phenomenon.token).toBe(true)
    endPhenomenon(w, 'failed')
    expect(w.phenomenon.activeId).toBeNull()
    expect(w.phenomenon.cooldownUntilDay.meteor_shower).toBe(dayOf(w.totalSteps) + 3)
    expect(conditionsMet(w, PHENOMENON_BY_ID.meteor_shower, env())).toBe(false)
  })

  it('逃走后再遇到的是同一只唯一精灵；收服后永久结束', () => {
    const w = nightWorld()
    rollPhenomenon(w, env())
    const def = PHENOMENON_BY_ID.meteor_shower
    const a = uniqueForBattle(w, def, 20)
    const b = uniqueForBattle(w, def, 22)
    expect(b.uid).toBe(a.uid)
    expect(b.talent).toEqual(a.talent)
    expect(b.level).toBe(22)
    endPhenomenon(w, 'caught')
    expect(w.phenomenon.caught).toContain('meteor_shower')
    expect(w.phenomenon.pendingUniques.meteor_shower).toBeUndefined()
    expect(conditionsMet(w, def, env())).toBe(false)
  })

  it('异象期间所在地图天气锁定，其他地图照常重掷', () => {
    GameState.newGame('flarehorn')
    GameState.setFlag('boss_beaten')
    const w = GameState.world
    w.totalSteps = 700
    w.nextWeatherRoll = 701
    w.weatherByMap.meadow = 'sunny'
    w.phenomenon.nextRollAt = Number.MAX_SAFE_INTEGER
    w.minor.nextRollAt = Number.MAX_SAFE_INTEGER
    startPhenomenon(w, PHENOMENON_BY_ID.meteor_shower, env())
    const res = stepWorld('town', 5, 5, false)
    expect(res.clock.weatherChanged).toBe(true)
    expect(w.weatherByMap.meadow).toBe('sunny')
    expect(w.phenomenon.activeId).toBe('meteor_shower')
  })

  it('天亮后流星雨自然消散（无惩罚）', () => {
    const w = nightWorld()
    rollPhenomenon(w, env())
    w.totalSteps = 1200
    expect(tickPhenomenon(w, env())?.id).toBe('meteor_shower')
    expect(w.phenomenon.activeId).toBeNull()
    expect(w.phenomenon.cooldownUntilDay.meteor_shower).toBeUndefined()
  })
})
