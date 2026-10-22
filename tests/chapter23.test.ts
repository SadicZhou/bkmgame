/**
 * 支线 S7-2 云海钓鱼
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it } from 'vitest'
import { ENCOUNTERS, tableFor } from '../src/game/data/encounters'
import { ALL_FISH_ORDER, EXTRA_FISH_ORDER, FISH_BASE_CM, FISH_ORDER } from '../src/game/data/fishing'
import { MAPS, resolveTile, visibleNpcs } from '../src/game/data/maps'
import { canFishAt, rodKindOf } from '../src/game/systems/Fishing'
import { fishLogComplete, recordCatch } from '../src/game/systems/FishLog'
import { hasFishing } from '../src/game/systems/WorldTick'

describe('云海钓鱼 S7-2', () => {
  it('F-01 起风岛南缘有水面，且只有好钓竿表', () => {
    const map = MAPS.cloudstart
    expect(resolveTile(map, 3, 7, () => false)).toBe('water')
    expect(canFishAt(map, 3, 7, () => false)).toBe(true)
    expect(hasFishing('cloudstart', 'rod')).toBe(false)
    expect(hasFishing('cloudstart', 'goodRod')).toBe(true)
    const table = tableFor(ENCOUNTERS.cloudstart, 'goodRod')
    expect(table?.grass.some((e) => e.speciesId === 'cloudfin')).toBe(true)
  })

  it('F-02 云鳍鱼在额外钓点列表，不挡湖畔集齐', () => {
    expect(EXTRA_FISH_ORDER).toContain('cloudfin')
    expect(ALL_FISH_ORDER).toContain('cloudfin')
    expect(FISH_ORDER).not.toContain('cloudfin')
    expect(FISH_BASE_CM.cloudfin).toBeGreaterThan(0)
    const store = { fishLog: {} as Record<string, { count: number; best: number }> }
    for (const id of FISH_ORDER) recordCatch(store, id, 10)
    expect(fishLogComplete(store)).toBe(true)
    expect(store.fishLog.cloudfin).toBeUndefined()
  })

  it('F-03 云钓翁在起风岛；好钓竿判定优先于旧竿', () => {
    const npcs = visibleNpcs(MAPS.cloudstart, () => true)
    expect(npcs.some((n) => n.id === 'cloud_fisher')).toBe(true)
    expect(rodKindOf((id) => (id === 'good_rod' || id === 'old_rod' ? 1 : 0))).toBe('goodRod')
    expect(rodKindOf((id) => (id === 'old_rod' ? 1 : 0))).toBe('rod')
  })
})
