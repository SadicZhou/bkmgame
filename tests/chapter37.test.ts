/**
 * 支线 S1-2 山道夜巡
 * @author zjh
 * @date 2026-11-06
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { talentGrade } from '../src/game/systems/Talent'
import {
  FLAME_SPOTS,
  PATROL_DONE,
  PATROL_STARTED,
  flamesFound,
  makePatrolWickling,
  pickFlame,
  talkPatrolWick,
} from '../src/game/systems/NightPatrolQuest'

describe('山道夜巡 S1-2', () => {
  beforeEach(() => {
    GameState.newGame()
    GameState.world.totalSteps = 700
  })

  it('P-01 夜里有灯芯蜥；接取后出现三处火苗', () => {
    const night = (k: string) => k === '@night'
    expect(visibleNpcs(MAPS.pass, night).some((n) => n.id === 'patrol_wick')).toBe(true)
    expect(visibleNpcs(MAPS.pass, () => false).some((n) => n.id === 'patrol_wick')).toBe(false)
    expect(talkPatrolWick().kind).toBe('start')
    expect(GameState.hasFlag(PATROL_STARTED)).toBe(true)
    const open = (k: string) => k === '@night' || k === PATROL_STARTED
    for (const f of FLAME_SPOTS) {
      expect(visibleNpcs(MAPS.pass, open).some((n) => n.id === `patrol_flame_${f.id}`)).toBe(true)
    }
  })

  it('P-02 找齐三处交还得 A 级灯芯蜥', () => {
    talkPatrolWick()
    expect(pickFlame('1')).toMatchObject({ lines: expect.any(Array) })
    expect(flamesFound()).toBe(1)
    for (const f of FLAME_SPOTS) {
      if (!GameState.hasFlag(f.flag)) expect('lines' in pickFlame(f.id)).toBe(true)
    }
    expect(flamesFound()).toBe(3)
    const r = talkPatrolWick()
    expect(r.kind).toBe('reward')
    expect(GameState.hasFlag(PATROL_DONE)).toBe(true)
    const c = makePatrolWickling(() => 0.5)
    expect(['A', 'S']).toContain(talentGrade(c.talent))
    expect(
      GameState.party.some((x) => x.speciesId === 'wickling') ||
        GameState.storage.some((x) => x.speciesId === 'wickling'),
    ).toBe(true)
  })
})
