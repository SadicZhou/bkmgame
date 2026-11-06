/**
 * 支线 S2-1「受惊的泡泡鱼」：雾泉湖畔连续成功上钩 5 次安抚鱼群，奖技能书泡沫护盾
 * @author zjh
 * @date 2026-11-06
 */

import { GameState } from '../state/GameState'

export const BUBBLE_MAP = 'lake'
export const BUBBLE_NEED = 5
export const BUBBLE_STARTED = 'side_bubble_started'
export const BUBBLE_DONE = 'side_bubble_done'
export const BUBBLE_STREAK = 'side_bubble_streak'

export function bubbleStreak(): number {
  return Number(GameState.getFlag(BUBBLE_STREAK) ?? 0) || 0
}

/**
 * 湖畔甩竿失败（太早 / 溜走）：连钓清零
 * @author zjh
 * @date 2026-11-06
 */
export function noteBubbleMiss(mapId: string): string | null {
  if (mapId !== BUBBLE_MAP || GameState.hasFlag(BUBBLE_DONE)) return null
  if (!GameState.hasFlag(BUBBLE_STARTED) && bubbleStreak() <= 0) return null
  GameState.setFlag(BUBBLE_STREAK, 0)
  return '鱼群又受惊散开了……连钓中断。'
}

/**
 * 湖畔成功上钩：连钓 +1；满 5 次发放技能书
 * @author zjh
 * @date 2026-11-06
 */
export function noteBubbleCatch(mapId: string): { lines: string[]; done: boolean } {
  if (mapId !== BUBBLE_MAP || GameState.hasFlag(BUBBLE_DONE)) {
    return { lines: [], done: false }
  }
  GameState.setFlag(BUBBLE_STARTED, true)
  const n = bubbleStreak() + 1
  GameState.setFlag(BUBBLE_STREAK, n)
  if (n < BUBBLE_NEED) {
    return {
      done: false,
      lines: [`（鱼群渐渐平静……安抚进度 ${n}/${BUBBLE_NEED}）`],
    }
  }
  GameState.setFlag(BUBBLE_DONE, true)
  GameState.setFlag(BUBBLE_STREAK, BUBBLE_NEED)
  GameState.addItem('book_foam_shield', 1)
  return {
    done: true,
    lines: [
      '（五次连钓之后，湖面冒出一大串泡泡，鱼群终于不再发抖。）',
      '水里浮出一页湿漉漉的技能书——泡沫护盾。',
      '获得了技能书「泡沫护盾」！',
    ],
  }
}
