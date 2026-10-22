/**
 * 进图时异象 / 小事件提醒文案
 * @author zjh
 * @date 2026-10-22
 */

import { describe, expect, it } from 'vitest'
import {
  enterEventToasts,
  minorEnterToast,
  phenomenonEnterToast,
} from '../src/game/systems/EventHints'
import { createWorld } from '../src/game/systems/WorldClock'

describe('进图事件提醒', () => {
  it('E-01 本图有小事件时提示操作与剩余步数', () => {
    const w = createWorld()
    w.minor = { id: 'merchant', mapId: 'meadow', stepsLeft: 90, spot: { x: 3, y: 3 } }
    expect(minorEnterToast(w, 'meadow')).toMatch(/此地正逢【流浪商人】/)
    expect(minorEnterToast(w, 'meadow')).toMatch(/商/)
    expect(minorEnterToast(w, 'meadow')).toMatch(/90/)
    expect(minorEnterToast(w, 'pass')).toBeNull()
  })

  it('E-02 本图有异象时提示目标或信物', () => {
    const w = createWorld()
    w.phenomenon = {
      ...w.phenomenon,
      activeId: 'meteor_shower',
      stepsLeft: 200,
      token: false,
      goalDone: 1,
    }
    expect(phenomenonEnterToast(w, 'meadow')).toMatch(/流星雨/)
    expect(phenomenonEnterToast(w, 'meadow')).toMatch(/星辰碎片/)
    w.phenomenon.token = true
    expect(phenomenonEnterToast(w, 'meadow')).toMatch(/信物/)
    expect(phenomenonEnterToast(w, 'pass')).toBeNull()
  })

  it('E-03 异象与小事件同图时异象在前', () => {
    const w = createWorld()
    w.phenomenon = { ...w.phenomenon, activeId: 'meteor_shower', stepsLeft: 100, token: false }
    w.minor = { id: 'shimmer', mapId: 'meadow', stepsLeft: 50 }
    const lines = enterEventToasts(w, 'meadow')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/异象/)
    expect(lines[1]).toMatch(/闪耀/)
    expect(enterEventToasts(w, 'town')).toEqual([])
  })
})
