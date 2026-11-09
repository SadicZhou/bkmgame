/**
 * 支线 S0-1「小路的翠叶狐」剧情
 * @author zjh
 * @date 2026-11-09
 */

import { Sfx } from '../../systems/AudioBeeps'
import { FOX_REWARD_COUNT, findLostFox, talkKidFox } from '../../systems/LostFoxQuest'
import type { StoryFn } from './StoryEvents'

/**
 * 小镇小路
 * @author zjh
 * @date 2026-11-09
 */
const kidFox: StoryFn = (host, name) => {
  const r = talkKidFox()
  if (r.kind === 'done') return false
  const say = (lines: string[], after?: () => void) =>
    host.say(
      lines.map((l) => `${name}：${l}`),
      after,
    )
  if (r.kind === 'chat') {
    say(r.lines)
    return true
  }
  if (r.kind === 'start') {
    say(r.lines, () => {
      host.toast('支线「小路的翠叶狐」开始')
      host.refreshNpcs()
    })
    return true
  }
  if (r.kind === 'wait') {
    say(r.lines)
    return true
  }
  say(r.lines, () => {
    Sfx.win()
    host.toast(`获得安抚信标 ×${FOX_REWARD_COUNT}`)
    host.toast('支线「小路的翠叶狐」完成')
    host.refreshHud()
    host.refreshNpcs()
  })
  return true
}

const findFox: StoryFn = (host) => {
  const r = findLostFox()
  if ('reason' in r) {
    host.say([r.reason])
    return
  }
  host.say(r.lines, () => {
    Sfx.confirm()
    host.toast('翠叶狐跟着你了')
    host.refreshNpcs()
  })
}

export const LOST_FOX_STORIES: Record<string, StoryFn> = {
  kid_fox: kidFox,
  find_lost_fox: findFox,
}
