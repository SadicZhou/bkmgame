/**
 * 技能书：按招式 id 教给符合条件的伙伴
 * @author zjh
 * @date 2026-10-16
 */

import { MAX_MOVES, SPECIES, battleName, fullSlot, type CreatureInstance } from '../data/creatures'
import type { ElementType } from '../data/types'

export interface BookDef {
  itemId: string
  moveId: string
  moveName: string
  /** 本系可学；若 learnset 已有该招也可学 */
  type?: ElementType
  /** 任意伙伴可学（终章技能书） */
  universal?: boolean
}

/** 已登记的技能书 */
export const MOVE_BOOKS: Record<string, BookDef> = {
  book_rock_slide: { itemId: 'book_rock_slide', moveId: 'rock_slide', moveName: '岩崩', type: 'stone' },
  book_tailwind: { itemId: 'book_tailwind', moveId: 'tailwind', moveName: '顺风', type: 'gale' },
  book_defog: { itemId: 'book_defog', moveId: 'defog', moveName: '吹散', type: 'gale' },
  book_heart_echo: {
    itemId: 'book_heart_echo',
    moveId: 'heart_echo',
    moveName: '心火共鸣',
    universal: true,
  },
}

/**
 * 学不会时返回原因，学得会返回 null
 * @author zjh
 * @date 2026-10-22
 */
export function bookReason(c: CreatureInstance, book: BookDef): string | null {
  const sp = SPECIES[c.speciesId]
  const listed = sp.learnset.some((e) => e.moveId === book.moveId)
  if (!book.universal) {
    if (book.type && sp.type !== book.type && !listed) return `学不会${book.moveName}`
    if (!book.type && !listed) return `学不会${book.moveName}`
  }
  if (c.moves.some((m) => m.id === book.moveId)) return `已经会${book.moveName}了`
  if (c.moves.length >= MAX_MOVES) return '技能已经满了'
  return null
}

/**
 * 学会技能书上的招。学不会时返回原因，不改技能
 * @author zjh
 * @date 2026-10-22
 */
export function teachBook(c: CreatureInstance, book: BookDef): string {
  const reason = bookReason(c, book)
  if (reason) return `${battleName(c)}：${reason}`
  c.moves.push(fullSlot(book.moveId))
  return `${battleName(c)} 学会了${book.moveName}！`
}

/**
 * 学不会时返回原因，学得会返回 null（岩崩兼容旧调用）
 * @author zjh
 * @date 2026-10-16
 */
export function rockSlideReason(c: CreatureInstance): string | null {
  return bookReason(c, MOVE_BOOKS.book_rock_slide)
}

/** 学会岩崩。学不会时返回原因，不改技能 */
export function teachRockSlide(c: CreatureInstance): string {
  return teachBook(c, MOVE_BOOKS.book_rock_slide)
}
