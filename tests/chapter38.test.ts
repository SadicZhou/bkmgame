/**
 * 支线 S2-1 受惊的泡泡鱼
 * @author zjh
 * @date 2026-11-06
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MOVES } from '../src/game/data/moves'
import { ITEMS } from '../src/game/data/items'
import { createCreature } from '../src/game/data/creatures'
import { GameState } from '../src/game/state/GameState'
import { MOVE_BOOKS, teachBook } from '../src/game/systems/MoveBooks'
import {
  BUBBLE_DONE,
  BUBBLE_NEED,
  BUBBLE_STARTED,
  bubbleStreak,
  noteBubbleCatch,
  noteBubbleMiss,
} from '../src/game/systems/BubbleCalmQuest'

describe('受惊的泡泡鱼 S2-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('B-01 泡沫护盾招式与技能书存在', () => {
    expect(MOVES.foam_shield?.name).toBe('泡沫护盾')
    expect(ITEMS.book_foam_shield?.name).toContain('泡沫护盾')
    expect(MOVE_BOOKS.book_foam_shield.moveId).toBe('foam_shield')
    const c = createCreature('bubblefin', 10, { rng: () => 0.5 })
    c.moves = c.moves.slice(0, 2)
    expect(teachBook(c, MOVE_BOOKS.book_foam_shield)).toContain('泡沫护盾')
    expect(c.moves.some((m) => m.id === 'foam_shield')).toBe(true)
  })

  it('B-02 湖畔连钓五次得书；失手清零', () => {
    expect(noteBubbleCatch('pass').lines).toHaveLength(0)
    for (let i = 1; i <= 3; i++) {
      const r = noteBubbleCatch('lake')
      expect(r.done).toBe(false)
      expect(bubbleStreak()).toBe(i)
      expect(GameState.hasFlag(BUBBLE_STARTED)).toBe(true)
    }
    expect(noteBubbleMiss('lake')).toContain('中断')
    expect(bubbleStreak()).toBe(0)
    for (let i = 1; i < BUBBLE_NEED; i++) noteBubbleCatch('lake')
    const last = noteBubbleCatch('lake')
    expect(last.done).toBe(true)
    expect(GameState.hasFlag(BUBBLE_DONE)).toBe(true)
    expect(GameState.itemCount('book_foam_shield')).toBe(1)
    expect(noteBubbleCatch('lake').done).toBe(false)
    expect(GameState.itemCount('book_foam_shield')).toBe(1)
  })
})
