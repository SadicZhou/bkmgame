/**
 * 支线 S3-3「迷路的小鼠」：回音林找回 3 只蓬尾鼠宝宝，奖强效喷雾 ×3 与全队亲密度
 * @author zjh
 * @date 2026-11-06
 */

import { GameState } from '../state/GameState'
import { addFriendship } from './Growth'

export interface MouseBaby {
  id: string
  flag: string
  x: number
  y: number
  findLine: string
}

export const MOUSE_BABIES: MouseBaby[] = [
  {
    id: '1',
    flag: 'got_mouse_1',
    x: 8,
    y: 21,
    findLine: '草丛里探出一只蓬松的小脑袋，尾巴卷成一团。',
  },
  {
    id: '2',
    flag: 'got_mouse_2',
    x: 15,
    y: 18,
    findLine: '树洞边蹲着一只小鼠，看见你就抖了抖耳朵。',
  },
  {
    id: '3',
    flag: 'got_mouse_3',
    x: 20,
    y: 11,
    findLine: '音石旁躲着第三只，嘴里还叼着半片蘑菇。',
  },
]

export const MICE_DONE = 'side_mice_done'
export const MICE_STARTED = 'side_mice_started'
export const MICE_NEED = MOUSE_BABIES.length
/** 全队亲密度奖励 */
export const MICE_FRIENDSHIP = 10

export function miceFound(): number {
  return MOUSE_BABIES.filter((b) => GameState.hasFlag(b.flag)).length
}

/**
 * 捡起一只小鼠宝宝（记入旗标，不占背包格）
 * @author zjh
 * @date 2026-11-06
 */
export function pickMouseBaby(id: string): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag('forest_unlocked') && !GameState.hasFlag('deer_beaten')) {
    return { reason: '（林子太静了，小鼠不敢出来。）' }
  }
  const baby = MOUSE_BABIES.find((b) => b.id === id)
  if (!baby) return { reason: '没有这只小鼠。' }
  if (GameState.hasFlag(baby.flag)) return { reason: '这只已经跟着你了。' }
  if (GameState.hasFlag(MICE_DONE)) return { reason: '三只都回家了。' }
  GameState.setFlag(baby.flag, true)
  GameState.setFlag(MICE_STARTED, true)
  const n = miceFound()
  return {
    lines: [
      baby.findLine,
      `（小鼠钻进你的衣兜。）找到了 ${n}/${MICE_NEED} 只。`,
      n >= MICE_NEED ? '三只都齐了！回妈妈身边吧。' : '还有小鼠在林子里叫。',
    ],
  }
}

/**
 * 交给蓬尾鼠妈妈
 * @author zjh
 * @date 2026-11-06
 */
export function turnInMice(): { lines: string[]; reward: boolean } | { reason: string } {
  if (GameState.hasFlag(MICE_DONE)) {
    return { reason: '（妈妈把三只宝宝护在尾巴下，对你轻轻点了点头。）' }
  }
  GameState.setFlag(MICE_STARTED, true)
  const n = miceFound()
  if (n < MICE_NEED) {
    return { reason: `（妈妈焦急地看着林子深处……还差 ${MICE_NEED - n} 只宝宝。）` }
  }
  GameState.setFlag(MICE_DONE, true)
  GameState.addItem('super_potion', 3)
  for (const c of GameState.party) addFriendship(c, MICE_FRIENDSHIP)
  return {
    reward: true,
    lines: [
      '（三只小鼠扑进妈妈怀里，尾巴缠成一股辫子。）',
      '（妈妈把一捆强效喷雾推到你脚边，又用鼻子蹭了蹭你的伙伴。）',
      '全队亲密度 +10。获得了强效喷雾 ×3！',
    ],
  }
}
