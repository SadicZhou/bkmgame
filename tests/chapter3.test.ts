/**
 * v3.4 第三章「回音」单元测试：四音石、羁绊、林语、章节收尾、新物种、回音林地图连通性
 * 用例编号对应 docs/v3.4-chapter3-design.md 的 U3-01 ~ U3-14。
 * @author zjh
 * @date 2026-10-15
 */

import { describe, expect, it } from 'vitest'
import { MOVES, SPECIES, createCreature, type CreatureInstance } from '../src/game/data/creatures'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { ECHO_STONES, FOREST_FLAGS, stoneLitFlag } from '../src/game/data/forestMap'
import { MAPS, isSolid, resolveTile, visibleNpcs, type HasFlag } from '../src/game/data/maps'
import { onRoundEnd } from '../src/game/systems/AbilityHooks'
import { volOf } from '../src/game/systems/BattleCore'
import { startBattle } from '../src/game/systems/BattleLogic'
import { BOND_STAGES, bondBar, bondCritBonus, bondStage, nextBondStage, tryBondEndure } from '../src/game/systems/Bond'
import { STONE_STEP_FLAG, pressStone, stoneStep } from '../src/game/systems/EchoStones'
import { seeded } from './helpers'

const forest = MAPS.forest

/** 内存版旗标 / 背包，模拟 GameState */
function fakeStore(flags: Record<string, unknown> = {}, bag: Record<string, number> = {}) {
  return {
    flags,
    bag,
    getFlag: (k: string) => flags[k],
    setFlag: (k: string, v: boolean | number = true) => void (flags[k] = v),
    clearFlag: (k: string) => void delete flags[k],
    itemCount: (id: string) => bag[id] ?? 0,
    addItem: (id: string, n = 1) => void (bag[id] = (bag[id] ?? 0) + n),
  }
}

function mk(speciesId: string, level = 30, friendship = 0): CreatureInstance {
  const c = createCreature(speciesId, level, { rng: seeded(5), nature: 'calm' })
  c.abilityId = 'none'
  c.friendship = friendship
  return c
}

/**
 * 从出生点出发、按当前旗标（可见 NPC 视为障碍）能走到的格子
 * @author zjh
 * @date 2026-10-15
 */
function reachable(flags: string[]): Set<string> {
  const has: HasFlag = (k) => flags.includes(k)
  const blocked = new Set(visibleNpcs(forest, has).map((n) => `${n.x},${n.y}`))
  const seen = new Set<string>()
  const queue = [forest.spawn]
  while (queue.length) {
    const { x, y } = queue.shift()!
    const key = `${x},${y}`
    if (seen.has(key)) continue
    const k = resolveTile(forest, x, y, has)
    if (!k || isSolid(k) || blocked.has(key)) continue
    seen.add(key)
    queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 })
  }
  return seen
}

