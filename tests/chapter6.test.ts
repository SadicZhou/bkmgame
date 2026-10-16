/**
 * v3.8 第六章「霜铃」单元测试：寒冷、冰滑、双打、冰铃、章节奖励
 * @author zjh
 * @date 2026-10-16
 */

import { describe, expect, it } from 'vitest'
import { onRoundEnd } from '../src/game/systems/AbilityHooks'
import { startBattle, playerFight } from '../src/game/systems/BattleLogic'
import { chipCold, slideEnd, tickCold, tryPushIce, warmCold } from '../src/game/systems/Frost'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { MOVES, SPECIES, createCreature } from '../src/game/data/creatures'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { MAPS, npcLines, tileAt, visibleNpcs } from '../src/game/data/maps'
import { seeded } from './helpers'

const lake = MAPS.icelake

describe('v3.8 霜铃', () => {
  it('C6-01 新伙伴可生成，霜铃鹤会冰铃共鸣', () => {
    for (const id of ['snowbun', 'frostfox', 'frostwing']) {
      expect(createCreature(id, 30, { rng: seeded(1) }).moves.length, id).toBeGreaterThan(0)
    }
    const crane = createCreature('frostcrane', 38, { rng: seeded(2) })
    expect(crane.abilityId).toBe('bell_chime')
    expect(SPECIES.frostcrane.catchRate).toBe(0)
    const puff = createCreature('puffmouse', 30, { rng: seeded(3) })
    puff.abilityId = 'swift'
    const s = startBattle([puff], [crane], 'boss')
    crane.hp = crane.maxHp - 40
    const before = s.enemyParty[0].hp
    s.turn = 3
    onRoundEnd(s)
    expect(s.enemyParty[0].hp).toBeGreaterThan(before)
  })

  it('C6-02 寒冷涨到 100 后每 10 步掉血，篝火清零，焰系首发涨得慢', () => {
    let cold = 0
    let steps = 0
    for (let i = 0; i < 100; i++) {
      const t = tickCold(cold, steps, false)
      cold = t.cold
      steps = t.fullSteps
    }
    expect(cold).toBe(100)
    let chipped = false
    for (let i = 0; i < 10; i++) {
      const t = tickCold(cold, steps, false)
      cold = t.cold
      steps = t.fullSteps
      chipped = t.chip
    }
    expect(chipped).toBe(true)
    const mon = { hp: 100, maxHp: 100 }
    expect(chipCold([mon])).toBe(1)
    expect(mon.hp).toBe(95)
    expect(chipCold([{ hp: 1, maxHp: 100 }])).toBe(0)
    expect(warmCold().cold).toBe(0)
    expect(tickCold(0, 0, true).cold).toBe(0.5)
  })

  it('C6-03 冰面会滑到码头，冰块挡住时停在前面', () => {
    const tile = (x: number, y: number) => tileAt(lake, x, y)
    const open = slideEnd(2, 1, 1, 0, tile, () => false)
    expect(open).toEqual({ x: 5, y: 1 })
    const down = slideEnd(5, 1, 0, 1, tile, () => false)
    expect(down).toEqual({ x: 5, y: 3 })
    const blocked = slideEnd(8, 7, 1, 0, tile, (x, y) => x === 10 && y === 7)
    expect(blocked).toEqual({ x: 9, y: 7 })
    const pushed = tryPushIce(10, 7, 0, -1, () => undefined, tile, () => false)
    expect(pushed.ok).toBe(true)
    expect(pushed).toMatchObject({ nx: 10, ny: 6 })
  })

  it('C6-04 双打时第二只伙伴也会出手，暴风雪打到另一只', () => {
    const a = createCreature('puffmouse', 40, { rng: seeded(4) })
    const b = createCreature('puffmouse', 40, { rng: seeded(5) })
    const e1 = createCreature('frostgoose', 5, { rng: seeded(6) })
    const e2 = createCreature('frostgoose', 5, { rng: seeded(7) })
    const s = startBattle([a, b], [e1, e2], 'trainer', { doubles: true })
    const pp = b.moves[0].pp
    playerFight(s, 0)
    expect(b.moves[0].pp).toBe(pp - 1)
    const blizzard = createCreature('frostcrane', 50, { rng: seeded(8) })
    const slot = blizzard.moves.findIndex((m) => m.id === 'blizzard')
    expect(slot).toBeGreaterThanOrEqual(0)
    const foeA = createCreature('puffmouse', 50, { rng: seeded(9) })
    const foeB = createCreature('puffmouse', 50, { rng: seeded(10) })
    const s2 = startBattle([blizzard], [foeA, foeB], 'boss', { doubles: true })
    const hpB = s2.enemyParty[1].hp
    const acc = MOVES.blizzard.accuracy
    MOVES.blizzard.accuracy = -1
    playerFight(s2, slot)
    MOVES.blizzard.accuracy = acc
    expect(s2.enemyParty[1].hp).toBeLessThan(hpB)
  })

  it('C6-05 霜铃鹤发放霜之徽记并点亮极光，第五章解锁北山', () => {
    const end = chapterEndFor('crane_beaten')!
    expect(end.badge).toBe('frost')
    expect(end.ending).toBe(false)
    expect(end.unlockFlags).toContain('heart_aurora')
    const store = {
      flags: {} as Record<string, boolean>,
      bag: {} as Record<string, number>,
      getFlag(k: string) { return this.flags[k] },
      setFlag(k: string, v: boolean = true) { this.flags[k] = v },
      itemCount(id: string) { return this.bag[id] ?? 0 },
      addItem(id: string, n = 1) { this.bag[id] = this.itemCount(id) + n },
    }
    expect(grantChapterRewards(end, store).some((l) => l.includes('霜之徽记'))).toBe(true)
    expect(store.flags.badge_frost).toBe(true)
    expect(chapterEndFor('falcon_beaten')?.unlockFlags).toContain('frost_unlocked')
  })

  it('C6-06 地图连通，双子要等冰湖，鹤要等双子', () => {
    expect(tileAt(lake, 5, 3)).toBe('dock')
    expect(tileAt(lake, 7, 5)).toBe('dock')
    expect(tileAt(lake, 12, 7)).toBe('dock')
    expect(tileAt(lake, 10, 6)).toBe('path')
    const warp = MAPS.dunes.warps.find((w) => w.targetMap === 'frostvillage')
    expect(warp?.requireFlag).toBe('frost_unlocked')
    expect(tileAt(MAPS.dunes, warp!.x, warp!.y)).toBe('warp')
    const hall = MAPS.bellhall
    expect(visibleNpcs(hall, () => false).map((n) => n.id)).not.toContain('frost_shuo')
    expect(visibleNpcs(hall, (k) => k === 'frost_slide_solved').map((n) => n.id)).toContain('frost_shuo')
    expect(visibleNpcs(hall, (k) => k === 'twins_beaten').map((n) => n.id)).toContain('frostcrane')
    const kid = MAPS.town.npcs.find((n) => n.id === 'kid')!
    expect(npcLines(kid, (k) => k === 'chapter6_done')[0]).toContain('彩色的光')
  })

  it('C6-07 霜铃峰遭遇表有雪团兔，冰晶狐要夜里下雪', () => {
    const grass = ENCOUNTERS.frostpeak.grass
    expect(grass.find((e) => e.speciesId === 'snowbun')?.weather).toContain('snow')
    const fox = grass.find((e) => e.speciesId === 'frostfox')
    expect(fox?.time).toBe('night')
    expect(fox?.weather).toContain('snow')
  })
})
