/**
 * 千灯节：日期判定、饰品轮换
 * @author zjh
 * @date 2026-10-20
 */

import { describe, expect, it } from 'vitest'
import { FEST_GIFTS, FESTIVAL_EVERY, festGiftIndex, festivalToday } from '../src/game/systems/Festival'
import { MAPS, visibleNpcs } from '../src/game/data/maps'

describe('千灯节', () => {
  it('F-01 通关后每满 30 天才是节日', () => {
    expect(festivalToday(30, true)).toBe(true)
    expect(festivalToday(60, true)).toBe(true)
    expect(festivalToday(29, true)).toBe(false)
    expect(festivalToday(30, false)).toBe(false)
    expect(FESTIVAL_EVERY).toBe(30)
  })

  it('F-02 饰品按轮次轮换', () => {
    expect(FEST_GIFTS[festGiftIndex(30)].id).toBe('fest_ribbon')
    expect(FEST_GIFTS[festGiftIndex(60)].id).toBe('fest_lantern')
    expect(FEST_GIFTS[festGiftIndex(90)].id).toBe('fest_star')
    expect(FEST_GIFTS[festGiftIndex(120)].id).toBe('fest_ribbon')
  })

  it('F-03 节日时小镇能看见饰品摊和旧友', () => {
    const ids = visibleNpcs(MAPS.town, (k) => k === '@festival' || k === 'game_clear').map((n) => n.id)
    expect(ids).toContain('fest_stall')
    expect(ids).toContain('fest_path')
    expect(ids).toContain('fest_fei')
    expect(ids).toContain('fest_mochen_fest')
  })
})
