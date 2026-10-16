/**
 * v3.9 第七章「云阶」：风车、风道、新伙伴、风之徽记
 * @author zjh
 * @date 2026-10-16
 */

import { describe, expect, it } from 'vitest'
import { onRoundEnd } from '../src/game/systems/AbilityHooks'
import { startBattle } from '../src/game/systems/BattleLogic'
import { cloudWindEnd, toggleMill } from '../src/game/systems/Cloud'
import { chapterEndFor, grantChapterRewards } from '../src/game/data/chapters'
import { SPECIES, createCreature } from '../src/game/data/creatures'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { volOf } from '../src/game/systems/BattleCore'
import { seeded } from './helpers'

describe('v3.9 云阶', () => {
  it('C7-01 新伙伴可生成，岚翼鹏带着逆风且不能收服', () => {
    for (const id of ['chimekite', 'cloudsheep', 'cloudfin', 'galeroc']) {
      expect(createCreature(id, 36, { rng: seeded(1) }).moves.length, id).toBeGreaterThan(0)
    }
    expect(SPECIES.galeroc.catchRate).toBe(0)
    expect(createCreature('galeroc', 42, { rng: seeded(2) }).abilityId).toBe('headwind')
  })

  it('C7-02 三架风车各拨一次才算解开，再拨会改回逆风', () => {
    const flags = new Set<string>()
    const has = (k: string) => flags.has(k)
    const set = (k: string) => flags.add(k)
    const clear = (k: string) => flags.delete(k)
    expect(toggleMill('a', has, set, clear)).toBe(true)
    expect(flags.has('cloud_mills_solved')).toBe(false)
    toggleMill('b', has, set, clear)
    toggleMill('c', has, set, clear)
    expect(flags.has('cloud_mills_solved')).toBe(true)
    expect(toggleMill('b', has, set, clear)).toBe(false)
    expect(flags.has('cloud_mills_solved')).toBe(false)
  })

  it('C7-03 风道：逆风送回入口，甲乙都顺才滑到出口', () => {
    const off = () => false
    expect(cloudWindEnd(3, 3, 1, 0, off)).toEqual({ x: 3, y: 3 })
    expect(cloudWindEnd(3, 3, 0, 1, off)).toBeNull()
    const onlyA = (mill: 'a' | 'b') => mill === 'a'
    expect(cloudWindEnd(3, 3, 1, 0, onlyA)?.x).toBe(5)
    const both = () => true
    expect(cloudWindEnd(3, 3, 1, 0, both)).toEqual({ x: 7, y: 3 })
  })

  it('C7-04 逆风会压低更快的一方；风之徽记在击败岚翼鹏后发放', () => {
    const slow = createCreature('puffmouse', 10, { rng: seeded(3) })
    const roc = createCreature('galeroc', 42, { rng: seeded(4) })
    const s = startBattle([slow], [roc], 'boss')
    onRoundEnd(s)
    expect(s.frames.some((f) => f.text.includes('逆风'))).toBe(true)
    expect(volOf(s, s.playerParty[0]).stages.spd).toBeLessThan(0)
    const store = {
      flags: {} as Record<string, boolean>,
      items: {} as Record<string, number>,
      getFlag(k: string) {
        return this.flags[k]
      },
      setFlag(k: string) {
        this.flags[k] = true
      },
      itemCount(id: string) {
        return this.items[id] ?? 0
      },
      addItem(id: string) {
        this.items[id] = (this.items[id] ?? 0) + 1
      },
    }
    const end = chapterEndFor('roc_beaten')
    expect(end?.badge).toBe('gale')
    expect(end?.card).toBeUndefined()
    grantChapterRewards(end!, store)
    expect(store.flags.badge_gale).toBe(true)
  })

  it('C7-05 神殿上的鸢要等照片，岚翼鹏要等鸢', () => {
    const shrine = MAPS.cloudshrine
    expect(shrine.tiles.length).toBe(shrine.width * shrine.height)
    expect(MAPS.cloudmill.width).toBe(16)
    expect(MAPS.cloudstart.width).toBe(12)
    const none = visibleNpcs(shrine, () => false).map((n) => n.id)
    expect(none).not.toContain('cloud_kite')
    const photo = visibleNpcs(shrine, (k) => k === 'cloud_photo').map((n) => n.id)
    expect(photo).toContain('cloud_kite')
    expect(photo).not.toContain('galeroc')
    const after = visibleNpcs(shrine, (k) => k === 'kite_beaten' || k === 'cloud_photo').map((n) => n.id)
    expect(after).toContain('galeroc')
  })
})
