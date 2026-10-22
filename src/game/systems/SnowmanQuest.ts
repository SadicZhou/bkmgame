/**
 * 支线 S6-2「雪人大赛」：收集三种材料堆雪人，奖御寒围巾
 * @author zjh
 * @date 2026-10-22
 */

import { GameState } from '../state/GameState'

/** 堆雪人需要的三样材料 */
export const SNOWMAN_PARTS = [
  { id: 'snow_ball', name: '圆雪球', flag: 'got_snow_ball' },
  { id: 'coal_eyes', name: '炭眼睛', flag: 'got_coal_eyes' },
  { id: 'ice_carrot', name: '冰胡萝卜', flag: 'got_ice_carrot' },
] as const

export const SNOWMAN_DONE_FLAG = 'side_snowman_done'

/** 已集齐几样 */
export function snowmanPartsCount(): number {
  return SNOWMAN_PARTS.filter((p) => GameState.itemCount(p.id) > 0 || GameState.hasFlag(p.flag)).length
}

/** 三样是否都在背包（或已记下） */
export function snowmanPartsReady(): boolean {
  return SNOWMAN_PARTS.every((p) => GameState.itemCount(p.id) > 0)
}

/**
 * 捡起一件材料
 * @author zjh
 * @date 2026-10-22
 */
export function pickSnowPart(partId: (typeof SNOWMAN_PARTS)[number]['id']): { lines: string[] } | { reason: string } {
  const part = SNOWMAN_PARTS.find((p) => p.id === partId)
  if (!part) return { reason: '没有这种材料。' }
  if (GameState.hasFlag(part.flag) || GameState.itemCount(part.id) > 0) return { reason: `已经有${part.name}了。` }
  GameState.addItem(part.id, 1)
  GameState.setFlag(part.flag, true)
  GameState.setFlag('side_snowman', true)
  return { lines: [`捡到了「${part.name}」！`, `（雪人材料 ${snowmanPartsCount()}/${SNOWMAN_PARTS.length}）`] }
}

/**
 * 用三样材料堆雪人并评分发奖
 * @author zjh
 * @date 2026-10-22
 */
export function buildSnowman(): { lines: string[]; gotScarf: boolean } | { reason: string } {
  if (GameState.hasFlag(SNOWMAN_DONE_FLAG)) return { reason: '雪人已经堆好了，孩子们还在围着看。' }
  if (!snowmanPartsReady()) {
    const miss = SNOWMAN_PARTS.filter((p) => GameState.itemCount(p.id) <= 0).map((p) => p.name)
    return { reason: `还缺：${miss.join('、')}。` }
  }
  for (const p of SNOWMAN_PARTS) GameState.consumeItem(p.id)
  GameState.setFlag(SNOWMAN_DONE_FLAG, true)
  GameState.addItem('warm_scarf', 1)
  return {
    gotScarf: true,
    lines: [
      '圆雪球、炭眼睛、冰胡萝卜——雪人立起来了！',
      '孩子们拍手：这是今天的金牌雪人！',
      '他们塞给你一条织好的围巾：上山不那么冷，伙伴也不容易被冻住。',
    ],
  }
}

/** 是否带着御寒围巾 */
export function hasWarmScarf(): boolean {
  return GameState.itemCount('warm_scarf') > 0
}
