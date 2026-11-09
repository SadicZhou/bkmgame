/**
 * 支线 S2-2「雾泉螈的蛋」剧情
 * @author zjh
 * @date 2026-11-09
 */

import { Sfx } from '../../systems/AudioBeeps'
import { eggStepsLeft, pickMistEgg } from '../../systems/MistEggQuest'
import type { StoryFn } from './StoryEvents'

/**
 * 湖心岛捡蛋
 * @author zjh
 * @date 2026-11-09
 */
const pickEgg: StoryFn = (host) => {
  const r = pickMistEgg()
  if ('reason' in r) {
    host.say([r.reason])
    return
  }
  host.say(r.lines, () => {
    Sfx.confirm()
    host.toast('支线「雾泉螈的蛋」开始')
    host.toast(`再走 ${eggStepsLeft()} 步就会孵化`)
    host.refreshNpcs()
  })
}

export const MIST_EGG_STORIES: Record<string, StoryFn> = {
  pick_mist_egg: pickEgg,
}
