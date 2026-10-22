/**
 * 第六章剧情：雪伯的暖炉石、泉守汐、篝火取暖、雪人大赛
 * @author zjh
 * @date 2026-10-22
 */

import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { FROST_FLAGS, warmCold } from '../../systems/Frost'
import {
  SNOWMAN_DONE_FLAG,
  SNOWMAN_PARTS,
  buildSnowman,
  pickSnowPart,
  snowmanPartsCount,
  snowmanPartsReady,
} from '../../systems/SnowmanQuest'
import type { StoryHost } from './StoryEvents'

function elder(host: StoryHost, name: string): void {
  const say = (lines: string[]) => host.say(lines.map((l) => `${name}：${l}`))
  if (GameState.hasFlag(FROST_FLAGS.chapter)) {
    say(['春天……来了。', '你听见了吗？冰铃响了。'])
    return
  }
  if (GameState.itemCount('hearth_stone') > 0) {
    say(['已经三个月没有春天了。', '峰顶的冰铃一个都没响。路上冷，记得在篝火边停一停。'])
    return
  }
  GameState.addItem('hearth_stone', 1)
  Sfx.win()
  say([
    '已经三个月没有春天了。',
    '以前每到冬至，峰顶的冰铃会一齐响，那是春天来敲门。今年，一个都没响。',
    '上山的路很冷。拿着这个暖炉石，在篝火边按确认，就能重新烧热。',
  ])
}

function shio(host: StoryHost, name: string): void {
  GameState.setFlag(FROST_FLAGS.metShio, true)
  host.say([
    `${name}：我从雾泉一路追着冰来到这里。原来源头在这里。`,
    `${name}：冰湖太滑，人走不过去。`,
    `${name}：（她吹了一声口哨）雾泉螈会在冰下帮你指路。`,
    `${name}：看见冰面下发光的地方，那就是能停住的地方。`,
    '汐：最里面那一段，要先把冰块推开，才有地方停脚。怪力手套还在吧？',
  ])
}

function fire(host: StoryHost, name: string): void {
  if (GameState.itemCount('hearth_stone') <= 0) {
    host.say([`${name}：火是暖的，可你没有暖炉石，寒气烘不掉。`])
    return
  }
  const next = warmCold()
  GameState.setFlag('frost_cold', next.cold)
  GameState.setFlag('frost_full_steps', next.fullSteps)
  Sfx.confirm()
  host.say([`${name}：暖炉石烧热了。寒气散了。`], () => host.toast('寒冷消退了'))
}

/**
 * 雪孩：说明大赛材料与进度
 * @author zjh
 * @date 2026-10-22
 */
function snowKid(host: StoryHost, name: string): void {
  const say = (lines: string[]) => host.say(lines.map((l) => `${name}：${l}`))
  GameState.setFlag('side_snowman', true)
  if (GameState.hasFlag(SNOWMAN_DONE_FLAG)) {
    say(['你的雪人还立在台上！围巾暖和不？'])
    return
  }
  if (snowmanPartsReady()) {
    say(['三样都齐了！去那边雪人台堆起来，我们给你打分！'])
    return
  }
  const n = snowmanPartsCount()
  say([
    '冬天太长了，我们要办雪人大赛！',
    '需要圆雪球、炭眼睛、冰胡萝卜。',
    '圆雪球在山上新雪里团，炭在篝火旁，胡萝卜滚出菜窖了。',
    n > 0 ? `你已经有 ${n}/${SNOWMAN_PARTS.length} 样啦。` : '齐了就去雪人台堆！',
  ])
}

function snowPile(host: StoryHost): void {
  const r = buildSnowman()
  if ('reason' in r) {
    host.say([r.reason])
    return
  }
  Sfx.win()
  host.say(r.lines, () => {
    host.toast('获得了重要物品「御寒围巾」')
    host.toast('支线「雪人大赛」完成')
    host.refreshHud()
    host.refreshNpcs()
  })
}

function pickPart(id: (typeof SNOWMAN_PARTS)[number]['id']) {
  return (host: StoryHost): void => {
    const r = pickSnowPart(id)
    if ('reason' in r) {
      host.say([r.reason])
      return
    }
    Sfx.confirm()
    host.say(r.lines, () => {
      host.refreshHud()
      host.refreshNpcs()
    })
  }
}

export const FROST_STORIES = {
  frost_elder: elder,
  frost_shio: shio,
  frost_fire: fire,
  snow_kid: snowKid,
  snow_pile: snowPile,
  pick_snow_ball: pickPart('snow_ball'),
  pick_coal_eyes: pickPart('coal_eyes'),
  pick_ice_carrot: pickPart('ice_carrot'),
}
