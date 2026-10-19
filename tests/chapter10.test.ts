/**
 * 后日谈：冠军之路回血、足迹计数、满资质微光灵
 * @author zjh
 * @date 2026-10-19
 */

import { describe, expect, it } from 'vitest'
import { createCreature } from '../src/game/data/creatures'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { healThird, traceCount } from '../src/game/systems/Postgame'

describe('后日谈', () => {
  it('P-01 只回复存活伙伴的三成体力', () => {
    const live = createCreature('bushtail', 40)
    live.hp = 10
    const fainted = createCreature('flarehorn', 40)
    fainted.hp = 0
    const full = createCreature('tideback', 20)
    expect(healThird([live, fainted, full])).toBe(1)
    expect(live.hp).toBe(10 + Math.max(1, Math.floor(live.maxHp * 0.3)))
    expect(fainted.hp).toBe(0)
    expect(full.hp).toBe(full.maxHp)
  })

  it('P-02 通关后镇口出现苔，连战的人不会挡路', () => {
    const town = MAPS.town
    const before = visibleNpcs(town, () => false).map((n) => n.id)
    expect(before).not.toContain('champ_moss')
    const after = visibleNpcs(town, (k) => k === 'game_clear').map((n) => n.id)
    expect(after).toContain('champ_moss')
    expect(after).toContain('trace_mochen')
    expect(after).not.toContain('champ_mochen')
    expect(town.npcs.some((n) => n.id === 'champ_mochen' && n.chainNext === undefined && n.winItems?.includes('gold_crown'))).toBe(true)
  })

  it('P-03 五处足迹凑齐才算走完', () => {
    const flags = new Set<string>()
    expect(traceCount((k) => flags.has(k))).toBe(0)
    flags.add('trace_pass')
    flags.add('trace_lake')
    expect(traceCount((k) => flags.has(k))).toBe(2)
    const gift = createCreature('wisp', 30, { talentFloor: 20 })
    expect(gift.talent.hp).toBe(20)
    expect(gift.talent.atk).toBe(20)
  })
})