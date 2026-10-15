/**
 * v3.1 第二章单元测试：钓鱼规则、湖畔遭遇表、徽记加成、章节收尾、存档补齐、新物种、湖畔地图
 * 用例编号对应 docs/v3.1-test-cases.md 的 U-01 ~ U-22。
 * @author zjh
 * @date 2026-10-15
 */

import { describe, expect, it } from 'vitest'
import { MOVES, SPECIES, createCreature, type CreatureInstance } from '../src/game/data/creatures'
import { chapterEndFor } from '../src/game/data/chapters'
import { ENCOUNTERS, tableFor } from '../src/game/data/encounters'
import { MAPS, isSolid, resolveTile, visibleNpcs } from '../src/game/data/maps'
import { migrateChapters } from '../src/game/state/saveMigrate'
import { badgePowerMod, calcDamage } from '../src/game/systems/BattleCalc'
import { startBattle } from '../src/game/systems/BattleLogic'
import { pickEncounter, type EncounterContext } from '../src/game/systems/Encounter'
import { FISHING, canFishAt, judgeReel, rodKindOf, rollBiteDelay } from '../src/game/systems/Fishing'
import { seeded } from './helpers'

const lake = MAPS.lake
const none = () => false
const all = () => true

/** 内存版旗标 / 背包，模拟 GameState */
function fakeStore(flags: Record<string, boolean> = {}, bag: Record<string, number> = {}) {
  return {
    flags,
    bag,
    getFlag: (k: string) => flags[k],
    setFlag: (k: string, v: boolean = true) => void (flags[k] = v),
    clearFlag: (k: string) => void delete flags[k],
    itemCount: (id: string) => bag[id] ?? 0,
    addItem: (id: string, n = 1) => void (bag[id] = (bag[id] ?? 0) + n),
  }
}

function mk(speciesId: string, level = 30): CreatureInstance {
  const c = createCreature(speciesId, level, { rng: seeded(3), nature: 'calm' })
  c.abilityId = 'none'
  return c
}

/** 抽 n 次，返回出现过的物种与等级范围 */
function sample(source: 'rod' | 'goodRod' | 'ice', n = 1000) {
  const table = tableFor(ENCOUNTERS.lake, source)!
  const ctx: EncounterContext = {
    table,
    weather: null,
    night: false,
    leadLevel: 15,
    leadAbility: 'none',
    stepsSince: 10,
    lureActive: false,
    repelActive: false,
    caught: [],
    rarePity: 0,
  }
  const rng = seeded(42)
  const species = new Set<string>()
  let min = 99
  let max = 0
  for (let i = 0; i < n; i++) {
    const p = pickEncounter(ctx, rng)!
    species.add(p.speciesId)
    // 强壮个体 +2 级，按原始等级统计
    const lv = p.strong ? p.level - 2 : p.level
    min = Math.min(min, lv)
    max = Math.max(max, lv)
  }
  return { species, min, max }
}

describe('钓鱼规则', () => {
  it('U-01 钓竿优先级：好钓竿 > 旧钓竿 > 没有', () => {
    expect(rodKindOf((id) => (id === 'old_rod' ? 1 : 0))).toBe('rod')
    expect(rodKindOf(() => 1)).toBe('goodRod')
    expect(rodKindOf(() => 0)).toBeNull()
  })

  it('U-02 咬钩等待 1~3 秒', () => {
    expect(rollBiteDelay(() => 0)).toBe(FISHING.biteMinMs)
    expect(rollBiteDelay(() => 0.9999)).toBeLessThanOrEqual(FISHING.biteMaxMs)
    expect(rollBiteDelay(() => 0.5)).toBe(2000)
  })

  it('U-03 ~ U-06 收竿判定：太早 / 上钩 / 85% 门槛 / 超出窗口', () => {
    expect(judgeReel(-1)).toBe('early')
    expect(judgeReel(300, () => 0.5)).toBe('hooked')
    expect(judgeReel(300, () => 0.9)).toBe('escaped')
    expect(judgeReel(FISHING.windowMs + 1, () => 0)).toBe('escaped')
  })

  it('U-07 只能对水面下竿；未搭的浮桥算水面，搭好后不算', () => {
    expect(canFishAt(lake, 6, 7, none)).toBe(true)
    expect(canFishAt(lake, 9, 12, none)).toBe(false)
    expect(canFishAt(lake, 10, 5, none)).toBe(true)
    expect(canFishAt(lake, 10, 5, all)).toBe(false)
  })
})

describe('湖畔遭遇表', () => {
  it('U-08 旧钓竿：泡泡鱼 / 雾泉螈，Lv 12~15', () => {
    const r = sample('rod')
    expect([...r.species].sort()).toEqual(['bubblefin', 'mistnewt'])
    expect(r.min).toBeGreaterThanOrEqual(12)
    expect(r.max).toBeLessThanOrEqual(15)
  })

  it('U-09 好钓竿：珊冠鱼 / 澜鳍螈 / 碧波龟，Lv 16~20', () => {
    const r = sample('goodRod')
    expect([...r.species].sort()).toEqual(['coralfin', 'tideback', 'wavefin'])
    expect(r.min).toBeGreaterThanOrEqual(16)
    expect(r.max).toBeLessThanOrEqual(20)
  })

  it('U-10 冰面只有霜粒鹅，Lv 14~17', () => {
    const r = sample('ice', 300)
    expect([...r.species]).toEqual(['frostgoose'])
    expect(r.min).toBeGreaterThanOrEqual(14)
    expect(r.max).toBeLessThanOrEqual(17)
  })
})

