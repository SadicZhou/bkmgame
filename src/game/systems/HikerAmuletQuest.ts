/**
 * 支线 S1-1「登山客的护身符」：击败峰后在灰烬草找回护身符，奖强效喷雾 ×2
 * @author zjh
 * @date 2026-11-09
 */

import { GameState } from '../state/GameState'

/** 余烬山道灰烬草上的护身符位置（固定一格，便于寻找与测试） */
export const AMULET_SPOT = { x: 6, y: 6 }

export const AMULET_STARTED = 'side_amulet_started'
export const AMULET_GOT = 'got_hiker_amulet'
export const AMULET_DONE = 'side_amulet_done'
export const AMULET_ITEM = 'hiker_amulet'
export const AMULET_REWARD_ITEM = 'super_potion'
export const AMULET_REWARD_COUNT = 2

/**
 * 与登山客峰对话（仅在已击败后由剧情接管）
 * @author zjh
 * @date 2026-11-09
 */
export function talkHikerAmulet():
  | { kind: 'start'; lines: string[] }
  | { kind: 'wait'; lines: string[] }
  | { kind: 'reward'; lines: string[] }
  | { kind: 'done'; lines: string[] } {
  if (GameState.hasFlag(AMULET_DONE)) {
    return {
      kind: 'done',
      lines: [
        '护身符又挂回脖子上了，谢谢你。',
        '山顶的熔鬃狮很强，先去温泉那里休整一下吧。',
        '对了，它浑身是火——潮系和岩系的伙伴能克制它。',
      ],
    }
  }
  if (!GameState.hasFlag(AMULET_STARTED)) {
    GameState.setFlag(AMULET_STARTED, true)
    return {
      kind: 'start',
      lines: [
        '打得真痛快！……糟了，我的护身符呢？',
        '刚才比试的时候好像掉在灰烬草里了。帮我找找好吗？',
        '找到了拿回来，我请你喝——不对，请你用强效喷雾！',
      ],
    }
  }
  if (!GameState.hasFlag(AMULET_GOT) && GameState.itemCount(AMULET_ITEM) <= 0) {
    return {
      kind: 'wait',
      lines: ['护身符还在灰烬草里吧。山道上那些发黑的草丛，仔细看看。'],
    }
  }
  if (GameState.itemCount(AMULET_ITEM) > 0) GameState.consumeItem(AMULET_ITEM)
  GameState.setFlag(AMULET_GOT, true)
  GameState.setFlag(AMULET_DONE, true)
  GameState.addItem(AMULET_REWARD_ITEM, AMULET_REWARD_COUNT)
  return {
    kind: 'reward',
    lines: [
      '就是这个！木头上还刻着我娘给的小火印。',
      `谢啦旅人——这 ${AMULET_REWARD_COUNT} 罐强效喷雾给你，路上用得着。`,
    ],
  }
}

/**
 * 在灰烬草捡起护身符
 * @author zjh
 * @date 2026-11-09
 */
export function pickHikerAmulet(): { lines: string[] } | { reason: string } {
  if (GameState.hasFlag(AMULET_DONE)) return { reason: '这里已经没有东西了。' }
  if (GameState.hasFlag(AMULET_GOT) || GameState.itemCount(AMULET_ITEM) > 0) {
    return { reason: '护身符已经在你手上了。去还给登山客峰吧。' }
  }
  if (!GameState.hasFlag(AMULET_STARTED)) {
    return { reason: '（灰烬草里好像有什么东西……先问问登山客峰吧。）' }
  }
  GameState.setFlag(AMULET_GOT, true)
  GameState.addItem(AMULET_ITEM, 1)
  return {
    lines: [
      '灰烬草里闪出一角木牌——登山客的护身符！',
      '拿回去给他吧。',
    ],
  }
}
