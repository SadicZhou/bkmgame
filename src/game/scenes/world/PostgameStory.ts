/**
 * 灯灯的足迹与千灯节饰品摊
 * @author zjh
 * @date 2026-10-19
 */

import { createCreature } from '../../data/creatures'
import { ITEMS } from '../../data/items'
import { GameState } from '../../state/GameState'
import { FEST_GIFTS, festClaimFlag, festGiftIndex } from '../../systems/Festival'
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

/**
 * 千灯节饰品摊：这一轮的限定饰品，一天只领一次
 * @author zjh
 * @date 2026-10-20
 */
function festStall(host: StoryHost): void {
  const day = GameState.day()
  const claim = festClaimFlag(day)
  const gift = FEST_GIFTS[festGiftIndex(day)]
  if (GameState.hasFlag(claim)) {
    host.say([`饰品摊：今天的「${gift.name}」你已经拿过了。`, '下一次千灯节再来，会换另一件。'])
    return
  }
  GameState.setFlag(claim, true)
  if (GameState.itemCount(gift.id) > 0) {
    GameState.coins += 100
    host.refreshHud()
    host.say([`饰品摊：这一件你已经有了。`, `换成 100 焰币吧。还是千灯节，别空手走。`])
    host.toast('获得 100 焰币')
    return
  }
  GameState.addItem(gift.id, 1)
  host.refreshHud()
  host.say([`饰品摊：今天轮到「${gift.name}」。`, ITEMS[gift.id].desc, '没有战力加成，挂上就好看。'])
  host.toast(`获得了重要物品「${gift.name}」`)
}

export const POSTGAME_STORIES: Record<string, StoryFn> = {
  trace_mochen: mochen,
  trace_pass: spot('trace_pass'),
  trace_lake: spot('trace_lake'),
  trace_forest: spot('trace_forest'),
  trace_town: spot('trace_town'),
  trace_tower: spot('trace_tower'),
  fest_stall: festStall,
}
