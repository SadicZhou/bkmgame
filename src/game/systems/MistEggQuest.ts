/**
 * 支线 S2-2「雾泉螈的蛋」：湖心岛捡蛋，走 200 步孵出高资质雾泉螈
 * @author zjh
 * @date 2026-11-09
 */

import { calcStats, createCreature, type CreatureInstance } from '../data/creatures'
import { GameState } from '../state/GameState'

export const EGG_NEED_STEPS = 200
export const EGG_STARTED = 'side_egg_started'
export const EGG_DONE = 'side_egg_done'
export const EGG_GOT = 'got_mist_egg'
/** 捡起时的 totalSteps */
export const EGG_START_STEPS = 'side_egg_start_steps'

export function eggActive(): boolean {
  return GameState.hasFlag(EGG_GOT) && !GameState.hasFlag(EGG_DONE)
}

/** 已走步数（孵化用） */
export function eggStepsWalked(): number {
  if (!eggActive()) return 0
  const start = Number(GameState.getFlag(EGG_START_STEPS) ?? 0) || 0
  return Math.max(0, GameState.world.totalSteps - start)
}

export function eggStepsLeft(): number {
  return Math.max(0, EGG_NEED_STEPS - eggStepsWalked())
}

/**
 * 捡起湖心岛的雾泉螈蛋
 * @author zjh
 * @date 2026-11-09
 */
export function pickMistEgg(): { lines: string[] } | { reason: string } {
  if (GameState.hasFlag(EGG_DONE)) return { reason: '蛋已经孵化过了。' }
  if (GameState.hasFlag(EGG_GOT)) return { reason: '蛋正暖在你怀里，继续走走吧。' }
  if (!GameState.hasFlag('whale_beaten')) {
    return { reason: '（湖心还不安宁，蛋安静地躺着。）' }
  }
  GameState.setFlag(EGG_GOT, true)
  GameState.setFlag(EGG_STARTED, true)
  GameState.setFlag(EGG_START_STEPS, GameState.world.totalSteps)
  return {
    lines: [
      '（灯台根旁躺着一枚温热的蛋，壳上蒙着薄雾。）',
      '雾泉螈的蛋被你轻轻捧起。走走就会暖热它——大约两百步。',
    ],
  }
}

/**
 * 每步检查是否孵化；成功则加入队伍并返回文案
 * @author zjh
 * @date 2026-11-09
 */
export function tickMistEgg(): { lines: string[]; where: 'party' | 'storage' } | null {
  if (!eggActive()) return null
  if (eggStepsWalked() < EGG_NEED_STEPS) return null
  const creature = makeEggMistnewt()
  const where = GameState.addCreature(creature)
  GameState.setFlag(EGG_DONE, true)
  return {
    where,
    lines: [
      '（怀里的蛋轻轻裂开——雾气里探出一只小小的雾泉螈。）',
      where === 'party' ? '高资质的雾泉螈加入了队伍！' : '队伍已满，雾泉螈先寄存在旅人小屋。',
    ],
  }
}

/**
 * 资质下限 12 的雾泉螈
 * @author zjh
 * @date 2026-11-09
 */
export function makeEggMistnewt(rng: () => number = Math.random): CreatureInstance {
  const c = createCreature('mistnewt', 15, { talentFloor: 12, rng })
  const stats = calcStats(c)
  Object.assign(c, stats, { hp: stats.maxHp })
  c.appraised = true
  return c
}
