/**
 * 支线 S8-1「一家一盏灯」剧情：灯芯筐接取与捡芯
 * @author zjh
 * @date 2026-10-23
 */

import { GameState } from '../../state/GameState'
import {
  LAMPS_DONE,
  LAMPS_STARTED,
  WICK_CHARM,
  beginLamps,
  lampsDelivered,
  pickHouseWick,
} from '../../systems/HouseLampQuest'
import type { StoryFn, StoryHost } from './StoryEvents'

/**
 * 广场灯芯筐：接取 / 进度
 * @author zjh
 * @date 2026-10-23
 */
function lampBasket(host: StoryHost): void {
  if (GameState.hasFlag(LAMPS_DONE)) {
    host.say(['筐空了。八户的灯都亮着。', `灯芯饰在你身上：${GameState.itemCount(WICK_CHARM) > 0 ? '灵系招式会亮一点。' : '……咦，饰品呢？'}`])
    return
  }
  if (!GameState.hasFlag('chapter8_done')) {
    host.say(['筐里码着软灯芯。小路说，等全镇的灯都回来了再动它们。'])
    return
  }
  if (!GameState.hasFlag(LAMPS_STARTED)) {
    const { lines } = beginLamps()
    host.say(lines, () => {
      host.toast('支线「一家一盏灯」开始')
      host.refreshHud()
    })
    return
  }
  host.say([
    `已送 ${lampsDelivered()}/8 户。灯芯在镇子、青苔草地、旅人小屋和余烬山道。`,
    '拿到灯芯后，去跟阿禾、小路、麦、婆婆、纳、岚、阿田、铃说话就能送灯。',
  ])
}

function pickWick(spotId: string): StoryFn {
  return (host) => {
    const result = pickHouseWick(spotId)
    if ('reason' in result) {
      host.say([result.reason])
      return
    }
    host.say(result.lines, () => host.refreshNpcs())
  }
}

export const HOUSE_LAMP_STORIES: Record<string, StoryFn> = {
  lamp_basket: lampBasket,
  pick_house_wick_1: pickWick('1'),
  pick_house_wick_2: pickWick('2'),
  pick_house_wick_3: pickWick('3'),
  pick_house_wick_4: pickWick('4'),
  pick_house_wick_5: pickWick('5'),
  pick_house_wick_6: pickWick('6'),
  pick_house_wick_7: pickWick('7'),
  pick_house_wick_8: pickWick('8'),
}
