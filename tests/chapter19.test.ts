/**
 * 小事件「流浪商人」与技能书顺风 / 吹散
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it } from 'vitest'
import { createCreature } from '../src/game/data/creatures'
import { MERCHANT_STOCK, MINOR_EVENTS } from '../src/game/data/phenomena'
import { MOVE_BOOKS, bookReason, teachBook } from '../src/game/systems/MoveBooks'
import { merchantAt, rollMinor, type PhenomenonEnv } from '../src/game/systems/Phenomenon'
import { HALF_DAY_STEPS, createWorld, stepsToNextPhase } from '../src/game/systems/WorldClock'
import { sequence } from './helpers'

const tiles = [
  { x: 3, y: 3 },
  { x: 4, y: 4 },
  { x: 5, y: 5 },
]

function env(rng: () => number): PhenomenonEnv {
  return { hasFlag: () => true, unlockedMaps: ['meadow', 'pass'], openTiles: () => tiles, rng }
}

describe('流浪商人', () => {
  it('M-01 事件定义与货架齐备', () => {
    expect(MINOR_EVENTS.merchant.name).toBe('流浪商人')
    expect(MERCHANT_STOCK.length).toBeGreaterThanOrEqual(4)
    expect(MERCHANT_STOCK.some((s) => s.id === 'talent_fruit')).toBe(true)
    expect(MERCHANT_STOCK.some((s) => s.id === 'book_tailwind')).toBe(true)
    expect(MOVE_BOOKS.book_tailwind.moveId).toBe('tailwind')
    expect(MOVE_BOOKS.book_defog.moveId).toBe('defog')
  })

  it('M-02 判定成功时在空地摆摊，持续到当前昼/夜结束', () => {
    const w = createWorld()
    w.totalSteps = 100
    w.outdoorSteps = 150
    // chance 命中、抽到 merchant（第 4 个 id）、地图 0、空地 1
    const r = rollMinor(w, env(sequence(0.05, 0.8, 0.1, 0.4)))
    expect(r?.id).toBe('merchant')
    expect(w.minor.mapId).toBe('meadow')
    expect(w.minor.spot).toEqual(tiles[1])
    expect(w.minor.stepsLeft).toBe(stepsToNextPhase(100))
    expect(w.minor.stepsLeft).toBeLessThanOrEqual(HALF_DAY_STEPS)
    expect(merchantAt(w, 'meadow', tiles[1].x, tiles[1].y)).toBe(true)
    expect(merchantAt(w, 'meadow', 0, 0)).toBe(false)
  })

  it('M-03 顺风只能教给风系；吹散同理', () => {
    const fox = createCreature('miragefox', 15)
    fox.moves = fox.moves.slice(0, 3)
    const fox2 = createCreature('miragefox', 15)
    fox2.moves = fox2.moves.slice(0, 3)
    const rock = createCreature('rockmite', 20)
    expect(bookReason(fox, MOVE_BOOKS.book_tailwind)).toBeNull()
    expect(teachBook(fox, MOVE_BOOKS.book_tailwind)).toContain('顺风')
    expect(bookReason(rock, MOVE_BOOKS.book_tailwind)).toBe('学不会顺风')
    expect(bookReason(fox2, MOVE_BOOKS.book_defog)).toBeNull()
    expect(teachBook(fox2, MOVE_BOOKS.book_defog)).toContain('吹散')
  })
})
