/**
 * 告示板 / HUD / toast 小事件提示文案
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it } from 'vitest'
import {
  minorBoardLine,
  minorDetail,
  minorEndedToast,
  minorHudLine,
  minorStartedToast,
} from '../src/game/systems/EventHints'
import { createWorld } from '../src/game/systems/WorldClock'

describe('小事件提示文案', () => {
  it('H-01 流浪商人告示板写清货架与找「商」字', () => {
    const w = createWorld()
    w.minor = { id: 'merchant', mapId: 'meadow', stepsLeft: 120, spot: { x: 3, y: 3 } }
    expect(minorDetail(w)).toContain('商')
    expect(minorBoardLine(w)).toMatch(/流浪商人/)
    expect(minorBoardLine(w)).toMatch(/青苔草地/)
    expect(minorBoardLine(w)).toMatch(/120/)
  })

  it('H-02 HUD 本图显示「此地」，别图显示地图名', () => {
    const w = createWorld()
    w.minor = { id: 'gathering', mapId: 'pass', stepsLeft: 80 }
    expect(minorHudLine(w, 'pass')).toBe('◇ 训练家集会·此地 · 剩80步')
    expect(minorHudLine(w, 'meadow')).toMatch(/余烬山道/)
    expect(minorHudLine(w, 'meadow')).not.toMatch(/此地/)
  })

  it('H-03 开始 / 结束 toast 按种类措辞', () => {
    expect(minorStartedToast('merchant', 'meadow')).toMatch(/行商/)
    expect(minorStartedToast('migration', 'meadow', 'flarehorn')).toMatch(/焰角兔/)
    expect(minorEndedToast('merchant')).toMatch(/收摊/)
    expect(minorEndedToast('gathering')).toMatch(/散了/)
    expect(minorEndedToast('strong_herd')).toMatch(/退去/)
  })

  it('H-04 无进行中小事件时告示板与 HUD 不输出', () => {
    const w = createWorld()
    expect(minorBoardLine(w)).toBeNull()
    expect(minorHudLine(w, 'meadow')).toBeNull()
  })
})
