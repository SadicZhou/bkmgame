/**
 * 支线 S8-2 阿禾的旧笔记
 * @author zjh
 * @date 2026-10-23
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createCreature } from '../src/game/data/creatures'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { MOVE_BOOKS, bookReason, teachBook } from '../src/game/systems/MoveBooks'
import {
  BOOK_HEART,
  NOTE_PAGES,
  NOTES_DONE,
  notesCollected,
  pickNotePage,
  turnInNotes,
} from '../src/game/systems/NoteQuest'

describe('阿禾的旧笔记 S8-2', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('N-01 第八章后小镇有书架，五处有散页', () => {
    expect(visibleNpcs(MAPS.town, () => false).some((n) => n.id === 'ahe_shelf')).toBe(false)
    const after = (k: string) => k === 'chapter8_done'
    expect(visibleNpcs(MAPS.town, after).some((n) => n.id === 'ahe_shelf')).toBe(true)
    for (const p of NOTE_PAGES) {
      const map = MAPS[p.mapId]
      expect(map).toBeTruthy()
      expect(visibleNpcs(map, after).some((n) => n.id === `note_${p.id}_spot`)).toBe(true)
    }
  })

  it('N-02 五页齐交还得心火共鸣技能书；任意伙伴可学', () => {
    GameState.setFlag('chapter8_done', true)
    expect(turnInNotes()).toMatchObject({ reason: expect.stringContaining('还缺') })
    for (const p of NOTE_PAGES) {
      expect('lines' in pickNotePage(p.id)).toBe(true)
    }
    expect(notesCollected()).toBe(5)
    const done = turnInNotes()
    expect(done).toHaveProperty('lines')
    expect(GameState.hasFlag(NOTES_DONE)).toBe(true)
    expect(GameState.itemCount(BOOK_HEART)).toBe(1)
    expect(NOTE_PAGES.every((p) => GameState.itemCount(p.itemId) === 0)).toBe(true)

    const bunny = createCreature('flarehorn', 10, { rng: () => 0.5 })
    while (bunny.moves.length >= 4) bunny.moves.pop()
    expect(bookReason(bunny, MOVE_BOOKS.book_heart_echo)).toBeNull()
    expect(teachBook(bunny, MOVE_BOOKS.book_heart_echo)).toContain('心火共鸣')
  })
})
