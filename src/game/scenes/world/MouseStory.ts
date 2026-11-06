/**
 * 支线 S3-3「迷路的小鼠」剧情
 * @author zjh
 * @date 2026-11-06
 */

import { Sfx } from '../../systems/AudioBeeps'
import { MOUSE_BABIES, pickMouseBaby, turnInMice } from '../../systems/MouseQuest'
import type { StoryFn, StoryHost } from './StoryEvents'

/**
 * 蓬尾鼠妈妈（不会说话，用动作）
 * @author zjh
 * @date 2026-11-06
 */
function mouseMom(host: StoryHost): void {
  const r = turnInMice()
  if ('reason' in r) {
    host.say([r.reason])
    return
  }
  host.say(r.lines, () => {
    if (r.reward) {
      Sfx.win()
      host.toast('获得强效喷雾 ×3')
      host.toast('全队亲密度 +10')
      host.toast('支线「迷路的小鼠」完成')
      host.refreshHud()
      host.refreshNpcs()
    }
  })
}

function pickBaby(id: string): StoryFn {
  return (host) => {
    const r = pickMouseBaby(id)
    if ('reason' in r) {
      host.say([r.reason])
      return
    }
    host.say(r.lines, () => host.refreshNpcs())
  }
}

export const MOUSE_STORIES: Record<string, StoryFn> = {
  mouse_mom: mouseMom,
  ...Object.fromEntries(MOUSE_BABIES.map((b) => [`pick_mouse_${b.id}`, pickBaby(b.id)])),
}
