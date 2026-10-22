/**
 * 小事件「强壮群」与「训练家集会」
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it } from 'vitest'
import { MINOR_EVENTS } from '../src/game/data/phenomena'
import type { NpcDef } from '../src/game/data/maps'
import { STRONG_HERD_RATE, STRONG_RATE, pickEncounter, type EncounterContext } from '../src/game/systems/Encounter'
import { ENCOUNTERS } from '../src/game/data/encounters'
import { rematchReady, winDayKey } from '../src/game/systems/Rematch'
import { seeded } from './helpers'

function ctx(over: Partial<EncounterContext> = {}): EncounterContext {
  return {
    table: ENCOUNTERS.meadow,
    weather: null,
    night: false,
    leadLevel: 5,
    leadAbility: 'none',
    stepsSince: 10,
    lureActive: false,
    repelActive: false,
    caught: [],
    rarePity: 0,
    ...over,
  }
}

describe('强壮群与训练家集会', () => {
  it('H-01 事件定义齐备', () => {
    expect(MINOR_EVENTS.strong_herd.duration).toBe(300)
    expect(MINOR_EVENTS.gathering.desc).toContain('翻倍')
    expect(STRONG_HERD_RATE).toBe(0.4)
    expect(STRONG_RATE).toBe(0.1)
  })

  it('H-02 强壮群期间强壮个体约 40%', () => {
    const rng = seeded(21)
    let strong = 0
    const N = 8000
    for (let i = 0; i < N; i++) {
      if (pickEncounter(ctx({ strongHerd: true }), rng)!.strong) strong++
    }
    expect(strong / N).toBeGreaterThan(0.35)
    expect(strong / N).toBeLessThan(0.45)
  })

  it('H-03 集会中可忽略再战冷却', () => {
    const npc: NpcDef = {
      id: 't',
      name: 'T',
      x: 0,
      y: 0,
      color: 0,
      lines: [],
      role: 'trainer',
      defeatedKey: 't_beaten',
      rematchDays: 2,
      team: [{ speciesId: 'puffmouse', level: 10 }],
    }
    const flags: Record<string, boolean | number> = { t_beaten: true, [winDayKey('t_beaten')]: 10 }
    const get = (k: string) => flags[k]
    expect(rematchReady(npc, get, 10)).toBe(false)
    expect(rematchReady(npc, get, 10, true)).toBe(true)
  })
})
