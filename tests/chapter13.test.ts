/**
 * 全图鉴：收齐判定与旅团手账异色倍率
 * @author zjh
 * @date 2026-10-20
 */

import { describe, expect, it } from 'vitest'
import { DEX_ORDER } from '../src/game/data/creatures'
import { SHINY_RATE } from '../src/game/systems/Encounter'
import { dexComplete, JOURNAL_SHINY } from '../src/game/systems/Postgame'

describe('全图鉴', () => {
  it('D-01 主图鉴缺一只就不算齐', () => {
    expect(dexComplete([])).toBe(false)
    expect(dexComplete(DEX_ORDER.slice(0, -1))).toBe(false)
    expect(dexComplete([...DEX_ORDER])).toBe(true)
  })

  it('D-02 旅团手账把异色率翻到两倍', () => {
    expect(SHINY_RATE * JOURNAL_SHINY).toBeCloseTo(1 / 200)
  })
})
