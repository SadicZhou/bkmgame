/**
 * 支线 S7-3 风羽的信
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createCreature } from '../src/game/data/creatures'
import { GameState } from '../src/game/state/GameState'
import { startBattle } from '../src/game/systems/BattleLogic'
import { volOf } from '../src/game/systems/BattleCore'
import {
  LETTERS,
  LETTERS_DONE_FLAG,
  LETTER_FLAGS,
  applyWhiteFeather,
  canDeliverTo,
  deliverLetter,
  lettersDelivered,
  lettersLeft,
} from '../src/game/systems/LetterQuest'
import type { NpcDef } from '../src/game/data/maps'
import { seeded } from './helpers'

function npc(partial: Partial<NpcDef> & { id: string; name: string }): NpcDef {
  return { x: 0, y: 0, color: 0, lines: [], ...partial }
}

describe('风羽的信 S7-3', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('L-01 未击败鸢或无羽时不能送信', () => {
    expect(canDeliverTo(npc({ id: 'canyon_peak', name: '峰', story: 'canyon_peak' }))).toBeNull()
    GameState.setFlag('kite_beaten', true)
    GameState.addItem('white_feather', 1)
    expect(canDeliverTo(npc({ id: 'canyon_peak', name: '峰', story: 'canyon_peak' }))).toBeNull()
    GameState.addItem('strength_gloves', 1)
    expect(canDeliverTo(npc({ id: 'canyon_peak', name: '峰', story: 'canyon_peak' }))?.id).toBe('peak')
  })

  it('L-02 五封送完点亮白风羽，战斗开场全队速 +1', () => {
    GameState.setFlag('kite_beaten', true)
    GameState.addItem('white_feather', 1)
    for (const flag of LETTER_FLAGS) GameState.setFlag(flag, true)
    expect(lettersDelivered()).toBe(5)
    expect(lettersLeft()).toBe(0)
    const last = LETTERS.find((l) => l.id === 'elder')!
    // 模拟最后一封：先清掉再送
    GameState.clearFlag(last.flag)
    GameState.clearFlag(LETTERS_DONE_FLAG)
    const { justDone } = deliverLetter(last, '雪伯')
    expect(justDone).toBe(true)
    expect(GameState.hasFlag(LETTERS_DONE_FLAG)).toBe(true)

    const a = createCreature('flarehorn', 20, { rng: seeded(1) })
    const b = createCreature('leafkit', 20, { rng: seeded(2) })
    const foe = createCreature('rockmite', 10, { rng: seeded(3) })
    const s = startBattle([a, b], [foe], 'wild')
    expect(volOf(s, a).stages.spd).toBe(1)
    expect(volOf(s, b).stages.spd).toBe(1)
    expect(s.frames.some((f) => f.text.includes('白风羽'))).toBe(true)
  })

  it('L-03 未完成时白风羽不提速', () => {
    GameState.addItem('white_feather', 1)
    const a = createCreature('flarehorn', 20, { rng: seeded(4) })
    const foe = createCreature('rockmite', 10, { rng: seeded(5) })
    const s = startBattle([a], [foe], 'wild')
    applyWhiteFeather(s)
    expect(volOf(s, a).stages.spd).toBe(0)
  })
})
