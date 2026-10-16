/**
 * v3.7 第五章「星砂」单元测试：沙暴、落雷、避雷针、落雷特性、章节奖励
 * @author zjh
 * @date 2026-10-16
 */

import { describe, expect, it } from 'vitest'
import { onRoundEnd } from '../src/game/systems/AbilityHooks'
import { startBattle } from '../src/game/systems/BattleLogic'
import {
  BOLT_SAFE,
  DUNE_GATE,
  boltPhase,
  boltStrikes,
  canChargeRod,
  healWithKindler,
  rodsLit,
  tickDuneStorm,
} from '../src/game/systems/Dunes'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { SPECIES, createCreature } from '../src/game/data/creatures'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { MAPS, isSolid, npcLines, tileAt, visibleNpcs } from '../src/game/data/maps'
import { seeded } from './helpers'

const dunes = MAPS.dunes

describe('v3.7 星砂', () => {
  it('C5-01 新伙伴可生成，雷鸣隼不可收服且会落雷', () => {
    for (const id of ['sparkpuff', 'voltbadger', 'dunefin', 'starcat']) {
      const c = createCreature(id, 28, { rng: seeded(1) })
      expect(c.moves.length, id).toBeGreaterThan(0)
    }
    const falcon = createCreature('stormfalcon', 34, { rng: seeded(2) })
    expect(falcon.abilityId).toBe('sky_bolt')
    expect(SPECIES.stormfalcon.catchRate).toBe(0)
    const puff = createCreature('sparkpuff', 30, { rng: seeded(3) })
    puff.abilityId = 'swift'
    const s = startBattle([puff], [falcon], 'boss')
    const before = s.playerParty[0].hp
    s.turn = 1
    onRoundEnd(s)
    expect(s.playerParty[0].hp).toBe(before)
    s.turn = 2
    onRoundEnd(s)
    expect(s.playerParty[0].hp).toBeLessThan(before)
    expect(s.playerParty[0].hp).toBe(before - Math.max(1, Math.floor(before / 10)))
  })

  it('C5-02 落雷四拍，沙暴满 30 步有一半几率刮起并持续 15 步', () => {
    expect(boltPhase(1)).toBe('flash')
    expect(boltPhase(2)).toBe('dark')
    expect(boltPhase(3)).toBe('dark2')
    expect(boltStrikes(4)).toBe(true)
    expect(boltStrikes(5)).toBe(false)
    let walk = 0
    let left = 0
    for (let i = 0; i < 29; i++) {
      const t = tickDuneStorm(walk, left, () => 0)
      walk = t.walk
      left = t.left
      expect(t.started).toBe(false)
    }
    const started = tickDuneStorm(walk, left, () => 0)
    expect(started.started).toBe(true)
    expect(started.left).toBe(15)
    const missed = tickDuneStorm(29, 0, () => 0.9)
    expect(missed.started).toBe(false)
    expect(missed.walk).toBe(0)
    let rest = started.left
    let ended = false
    for (let i = 0; i < 15; i++) {
      const t = tickDuneStorm(0, rest, () => 0)
      rest = t.left
      ended = t.ended
    }
    expect(ended).toBe(true)
    expect(rest).toBe(0)
  })

  it('C5-03 蓄雷瓶或雷系伙伴才能点亮避雷针，四根齐了才算打开', () => {
    expect(canChargeRod([{ speciesId: 'sparkpuff' }], false)).toBe(true)
    expect(canChargeRod([{ speciesId: 'puffmouse' }], true)).toBe(true)
    expect(canChargeRod([{ speciesId: 'puffmouse' }], false)).toBe(false)
    const bag: Record<string, boolean> = {}
    expect(rodsLit((k) => bag[k])).toBe(false)
    bag.dune_rod_1 = true
    bag.dune_rod_2 = true
    bag.dune_rod_3 = true
    expect(rodsLit((k) => bag[k])).toBe(false)
    bag.dune_rod_4 = true
    expect(rodsLit((k) => bag[k])).toBe(true)
  })

  it('C5-04 绯的暖光回复 20% 且不复活', () => {
    const a = { hp: 50, maxHp: 100 }
    const b = { hp: 0, maxHp: 40 }
    expect(healWithKindler([a, b])).toBe(1)
    expect(a.hp).toBe(70)
    expect(b.hp).toBe(0)
  })

  it('C5-05 雷鸣隼发放雷之徽记与星砂护符，并解锁荒原', () => {
    const end = chapterEndFor('falcon_beaten')!
    expect(end.badge).toBe('volt')
    expect(end.ending).toBe(false)
    expect(end.unlockFlags).toContain('chapter5_done')
    const store = {
      flags: {} as Record<string, boolean>,
      bag: {} as Record<string, number>,
      getFlag(k: string) { return this.flags[k] },
      setFlag(k: string, v: boolean = true) { this.flags[k] = v },
      itemCount(id: string) { return this.bag[id] ?? 0 },
      addItem(id: string, n = 1) { this.bag[id] = this.itemCount(id) + n },
    }
    const lines = grantChapterRewards(end, store)
    expect(lines.some((l) => l.includes('雷之徽记'))).toBe(true)
    expect(store.bag.star_charm).toBe(1)
    expect(store.flags.badge_volt).toBe(true)
    expect(chapterEndFor('rhino_beaten')?.unlockFlags).toContain('dunes_unlocked')
  })

  it('C5-06 地图：石门是墙，落雷带回安全格，绯要等避雷针，隼要等绯', () => {
    expect(tileAt(dunes, DUNE_GATE.x, DUNE_GATE.y)).toBe('wall')
    expect(isSolid(tileAt(dunes, BOLT_SAFE.x, BOLT_SAFE.y)!)).toBe(false)
    expect(tileAt(dunes, 8, 4)).toBe('path')
    expect(tileAt(MAPS.observatory, 5, 2)).toBe('floor')
    const warp = MAPS.canyon.warps.find((w) => w.targetMap === 'dunes')
    expect(warp?.requireFlag).toBe('dunes_unlocked')
    expect(tileAt(MAPS.canyon, warp!.x, warp!.y)).toBe('warp')
    const south = visibleNpcs(dunes, () => false).map((n) => n.id)
    expect(south).toContain('dune_rod_1')
    expect(south).not.toContain('kindler')
    const pit = visibleNpcs(dunes, (k) => k === 'dunes_rods_lit').map((n) => n.id)
    expect(pit).toContain('kindler')
    expect(pit).not.toContain('stormfalcon')
    const joined = visibleNpcs(dunes, (k) => k === 'dunes_rods_lit' || k === 'kindler_joined').map((n) => n.id)
    expect(joined).toContain('stormfalcon')
  })

  it('C5-07 遭遇表有电绒团，沙暴才有沙鳍鲨；回镇台词优先说第五章', () => {
    const grass = ENCOUNTERS.dunes.grass
    expect(grass.some((e) => e.speciesId === 'sparkpuff')).toBe(true)
    expect(grass.find((e) => e.speciesId === 'dunefin')?.weather).toContain('sand')
    expect(grass.find((e) => e.speciesId === 'starcat')?.time).toBe('night')
    const kid = MAPS.town.npcs.find((n) => n.id === 'kid')!
    expect(npcLines(kid, (k) => k === 'chapter5_done' || k === 'chapter4_done')[0]).toContain('星星')
  })
})
