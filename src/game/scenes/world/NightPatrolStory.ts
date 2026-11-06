/**
 * 支线 S1-2「山道夜巡」剧情
 * @author zjh
 * @date 2026-11-06
 */

import { Sfx } from '../../systems/AudioBeeps'
import { FLAME_SPOTS, pickFlame, talkPatrolWick } from '../../systems/NightPatrolQuest'
import type { StoryFn, StoryHost } from './StoryEvents'

/**
 * 入口灯芯蜥
 * @author zjh
 * @date 2026-11-06
 */
function patrolWick(host: StoryHost): void {
  const r = talkPatrolWick()
  if (r.kind === 'day') {
    host.say(['（白天山道上看不见那只灯芯蜥。等夜里再来吧。）'])
    return
  }
  if (r.kind === 'done') {
    host.say(['（灯芯蜥尾巴尖的火苗安稳地摇着，像在说：今晚巡完了。）'])
    return
  }
  if (r.kind === 'start') {
    host.say(r.lines, () => {
      host.toast('支线「山道夜巡」开始')
      host.refreshNpcs()
    })
    return
  }
  if (r.kind === 'wait') {
    host.say(r.lines)
    return
  }
  host.say(r.lines, () => {
    Sfx.win()
    host.toast(r.where === 'party' ? '灯芯蜥加入队伍' : '灯芯蜥已寄存')
    host.toast('支线「山道夜巡」完成')
    host.refreshHud()
    host.refreshNpcs()
  })
}

function pickSpot(id: string): StoryFn {
  return (host) => {
    const r = pickFlame(id)
    if ('reason' in r) {
      host.say([r.reason])
      return
    }
    host.say(r.lines, () => host.refreshNpcs())
  }
}

export const NIGHT_PATROL_STORIES: Record<string, StoryFn> = {
  patrol_wick: patrolWick,
  ...Object.fromEntries(FLAME_SPOTS.map((f) => [`pick_patrol_flame_${f.id}`, pickSpot(f.id)])),
}
