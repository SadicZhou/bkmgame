/**
 * 支线 S6-1 霜铃的回响
 * @author zjh
 * @date 2026-10-23
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { MAPS, tileAt, visibleNpcs } from '../src/game/data/maps'
import { GameState } from '../src/game/state/GameState'
import { slideEnd } from '../src/game/systems/Frost'
import {
  ECHO_DONE,
  ECHO_MAP,
  ECHO_STAGES,
  abortEcho,
  beginEchoStage,
  clearEchoStage,
  echoHudLine,
  echoSlidesUsed,
  echoStagesCleared,
  failEchoStage,
  isEchoGoal,
  makeEchoFrostwing,
  recordEchoSlide,
} from '../src/game/systems/EchoQuest'
import { talentGrade } from '../src/game/systems/Talent'

const echo = MAPS.frostecho
const tile = (x: number, y: number) => tileAt(echo, x, y)

/** 从当前位置按方向滑一次，返回落点 */
function slide(x: number, y: number, dx: number, dy: number) {
  return slideEnd(x, y, dx, dy, tile, () => false)
}

describe('霜铃的回响 S6-1', () => {
  beforeEach(() => {
    GameState.newGame()
  })

  it('E-01 通关后铃殿有回响之铃；挑战场有木牌与冰码头', () => {
    expect(visibleNpcs(MAPS.bellhall, () => false).some((n) => n.id === 'echo_bell')).toBe(false)
    const after = (k: string) => k === 'chapter6_done'
    expect(visibleNpcs(MAPS.bellhall, after).some((n) => n.id === 'echo_bell')).toBe(true)
    expect(MAPS[ECHO_MAP]).toBeTruthy()
    expect(tile(2, 1)).toBe('dock')
    expect(tile(13, 1)).toBe('dock')
    expect(tile(2, 7)).toBe('dock')
    expect(tile(13, 7)).toBe('dock')
    expect(tile(3, 1)).toBe('ice')
    expect(visibleNpcs(echo, () => false).some((n) => n.id === 'echo_sign')).toBe(true)
  })

  it('E-02 三关限步路径可解', () => {
    // 关 1：右滑一次到东码头
    expect(slide(2, 1, 1, 0)).toEqual({ x: 13, y: 1 })
    // 关 2：下 → 中码头 → 再下到南码头（2 次）
    expect(slide(2, 1, 0, 1)).toEqual({ x: 2, y: 4 })
    expect(slide(2, 4, 0, 1)).toEqual({ x: 2, y: 7 })
    // 关 3：右 → 下 → 下（3 次到右下）
    expect(slide(2, 1, 1, 0)).toEqual({ x: 13, y: 1 })
    expect(slide(13, 1, 0, 1)).toEqual({ x: 13, y: 4 })
    expect(slide(13, 4, 0, 1)).toEqual({ x: 13, y: 7 })
    expect(ECHO_STAGES.map((s) => s.maxSlides)).toEqual([2, 3, 4])
  })

  it('E-03 滑次超限失败；到终点过关；三关奖 A 霜晶蝶', () => {
    beginEchoStage(1)
    expect(echoHudLine()).toContain('第1关')
    expect(recordEchoSlide()).toBe('ok')
    expect(recordEchoSlide()).toBe('ok')
    expect(recordEchoSlide()).toBe('fail')
    const failed = failEchoStage()
    expect(failed?.id).toBe(1)
    expect(echoSlidesUsed()).toBe(0)

    beginEchoStage(1)
    expect(isEchoGoal(13, 1)).toBe(true)
    const r1 = clearEchoStage()
    expect(r1.next?.id).toBe(2)
    expect(echoStagesCleared()).toBe(1)

    expect(isEchoGoal(2, 7)).toBe(true)
    const r2 = clearEchoStage()
    expect(r2.next?.id).toBe(3)

    expect(isEchoGoal(13, 7)).toBe(true)
    const r3 = clearEchoStage()
    expect(r3.next).toBeNull()
    expect(r3.reward?.speciesId).toBe('frostwing')
    expect(talentGrade(r3.reward!.talent)).toMatch(/^[AS]$/)
    expect(GameState.hasFlag(ECHO_DONE)).toBe(true)

    abortEcho()
    const moth = makeEchoFrostwing(() => 0)
    expect(talentGrade(moth.talent)).toMatch(/^[AS]$/)
  })
})
