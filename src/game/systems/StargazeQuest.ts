/**
 * 支线 S5-2「观星之夜」：满月夜在观星台用望远镜找出 5 个星座，奖观星镜（夜里异色率 ×1.5）
 * 流星雨异象已随第一章通关开放，本支线改为独立奖励
 * @author zjh
 * @date 2026-10-27
 */

import { GameState } from '../state/GameState'
import { isFullMoon } from './WorldClock'

export interface StarDef {
  id: string
  name: string
  /** 望远镜里看到的景象 */
  hint: string
  flag: string
  /** 选项 id → 显示名；正确项 id === answer */
  options: { id: string; label: string }[]
  answer: string
}

export const STAR_CONSTELLATIONS: StarDef[] = [
  {
    id: 'flamebird',
    name: '焰鸟座',
    hint: '南天连成一只展翅的火鸟，翅尖各有一颗暖星。',
    flag: 'star_found_flamebird',
    options: [
      { id: 'flamebird', label: '焰鸟座' },
      { id: 'tide', label: '潮杯座' },
      { id: 'stone', label: '岩锤座' },
    ],
    answer: 'flamebird',
  },
  {
    id: 'tidecup',
    name: '潮杯座',
    hint: '三颗星围成一只浅杯，杯口朝向雾气最重的那边。',
    flag: 'star_found_tidecup',
    options: [
      { id: 'leaf', label: '叶铃座' },
      { id: 'tidecup', label: '潮杯座' },
      { id: 'volt', label: '雷冠座' },
    ],
    answer: 'tidecup',
  },
  {
    id: 'leafbell',
    name: '叶铃座',
    hint: '一串小星像挂在枝上的铃，轻轻晃就会响似的。',
    flag: 'star_found_leafbell',
    options: [
      { id: 'leafbell', label: '叶铃座' },
      { id: 'flamebird', label: '焰鸟座' },
      { id: 'tidecup', label: '潮杯座' },
    ],
    answer: 'leafbell',
  },
  {
    id: 'stonehammer',
    name: '岩锤座',
    hint: '四颗星排成一把竖着的锤子，柄落在北方。',
    flag: 'star_found_stonehammer',
    options: [
      { id: 'volt', label: '雷冠座' },
      { id: 'stonehammer', label: '岩锤座' },
      { id: 'leafbell', label: '叶铃座' },
    ],
    answer: 'stonehammer',
  },
  {
    id: 'voltcrown',
    name: '雷冠座',
    hint: '头顶一圈碎星，像被雷光烫过的冠冕。',
    flag: 'star_found_voltcrown',
    options: [
      { id: 'tidecup', label: '潮杯座' },
      { id: 'flamebird', label: '焰鸟座' },
      { id: 'voltcrown', label: '雷冠座' },
    ],
    answer: 'voltcrown',
  },
]

export const STARGAZE_DONE = 'side_stargaze_done'
export const STARGAZE_STARTED = 'side_stargaze_started'
export const STAR_SCOPE = 'star_scope'

export function starsFound(): number {
  return STAR_CONSTELLATIONS.filter((s) => GameState.hasFlag(s.flag)).length
}

export function canStargaze(steps: number): boolean {
  return (
    GameState.hasFlag('star_chart') &&
    isFullMoon(steps) &&
    !GameState.hasFlag(STARGAZE_DONE)
  )
}

/** 下一颗未找到的星座 */
export function nextStar(): StarDef | null {
  return STAR_CONSTELLATIONS.find((s) => !GameState.hasFlag(s.flag)) ?? null
}

/**
 * 对准星座：选对则记下，五颗齐了发观星镜
 * @author zjh
 * @date 2026-10-27
 */
export function aimStar(
  starId: string,
  pickId: string,
): { ok: true; lines: string[]; justDone: boolean; reward: boolean } | { ok: false; reason: string } {
  const star = STAR_CONSTELLATIONS.find((s) => s.id === starId)
  if (!star) return { ok: false, reason: '镜筒里一片模糊。' }
  if (GameState.hasFlag(star.flag)) return { ok: false, reason: `「${star.name}」已经记进星图了。` }
  if (pickId !== star.answer) {
    return { ok: false, reason: '穗：不对。再对准一次，别被流星带偏。' }
  }
  GameState.setFlag(star.flag, true)
  GameState.setFlag(STARGAZE_STARTED, true)
  const found = starsFound()
  const lines = [`对准了——是「${star.name}」！`, `（已找出 ${found}/${STAR_CONSTELLATIONS.length}）`]
  if (found < STAR_CONSTELLATIONS.length) {
    return { ok: true, lines, justDone: false, reward: false }
  }
  GameState.setFlag(STARGAZE_DONE, true)
  GameState.addItem(STAR_SCOPE, 1)
  lines.push('穗把一具小望远镜塞进你手里。', '夜里带着它，异色的伙伴会更容易露面。')
  return { ok: true, lines, justDone: true, reward: true }
}
