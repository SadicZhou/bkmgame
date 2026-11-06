/**
 * 支线 S3-1 回音石的歌
 * @author zjh
 * @date 2026-11-06
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { SPECIES } from '../src/game/data/species'
import { GameState } from '../src/game/state/GameState'
import {
  EXTRA_SONG_STONES,
  hearMelody,
  makeBellcat,
  pressSongStone,
  SONG_DONE,
  SONG_HEARD,
  SONG_STONES,
} from '../src/game/systems/MelodyQuest'

describe('回音石的歌 S3-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('S-01 有铃铛猫物种；通关后才有老铃铛', () => {
    expect(SPECIES.bellcat?.name).toBe('铃铛猫')
    const deer = (k: string) => k === 'deer_beaten'
    expect(visibleNpcs(MAPS.forest, () => false).some((n) => n.id === 'old_bell')).toBe(false)
    expect(visibleNpcs(MAPS.forest, deer).some((n) => n.id === 'old_bell')).toBe(true)
  })

  it('S-02 听旋律后按序敲六音得铃铛猫', () => {
    GameState.setFlag('deer_beaten', true)
    expect(pressSongStone('earth')).toBe('need_hear')
    const heard = hearMelody()
    expect(heard.first).toBe(true)
    expect(GameState.hasFlag(SONG_HEARD)).toBe(true)
    const open = (k: string) => k === SONG_HEARD || k === 'deer_beaten'
    for (const s of EXTRA_SONG_STONES) {
      expect(visibleNpcs(MAPS.forest, open).some((n) => n.id === `stone_${s.id}`)).toBe(true)
    }
    expect(pressSongStone('water')).toBe('wrong')
    for (const s of SONG_STONES) {
      const r = pressSongStone(s.id)
      expect(['lit', 'solved']).toContain(r)
    }
    expect(GameState.hasFlag(SONG_DONE)).toBe(true)
    expect(pressSongStone('earth')).toBe('done')
    GameState.addCreature(makeBellcat(() => 0.5))
    expect(
      GameState.party.some((c) => c.speciesId === 'bellcat') ||
        GameState.storage.some((c) => c.speciesId === 'bellcat'),
    ).toBe(true)
  })
})
