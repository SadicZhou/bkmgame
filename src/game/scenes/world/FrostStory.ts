/**
 * 第六章剧情：雪伯的暖炉石、泉守汐、篝火取暖
 * @author zjh
 * @date 2026-10-16
 */

import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { FROST_FLAGS, warmCold } from '../../systems/Frost'
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

export const FROST_STORIES = {
  frost_elder: elder,
  frost_shio: shio,
  frost_fire: fire,
}