/** 是否能站到某格旁边与其对话 */
function canTalk(seen: Set<string>, x: number, y: number): boolean {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`))
}

describe('四音石', () => {
  it('U3-01 按「大地 → 流水 → 林叶 → 飞鸟」敲响，第四块解开谜题', () => {
    const st = fakeStore()
    expect(ECHO_STONES.map((s) => s.id)).toEqual(['earth', 'water', 'leaf', 'bird'])
    expect(pressStone(st, 'earth')).toBe('lit')
    expect(pressStone(st, 'water')).toBe('lit')
    expect(pressStone(st, 'leaf')).toBe('lit')
    expect(stoneStep(st)).toBe(3)
    expect(pressStone(st, 'bird')).toBe('solved')
    expect(st.flags[FOREST_FLAGS.stonesSolved]).toBe(true)
    expect(pressStone(st, 'earth')).toBe('done')
  })

  it('U3-02 敲错全部熄灭、进度清零；重复敲已亮的音石不受影响', () => {
    const st = fakeStore()
    pressStone(st, 'earth')
    expect(pressStone(st, 'earth')).toBe('already')
    expect(pressStone(st, 'leaf')).toBe('wrong')
    expect(st.flags[stoneLitFlag('earth')]).toBeUndefined()
    expect(st.flags[STONE_STEP_FLAG]).toBe(0)
    expect(pressStone(st, 'earth')).toBe('lit')
  })
})

describe('羁绊系统', () => {
  it('U3-03 阶段门槛 0 / 70 / 150 / 220，下一阶段与心形条', () => {
    expect(BOND_STAGES.map((s) => s.min)).toEqual([0, 70, 150, 220])
    expect(bondStage(69).name).toBe('初识')
    expect(bondStage(70).name).toBe('熟悉')
    expect(bondStage(255).name).toBe('心火相连')
    expect(nextBondStage(150)?.name).toBe('心火相连')
    expect(nextBondStage(220)).toBeNull()
    expect(bondBar(0)).toBe('♡'.repeat(10))
    expect(bondBar(255)).toBe('♥'.repeat(10))
  })

  it('U3-04 熟悉：每场一次撑住；未开放 / 亲密度不够 / 敌方都不触发', () => {
    const p = mk('grovefox', 30, 80)
    const e = mk('grovefox', 30, 255)
    const s = startBattle([p], [e], 'trainer', { bond: true })
    expect(tryBondEndure(s, e, 999, () => 0)).toBe(false)
    expect(tryBondEndure(s, p, 999, () => 0)).toBe(true)
    expect(volOf(s, p).bondUsed).toBe(true)
    expect(tryBondEndure(s, p, 999, () => 0)).toBe(false)

    const closed = startBattle([mk('grovefox', 30, 255)], [mk('grovefox')], 'trainer')
    expect(tryBondEndure(closed, closed.playerParty[0], 999, () => 0)).toBe(false)
    const low = startBattle([mk('grovefox', 30, 69)], [mk('grovefox')], 'trainer', { bond: true })
    expect(tryBondEndure(low, low.playerParty[0], 999, () => 0)).toBe(false)
  })

  it('U3-05 信赖：会心率 +5%，只对己方', () => {
    const p = mk('grovefox', 30, 150)
    const e = mk('grovefox', 30, 255)
    const s = startBattle([p], [e], 'trainer', { bond: true })
    expect(bondCritBonus(s, p)).toBeCloseTo(0.05)
    expect(bondCritBonus(s, e)).toBe(0)
    expect(bondCritBonus(startBattle([p], [e], 'trainer'), p)).toBe(0)
  })

  it('U3-06 第三章通关才开放羁绊（BattleScene 以 chapter3_done 判定）', () => {
    expect(chapterEndFor(FOREST_FLAGS.deer)?.unlockFlags).toContain('chapter3_done')
  })
})

describe('林语', () => {
  it('U3-07 每 3 回合清空双方能力阶级，其余回合不响', () => {
    const deer = mk('echodeer', 26)
    deer.abilityId = 'forest_voice'
    const p = mk('grovefox')
    const s = startBattle([p], [deer], 'boss')
    volOf(s, p).stages.atk = 2
    volOf(s, deer).stages.def = -1
    s.turn = 2
    onRoundEnd(s)
    expect(volOf(s, p).stages.atk).toBe(2)
    s.turn = 3
    onRoundEnd(s)
    expect(volOf(s, p).stages).toEqual({ atk: 0, def: 0, spd: 0 })
    expect(volOf(s, deer).stages).toEqual({ atk: 0, def: 0, spd: 0 })
  })

  it('U3-08 场上没有林语伙伴时不触发', () => {
    const p = mk('grovefox')
    const s = startBattle([p], [mk('grovefox')], 'trainer')
    volOf(s, p).stages.atk = 2
    s.turn = 3
    onRoundEnd(s)
    expect(volOf(s, p).stages.atk).toBe(2)
  })
})

describe('章节收尾', () => {
  it('U3-09 林语鹿：第三章完 + 叶之徽记，不进结局；重复发放不重复', () => {
    const end = chapterEndFor(FOREST_FLAGS.deer)!
    expect(end.card?.title).toContain('第三章完')
    expect(end.badge).toBe('leaf')
    expect(end.ending).toBe(false)
    const st = fakeStore()
    expect(grantChapterRewards(end, st).length).toBeGreaterThan(0)
    expect(st.flags).toMatchObject({ badge_leaf: true, chapter3_done: true })
    expect(grantChapterRewards(end, st)).toEqual([])
  })

  it('U3-10 绯、巡林者不是章节收尾', () => {
    expect(chapterEndFor(FOREST_FLAGS.kindler)).toBeNull()
    expect(chapterEndFor(FOREST_FLAGS.teamBattle)).toBeNull()
  })
})

describe('新物种与遭遇表', () => {
  it('U3-11 七种新伙伴数据完整、招式存在、进化链正确', () => {
    for (const id of ['echodeer', 'echofrog', 'whirlbat', 'wisp', 'glowwisp', 'inkcrow', 'nightcrow']) {
      const sp = SPECIES[id]
      expect(sp, id).toBeDefined()
      for (const l of sp.learnset) expect(MOVES[l.moveId], `${id}:${l.moveId}`).toBeDefined()
    }
    expect(SPECIES.wisp).toMatchObject({ evolvesTo: 'glowwisp', evolveLevel: 20 })
    expect(SPECIES.inkcrow).toMatchObject({ evolvesTo: 'nightcrow', evolveLevel: 24 })
    expect(SPECIES.echodeer.catchRate).toBe(0)
  })

  it('U3-12 回音林遭遇表只引用存在的物种，夜间 / 雨天有专属', () => {
    const grass = ENCOUNTERS.forest.grass
    for (const e of grass) expect(SPECIES[e.speciesId], e.speciesId).toBeDefined()
    expect(grass.some((e) => e.time === 'night')).toBe(true)
    expect(grass.some((e) => e.speciesId === 'echofrog')).toBe(true)
  })
})

describe('回音林地图', () => {
  it('U3-13 与湖畔双向连通，出入口落点可走', () => {
    expect(forest.tiles.length).toBe(forest.width * forest.height)
    for (const w of forest.warps) {
      expect(resolveTile(forest, w.x, w.y, () => true)).toBe('warp')
      expect(isSolid(resolveTile(MAPS[w.targetMap], w.targetX, w.targetY, () => true)!)).toBe(false)
    }
    const toForest = MAPS.lake.warps.filter((w) => w.targetMap === 'forest')
    expect(toForest).toHaveLength(2)
    for (const w of toForest) {
      expect(w.requireFlag).toBe(FOREST_FLAGS.unlocked)
      expect(isSolid(resolveTile(forest, w.targetX, w.targetY, () => true)!)).toBe(false)
    }
  })

  it('U3-14 剧情顺序卡点：巡林者 → 藤蔓 → 绯 → 林语鹿，每个节点都够得着', () => {
    const { metMoss, teamBattle, stonesSolved, kindler } = FOREST_FLAGS
    const start = reachable([])
    expect(canTalk(start, 2, 25)).toBe(true)
    expect(start.has('2,21')).toBe(false)

    const met = reachable([metMoss])
    expect(canTalk(met, 7, 21)).toBe(true)
    expect(met.has('15,16')).toBe(false)

    const team = reachable([metMoss, teamBattle])
    for (const s of ECHO_STONES) expect(canTalk(team, s.x, s.y), s.id).toBe(true)
    expect(canTalk(team, 13, 11)).toBe(true)
    expect(canTalk(team, 15, 9)).toBe(true)
    expect(team.has('15,8')).toBe(false)

    const solved = reachable([metMoss, teamBattle, stonesSolved])
    expect(canTalk(solved, 15, 7)).toBe(true)
    expect(solved.has('15,5')).toBe(false)

    const open = reachable([metMoss, teamBattle, stonesSolved, kindler])
    expect(canTalk(open, 15, 4)).toBe(true)
  })
})