describe('徽记加成', () => {
  const player = mk('flarehorn')
  const enemy = mk('flarehorn')
  const s = startBattle([player], [enemy], 'trainer', { badges: ['flame'] })

  it('U-11 玩家方焰招式 + 焰之徽记 ×1.1', () => {
    expect(badgePowerMod(s, player, MOVES.ember_spit)).toBeCloseTo(1.1)
    const plain = startBattle([player], [enemy], 'trainer')
    const mid = () => 0.5
    const a = calcDamage(s, player, enemy, MOVES.ember_spit, mid).dmg
    const b = calcDamage(plain, player, enemy, MOVES.ember_spit, mid).dmg
    expect(a / b).toBeCloseTo(1.1, 1)
  })

  it('U-12 敌方不享受徽记', () => {
    expect(badgePowerMod(s, enemy, MOVES.ember_spit)).toBe(1)
  })

  it('U-13 其他属性招式不加成', () => {
    expect(badgePowerMod(s, player, MOVES.splash)).toBe(1)
  })
})

describe('章节收尾', () => {
  it('U-14 熔鬃狮：第一章完 + 焰之徽记，不进结局', () => {
    const end = chapterEndFor('boss_beaten')!
    expect(end.card?.title).toContain('第一章完')
    expect(end.badge).toBe('flame')
    expect(end.unlockFlags).toContain('lake_unlocked')
    expect(end.ending).toBe(false)
  })

  it('U-15 沧澜鲸：潮之徽记 + 好钓竿，进入结局', () => {
    const end = chapterEndFor('whale_beaten')!
    expect(end.badge).toBe('tide')
    expect(end.items).toContain('good_rod')
    expect(end.ending).toBe(true)
  })

  it('U-16 普通训练家不是章节收尾', () => {
    expect(chapterEndFor('hiker_beaten')).toBeNull()
    expect(chapterEndFor(undefined)).toBeNull()
  })
})

describe('存档补齐', () => {
  it('U-17 已击败熔鬃狮的旧存档补发徽记与解锁', () => {
    const st = fakeStore({ boss_beaten: true })
    const notes = migrateChapters(st)
    expect(st.flags).toMatchObject({ chapter1_done: true, badge_flame: true, lake_unlocked: true })
    expect(notes.length).toBeGreaterThan(0)
  })

  it('U-18 重复执行结果一致，不重复发道具', () => {
    const st = fakeStore({ boss_beaten: true, whale_beaten: true })
    migrateChapters(st)
    const second = migrateChapters(st)
    expect(st.bag.good_rod).toBe(1)
    expect(second).toEqual([])
  })

  it('U-19 新存档不写任何旗标；连战打一半会回滚', () => {
    const fresh = fakeStore()
    migrateChapters(fresh)
    expect(fresh.flags).toEqual({})
    const half = fakeStore({ scout1_beaten: true })
    migrateChapters(half)
    expect(half.flags.scout1_beaten).toBeUndefined()
  })
})

describe('新物种与湖畔地图', () => {
  it('U-20 新物种数据完整，进化链正确', () => {
    for (const id of ['bubblefin', 'coralfin', 'tidewhale', 'frostgoose', 'icecrown']) {
      const sp = SPECIES[id]
      expect(sp, id).toBeDefined()
      for (const l of sp.learnset) expect(MOVES[l.moveId], `${id}:${l.moveId}`).toBeDefined()
    }
    expect(SPECIES.bubblefin).toMatchObject({ evolvesTo: 'coralfin', evolveLevel: 16 })
    expect(SPECIES.frostgoose).toMatchObject({ evolvesTo: 'icecrown', evolveLevel: 22 })
    expect(SPECIES.tidewhale.catchRate).toBe(0)
  })

  it('U-21 湖畔地图：传送点可走、NPC 不在实心格', () => {
    expect(lake.tiles.length).toBe(lake.width * lake.height)
    for (const w of lake.warps) expect(resolveTile(lake, w.x, w.y, all)).toBe('warp')
    for (const n of lake.npcs) {
      const k = resolveTile(lake, n.x, n.y, all)!
      // 沧澜鲸浮在湖面上，其余 NPC 都要站在可走格
      if (n.id !== 'whale') expect(isSolid(k), n.id).toBe(false)
    }
    const meadowToLake = MAPS.meadow.warps.filter((w) => w.targetMap === 'lake')
    expect(meadowToLake).toHaveLength(2)
    for (const w of meadowToLake) expect(isSolid(resolveTile(lake, w.targetX, w.targetY, all)!)).toBe(false)
  })

  it('U-22 浮桥与 NPC 随剧情旗标切换', () => {
    expect(resolveTile(lake, 10, 5, none)).toBe('water')
    expect(resolveTile(lake, 10, 5, (k) => k === 'bridge_open')).toBe('bridge')
    const ids = (f: (k: string) => boolean) => visibleNpcs(lake, f).map((n) => n.id)
    expect(ids(none)).not.toContain('scout1')
    expect(ids((k) => k === 'lake_first_fish')).toContain('scout2')
    expect(ids((k) => k === 'lake_first_fish' || k === 'bridge_open')).not.toContain('scout1')
    expect(ids((k) => k === 'bridge_open')).toContain('whale')
  })
})
