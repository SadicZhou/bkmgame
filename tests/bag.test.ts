/**
 * 背包分页与折叠滑板规则
 * @author zjh
 * @date 2026-10-16
 */

import { describe, expect, it } from 'vitest'
import { BAG_PAGES, ITEMS, ITEM_ORDER, itemIconKey } from '../src/game/data/items'
import { BOARD_ID, boardBlock, boardSpeed } from '../src/game/systems/Vehicle'

describe('背包', () => {
  it('每件道具只进一页，并且有图', () => {
    for (const id of ITEM_ORDER) {
      const pages = BAG_PAGES.filter((p) => p.kinds.includes(ITEMS[id].kind))
      expect(pages, id).toHaveLength(1)
      expect(itemIconKey(id)).toBe(`item-${id}`)
    }
    expect(ITEMS.pp_fruit.name).toBe('能量棒')
    expect(ITEMS.fold_board.kind).toBe('vehicle')
  })

  it('滑板只能在野外、没骑伙伴时展开，展开后更快', () => {
    expect(boardBlock({ owned: false, outdoor: true, petRiding: false })).toMatch(/杂货铺/)
    expect(boardBlock({ owned: true, outdoor: false, petRiding: false })).toMatch(/不方便/)
    expect(boardBlock({ owned: true, outdoor: true, petRiding: true })).toMatch(/下来/)
    expect(boardBlock({ owned: true, outdoor: true, petRiding: false })).toBeNull()
    expect(BOARD_ID).toBe('fold_board')
    expect(boardSpeed(140, true)).toBeLessThan(140)
    expect(boardSpeed(140, false)).toBe(140)
  })
})
