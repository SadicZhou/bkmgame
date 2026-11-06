/**
 * 支线 SF-1 塔里的画
 * @author zjh
 * @date 2026-11-06
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import {
  PAINTING_ENDING_LINES,
  PAINTINGS_DONE,
  TOWER_PAINTINGS,
  paintingsFound,
  viewPainting,
} from '../src/game/systems/TowerPaintings'

describe('塔里的画 SF-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('P-01 第 9 层有六幅旧画', () => {
    const ids = visibleNpcs(MAPS.tower9, () => false).map((n) => n.id)
    for (const p of TOWER_PAINTINGS) {
      expect(ids).toContain(`tower_paint_${p.id}`)
    }
  })

  it('P-02 看齐六幅完成支线；结局有回忆文案', () => {
    for (const p of TOWER_PAINTINGS.slice(0, 5)) {
      const r = viewPainting(p.id)
      expect(r).toHaveProperty('justDone', false)
    }
    expect(paintingsFound()).toBe(5)
    const last = viewPainting(TOWER_PAINTINGS[5].id)
    expect(last).toMatchObject({ justDone: true })
    expect(GameState.hasFlag(PAINTINGS_DONE)).toBe(true)
    expect(PAINTING_ENDING_LINES.length).toBeGreaterThanOrEqual(2)
    expect(viewPainting('1')).toMatchObject({ justDone: false })
  })
})
