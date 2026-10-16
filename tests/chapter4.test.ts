/**
 * v3.6 第四章「磐谷」单元测试：推石、矿车、地鸣、章节奖励、地图连通
 * @author zjh
 * @date 2026-10-16
 */

import { describe, expect, it } from 'vitest'
import { onRoundEnd } from '../src/game/systems/AbilityHooks'
import { volOf } from '../src/game/systems/BattleCore'
import { startBattle } from '../src/game/systems/BattleLogic'
import { boulderAt, boulderBlocks, commitPush, gateOpen, resetBoulders, tryPush, wallOpened } from '../src/game/systems/Boulders'
import { effectiveSpeed } from '../src/game/systems/BattleCalc'
import { cartStop, raceGrade, routeCode, toggleSwitch } from '../src/game/systems/MineCart'
import { rockSlideReason, teachRockSlide } from '../src/game/systems/MoveBooks'
import { GameState } from '../src/game/state/GameState'
import { BOULDERS, CANYON_FLAGS, GATE, PLATES } from '../src/game/data/canyonMap'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { SPECIES, createCreature } from '../src/game/data/creatures'
import { MAPS, isSolid, tileAt, visibleNpcs } from '../src/game/data/maps'
import { seeded } from './helpers'

const canyon = MAPS.canyon
const mine = MAPS.mine

function flags() {
  const bag: Record<string, unknown> = {}
  return {
    bag,
    get: (k: string) => bag[k],
    set: (k: string, v: string) => {
      bag[k] = v
    },
  }
}

