/**
 * 支线 SF-1「塔里的画」：灰烬之塔第 9 层调查 6 幅旧画，结局多一段回忆
 * @author zjh
 * @date 2026-11-06
 */

import { GameState } from '../state/GameState'

export interface TowerPainting {
  id: string
  flag: string
  title: string
  x: number
  y: number
  /** 调查台词 */
  lines: string[]
}

/** 墙上的六幅：墨尘与灯灯 */
export const TOWER_PAINTINGS: TowerPainting[] = [
  {
    id: '1',
    flag: 'tower_paint_1',
    title: '旧画·山脚',
    x: 1,
    y: 2,
    lines: ['少年坐在山脚，怀里一团小小的暖光。', '画角写着：「灯灯，第一天。」'],
  },
  {
    id: '2',
    flag: 'tower_paint_2',
    title: '旧画·灯台',
    x: 1,
    y: 4,
    lines: ['两个人在灯台下笑。一个像阿禾，一个像更年轻的墨尘。', '暖光趴在墨尘肩上。'],
  },
  {
    id: '3',
    flag: 'tower_paint_3',
    title: '旧画·雨夜',
    x: 3,
    y: 2,
    lines: ['雨夜里，暖光把斗篷撑开挡雨。', '墨尘的脸被火照得很软。'],
  },
  {
    id: '4',
    flag: 'tower_paint_4',
    title: '旧画·合照',
    x: 8,
    y: 2,
    lines: ['五个人挤在一张纸上。角落缺了一块——就是你找到的合照残角。', '灯灯的光糊成一个白点。'],
  },
  {
    id: '5',
    flag: 'tower_paint_5',
    title: '旧画·火',
    x: 9,
    y: 3,
    lines: ['山在烧。画被熏黑了半边。', '还能看见一只小乌鸦，衔着最后一点心火往外飞。'],
  },
  {
    id: '6',
    flag: 'tower_paint_6',
    title: '旧画·未完',
    x: 9,
    y: 5,
    lines: ['画布空白。只写了一行字：「若有下一次——」', '后面没有了。'],
  },
]

export const PAINTINGS_DONE = 'side_tower_paintings'

export function paintingsFound(): number {
  return TOWER_PAINTINGS.filter((p) => GameState.hasFlag(p.flag)).length
}

/**
 * 调查一幅画
 * @author zjh
 * @date 2026-11-06
 */
export function viewPainting(id: string): { lines: string[]; justDone: boolean } | { reason: string } {
  const p = TOWER_PAINTINGS.find((x) => x.id === id)
  if (!p) return { reason: '墙上什么也没有。' }
  const first = !GameState.hasFlag(p.flag)
  if (first) GameState.setFlag(p.flag, true)
  const n = paintingsFound()
  const lines = [...p.lines]
  if (first) lines.push(`（记下了这幅画。${n}/${TOWER_PAINTINGS.length}）`)
  else lines.push('（已经看过了。）')
  let justDone = false
  if (n >= TOWER_PAINTINGS.length && !GameState.hasFlag(PAINTINGS_DONE)) {
    GameState.setFlag(PAINTINGS_DONE, true)
    justDone = true
    lines.push('六幅画连起来：山脚、灯台、雨夜、合照、大火、未完的句子。', '你好像多看见了一段回忆。')
  }
  return { lines, justDone }
}

/** 结局额外回忆（齐画后） */
export const PAINTING_ENDING_LINES = [
  '你想起塔里的六幅旧画——灯灯把最后的心火交给小乌鸦的那一夜。',
  '墨尘没有再说「火是灾祸」。他只是看着肩上的光，很轻地点了点头。',
]
