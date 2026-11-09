/**
 * 支线 S0-1「小路的翠叶狐」：与小路对话 3 次后，在青苔草地找回迷路的翠叶狐
 * @author zjh
 * @date 2026-11-09
 */

import { GameState } from '../state/GameState'

export const FOX_TALK_NEED = 3
export const FOX_TALKS = 'side_fox_talks'
export const FOX_STARTED = 'side_fox_started'
export const FOX_FOUND = 'got_lost_fox'
export const FOX_DONE = 'side_fox_done'
export const FOX_SPOT = { x: 9, y: 3 }
export const FOX_REWARD_ITEM = 'soothe_berry'
export const FOX_REWARD_COUNT = 3

export function foxTalks(): number {
  return Number(GameState.getFlag(FOX_TALKS) ?? 0) || 0
}

/**
 * 与小路对话推进：满 3 次接任务；找回后交还领奖
 * @author zjh
 * @date 2026-11-09
 */
export function talkKidFox():
  | { kind: 'chat'; lines: string[]; n: number }
  | { kind: 'start'; lines: string[] }
  | { kind: 'wait'; lines: string[] }
  | { kind: 'reward'; lines: string[] }
  | { kind: 'done' } {
  if (GameState.hasFlag(FOX_DONE)) return { kind: 'done' }

  if (GameState.hasFlag(FOX_FOUND)) {
    GameState.setFlag(FOX_DONE, true)
    GameState.addItem(FOX_REWARD_ITEM, FOX_REWARD_COUNT)
    return {
      kind: 'reward',
      lines: [
        '真的是它！叶子尾巴还抖着呢……翠叶狐，对不起，吓到你了！',
        `谢谢旅人！这 ${FOX_REWARD_COUNT} 个安抚信标给你——下次遇到害羞的伙伴就能派上用场！`,
      ],
    }
  }

  if (GameState.hasFlag(FOX_STARTED)) {
    return {
      kind: 'wait',
      lines: ['翠叶狐还在青苔草地的高草里吗？它尾巴是一片大叶子，很好认！', '找到了一定要带回来给我看哦！'],
    }
  }

  const n = foxTalks() + 1
  GameState.setFlag(FOX_TALKS, n)
  if (n < FOX_TALK_NEED) {
    const chats = [
      ['我在草丛里看见一只翠叶狐！', '它的尾巴是一片大叶子，害羞时会把脸藏进去——好可爱！'],
      ['翠叶狐今天又跑到草地那边去了……', '旅人，你要是路过青苔草地，能帮我留意一下吗？'],
    ]
    return { kind: 'chat', n, lines: chats[n - 1] ?? chats[0] }
  }

  GameState.setFlag(FOX_STARTED, true)
  return {
    kind: 'start',
    lines: [
      '糟了糟了！翠叶狐这次真的迷路了，一直没回来！',
      '拜托你了旅人——去青苔草地的高草里找找它，带回来给我！',
    ],
  }
}

/**
 * 在草地找到迷路的翠叶狐
 * @author zjh
 * @date 2026-11-09
 */
export function findLostFox(): { lines: string[] } | { reason: string } {
  if (GameState.hasFlag(FOX_DONE)) return { reason: '（草丛里已经没有那只翠叶狐了。）' }
  if (GameState.hasFlag(FOX_FOUND)) return { reason: '翠叶狐正跟在你脚边。回小镇找小路吧。' }
  if (!GameState.hasFlag(FOX_STARTED)) {
    return { reason: '（高草轻轻摇着……好像有什么在躲，但还不急着出来。）' }
  }
  GameState.setFlag(FOX_FOUND, true)
  return {
    lines: [
      '（高草里探出一只翠绿的小脑袋，叶子尾巴一晃一晃。）',
      '迷路的翠叶狐认出了你身上小镇的气味，乖乖跟上来了。',
      '带回晨曦小镇，交给小路吧。',
    ],
  }
}
