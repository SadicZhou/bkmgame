/**
 * 支线 S1-1「登山客的护身符」剧情
 * @author zjh
 * @date 2026-11-09
 */

import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { AMULET_DONE, pickHikerAmulet, talkHikerAmulet } from '../../systems/HikerAmuletQuest'
import type { StoryFn } from './StoryEvents'

/**
 * 登山客峰：未击败 / 支线已完成时交还给训练家流程；否则走护身符支线
 * @author zjh
 * @date 2026-11-09
 */
const hikerStory: StoryFn = (host, name) => {
  if (!GameState.hasFlag('hiker_beaten')) return false
  if (GameState.hasFlag(AMULET_DONE)) return false
  const r = talkHikerAmulet()
  const say = (lines: string[], after?: () => void) =>
    host.say(
      lines.map((l) => (l.startsWith('（') ? l : `${name}：${l}`)),
      after,
    )
  if (r.kind === 'start') {
    say(r.lines, () => {
      host.toast('支线「登山客的护身符」开始')
      host.refreshNpcs()
    })
    return true
  }
  if (r.kind === 'wait' || r.kind === 'done') {
    say(r.lines)
    return true
  }
  say(r.lines, () => {
    Sfx.win()
    host.toast('获得强效喷雾 ×2')
    host.toast('支线「登山客的护身符」完成')
    host.refreshHud()
    host.refreshNpcs()
  })
  return true
}

const pickAmulet: StoryFn = (host) => {
  const r = pickHikerAmulet()
  if ('reason' in r) {
    host.say([r.reason])
    return
  }
  host.say(r.lines, () => {
    Sfx.confirm()
    host.toast('获得登山护身符')
    host.refreshHud()
    host.refreshNpcs()
  })
}

export const HIKER_AMULET_STORIES: Record<string, StoryFn> = {
  hiker_amulet: hikerStory,
  pick_hiker_amulet: pickAmulet,
}
