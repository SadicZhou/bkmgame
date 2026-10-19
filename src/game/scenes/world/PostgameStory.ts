/**
 * 灯灯的足迹：五处旧地都走过之后，墨尘把微光灵交给旅人
 * @author zjh
 * @date 2026-10-19
 */

import { createCreature } from '../../data/creatures'
import { GameState } from '../../state/GameState'
import { TRACE_FLAGS, traceCount } from '../../systems/Postgame'
import type { StoryFn, StoryHost } from './StoryEvents'

const LINES: Record<(typeof TRACE_FLAGS)[number], string> = {
  trace_pass: '山道的石头热了一下，又安静了。灯灯来过这里。',
  trace_lake: '湖面写了一个很小的「谢谢」，随即散开。',
  trace_forest: '铃铛自己响了一声。林子记住了这只小光。',
  trace_town: '钟楼的灯芯跳了一下。小镇的灯在答应它。',
  trace_tower: '灯台亮了一瞬。十年前的光，还在。',
}

/**
 * 记下这一处旧地
 * @author zjh
 * @date 2026-10-19
 */
function spot(flag: (typeof TRACE_FLAGS)[number]): StoryFn {
  return (host) => {
    if (GameState.hasFlag(flag)) return false
    GameState.setFlag(flag, true)
    const n = traceCount((k) => GameState.hasFlag(k))
    host.say([LINES[flag], `足迹 ${n}/5。`], () => host.refreshNpcs())
  }
}

/**
 * 墨尘指路，五处走完后送出微光灵
 * @author zjh
 * @date 2026-10-19
 */
function mochen(host: StoryHost): void {
  if (GameState.hasFlag('trace_done')) {
    host.say(['墨尘：灯灯还在。你也在。'])
    return
  }
  const n = traceCount((k) => GameState.hasFlag(k))
  if (!GameState.hasFlag('trace_started') || n < TRACE_FLAGS.length) {
    GameState.setFlag('trace_started', true)
    host.refreshNpcs()
    host.say([
      '墨尘：灯灯走过的地方，我都记得。',
      '余烬山道的入口、雾泉湖边、回音林的林口、小镇钟楼下面，还有塔顶的灯台。',
      n === 0 ? '你一处都还没去。我在镇口等你。' : `你已经走过 ${n} 处。`,
    ])
    return
  }
  const gift = createCreature('wisp', 30, { talentFloor: 20 })
  gift.appraised = true
  const where = GameState.addCreature(gift)
  GameState.markCaught('wisp')
  GameState.setFlag('trace_done', true)
  host.refreshHud()
  host.say(
    [
      '墨尘：五处都亮了。',
      '墨尘：这只微光灵，是灯灯留下的光。资质是满的。它跟你走。',
      where === 'party' ? '微光灵加入了队伍。' : '队伍满了，微光灵在寄存所等你。',
    ],
    () => host.refreshNpcs(),
  )
}

export const POSTGAME_STORIES: Record<string, StoryFn> = {
  trace_mochen: mochen,
  trace_pass: spot('trace_pass'),
  trace_lake: spot('trace_lake'),
  trace_forest: spot('trace_forest'),
  trace_town: spot('trace_town'),
  trace_tower: spot('trace_tower'),
}