describe('v3.6 磐谷', () => {
  it('C4-01 新伙伴可生成，磐角犀不可收服且会地鸣', () => {
    for (const id of ['drillmole', 'crystalbat', 'amberling', 'shellfossil']) {
      const c = createCreature(id, 25, { rng: seeded(1) })
      expect(c.moves.length, id).toBeGreaterThan(0)
      expect(SPECIES[id].catchRate).toBeGreaterThan(0)
    }
    expect(SPECIES.ridgerhino.catchRate).toBe(0)
    expect(SPECIES.ridgerhino.hiddenAbility).toBe('stone_rumble')
  })

  it('C4-02 地鸣每 3 回合伤害非岩系', () => {
    const rhino = createCreature('ridgerhino', 30, { rng: seeded(2) })
    const fox = createCreature('grovefox', 30, { rng: seeded(3) })
    fox.abilityId = 'overgrow'
    const s = startBattle([fox], [rhino], 'boss')
    const before = s.playerParty[0].hp
    s.turn = 2
    onRoundEnd(s)
    expect(s.playerParty[0].hp).toBe(before)
    s.turn = 3
    onRoundEnd(s)
    expect(s.playerParty[0].hp).toBeLessThan(before)
    expect(s.enemyParty[0].hp).toBe(s.enemyParty[0].maxHp)
    expect(volOf(s, fox).stages.atk).toBe(0)
  })

  it('C4-03 区 1 向北两步沉进裂缝，裂缝变为可走', () => {
    const f = flags()
    const tile = (x: number, y: number) => tileAt(canyon, x, y)
    const step = (x: number, y: number) => {
      const r = tryPush(x, y, 0, -1, f.get, tile, () => false)
      expect(r.ok, `${x},${y} ${r.reason}`).toBe(true)
      commitPush(r.reason!, r, f.set)
      return r
    }
    expect(step(10, 12).sunk).toBe(false)
    expect(step(10, 11).sunk).toBe(true)
    expect(wallOpened(10, 10, f.get)).toBe(true)
    expect(boulderBlocks(10, 10, f.get)).toBe(false)
  })

  it('C4-04 两块踏板都压住才开石门', () => {
    const f = flags()
    expect(gateOpen(f.get)).toBe(false)
    f.set('boulder_z2a', `${PLATES[0].x},${PLATES[0].y}`)
    expect(gateOpen(f.get)).toBe(false)
    f.set('boulder_z2b', `${PLATES[1].x},${PLATES[1].y}`)
    expect(gateOpen(f.get)).toBe(true)
    expect(wallOpened(GATE.x, GATE.y, f.get)).toBe(true)
    expect(tileAt(canyon, GATE.x, GATE.y)).toBe('wall')
  })

  it('C4-05 复位把石头推回原位', () => {
    const f = flags()
    f.set('boulder_z1', 'sunk')
    const n = resetBoulders(f.get, f.set, () => false)
    expect(n).toBeGreaterThan(0)
    expect(boulderAt(BOULDERS[0], f.get)).toMatchObject({ x: 10, y: 12, sunk: false })
  })

  it('C4-06 矿车只有 LRL 到深处', () => {
    const f = flags()
    expect(routeCode(f.get)).toBe('LLL')
    expect(cartStop('LLL')).toBe('chest')
    expect(cartStop('RRR')).toBe('side')
    expect(cartStop('LRR')).toBe('bump')
    f.set('cart_sw2', toggleSwitch(2, f.get))
    expect(routeCode(f.get)).toBe('LRL')
    expect(cartStop(routeCode(f.get))).toBe('deep')
  })

  it('C4-07 磐角犀发放岩之徽记与旧徽章，不进结局', () => {
    const end = chapterEndFor('rhino_beaten')!
    expect(end.badge).toBe('stone')
    expect(end.ending).toBe(false)
    expect(end.unlockFlags).toContain('chapter4_done')
    const store = {
      flags: {} as Record<string, unknown>,
      bag: {} as Record<string, number>,
      getFlag(k: string) { return this.flags[k] },
      setFlag(k: string, v: boolean = true) { this.flags[k] = v },
      itemCount(id: string) { return this.bag[id] ?? 0 },
      addItem(id: string, n = 1) { this.bag[id] = this.itemCount(id) + n },
    }
    const lines = grantChapterRewards(end, store)
    expect(lines.some((l) => l.includes('岩之徽记'))).toBe(true)
    expect(store.bag.dust_badge).toBe(1)
    expect(grantChapterRewards(end, store).some((l) => l.includes('旧徽章'))).toBe(false)
  })

  it('C4-08 地图：裂缝和石门是墙，深处和大厅不相通，砧要坐对矿车才出现', () => {
    expect(tileAt(MAPS.hammer, 3, 2)).toBe('floor')
    expect(tileAt(MAPS.hammer, 11, 4)).toBe('floor')
    expect(tileAt(canyon, 10, 10)).toBe('wall')
    expect(tileAt(canyon, 10, 12)).toBe('path')
    expect(tileAt(canyon, 9, 2)).toBe('wall')
    expect(isSolid(tileAt(canyon, 6, 13)!)).toBe(false)
    expect(tileAt(MAPS.forest, 27, 6)).toBe('warp')
    expect(tileAt(mine, 15, 3)).toBe('path')
    expect(tileAt(mine, 15, 4)).toBe('wall')
    const closed = visibleNpcs(mine, () => false).map((n) => n.id)
    expect(closed).not.toContain('canyon_anvil')
    const open = visibleNpcs(mine, (k) => k === CANYON_FLAGS.deep).map((n) => n.id)
    expect(open).toContain('canyon_anvil')
    expect(open).not.toContain('ridgerhino')
  })

  it('C4-09 第三章通关解锁峡谷', () => {
    expect(chapterEndFor('deer_beaten')?.unlockFlags).toContain('canyon_unlocked')
    const warp = MAPS.forest.warps.find((w) => w.targetMap === 'canyon')
    expect(warp?.requireFlag).toBe('canyon_unlocked')
    expect(isSolid(tileAt(canyon, warp!.targetX, warp!.targetY)!)).toBe(false)
  })

  it('C4-10 矿石在路上，学徒站在地板上；岩系能从技能书学会岩崩', () => {
    for (const [x, y] of [[5, 12], [14, 12], [6, 8], [16, 8], [7, 4]] as const) {
      expect(tileAt(canyon, x, y)).toBe('path')
    }
    expect(tileAt(MAPS.hammer, 2, 3)).toBe('floor')
    expect(visibleNpcs(canyon, () => false).filter((n) => n.id.startsWith('ore_'))).toHaveLength(5)
    const pup = createCreature('pebblepup', 10, { rng: seeded(2) })
    pup.moves = pup.moves.filter((m) => m.id !== 'rock_slide').slice(0, 3)
    expect(rockSlideReason(pup)).toBeNull()
    expect(teachRockSlide(pup)).toContain('岩崩')
    expect(pup.moves.some((m) => m.id === 'rock_slide')).toBe(true)
    const leaf = createCreature('leafkit', 10, { rng: seeded(3) })
    expect(rockSlideReason(leaf)).toBe('学不会岩崩')
  })

  it('C4-11 竞速只有对的路线、步数不超过 24 才是金牌；风铃坠让己方更快', () => {
    expect(raceGrade(24, 24, 'LLL', 'LLL')).toBe('gold')
    expect(raceGrade(25, 24, 'LLL', 'LLL')).toBe('slow')
    expect(raceGrade(1, 24, 'RRR', 'LLL')).toBe('miss')
    const player = createCreature('pebblepup', 20, { rng: seeded(4) })
    const foe = createCreature('pebblepup', 20, { rng: seeded(5) })
    const battle = startBattle([player], [foe], 'wild', { rng: seeded(6) })
    GameState.consumeItem('wind_chime')
    const plain = effectiveSpeed(battle, player)
    const foePlain = effectiveSpeed(battle, foe)
    GameState.addItem('wind_chime', 1)
    expect(effectiveSpeed(battle, player)).toBeCloseTo(plain * 1.05)
    expect(effectiveSpeed(battle, foe)).toBe(foePlain)
    GameState.consumeItem('wind_chime')
  })
})
