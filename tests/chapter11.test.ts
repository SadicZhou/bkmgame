/**
 * 星砂秘境：种子、天气、通路、稀有伙伴
 * @author zjh
 * @date 2026-10-19
 */

import { describe, expect, it } from 'vitest'
import { buildRiftFloor, riftRare, riftTrail, riftWeather, RIFT_WEATHERS } from '../src/game/data/riftMap'

describe('星砂秘境', () => {
  it('R-01 每一层都能从入口走到北头，而且步步相邻', () => {
    for (const seed of [1, 2, 7, 40]) {
      for (let floor = 1; floor <= 5; floor++) {
        const trail = riftTrail(seed, floor)
        expect(trail[0]).toEqual({ x: 5, y: 6 })
        expect(trail[trail.length - 1].y).toBe(1)
        for (let i = 1; i < trail.length; i++) {
          const dist = Math.abs(trail[i].x - trail[i - 1].x) + Math.abs(trail[i].y - trail[i - 1].y)
          expect(dist).toBe(1)
        }
        const map = buildRiftFloor(seed, floor)
        for (const step of trail) {
          const kind = map.tiles[step.y * map.width + step.x]
          expect(kind === 'wall').toBe(false)
        }
      }
    }
  })

  it('R-02 两种种子指向不同的稀有伙伴，天气在表内', () => {
    expect(riftRare(1)).toBe('starcat')
    expect(riftRare(2)).toBe('auroradeer')
    expect(RIFT_WEATHERS).toContain(riftWeather(3, 4))
  })

  it('R-03 最深处的训练师就是这颗种子对应的伙伴', () => {
    const map = buildRiftFloor(2, 5)
    expect(map.npcs[0]?.recruit).toBe(true)
    expect(map.npcs[0]?.team?.[0]?.speciesId).toBe('auroradeer')
    expect(map.warps.some((w) => w.targetMap === 'rift6')).toBe(false)
  })
})
