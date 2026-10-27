/**
 * 第五章剧情：星图师穗、避雷针、双子朔与望
 * @author zjh
 * @date 2026-10-16
 */

import { GameState } from '../../state/GameState'
import { Sfx } from '../../systems/AudioBeeps'
import { CARAVAN_DONE, CARAVAN_NEED, beginCaravan } from '../../systems/CaravanQuest'
import { DUNE_FLAGS, ROD_IDS, canChargeRod, rodFlag, rodsLit } from '../../systems/Dunes'
import type { StoryHost } from './StoryEvents'

const flag = (k: string) => GameState.getFlag(k)

function sui(host: StoryHost, name: string): void {
  const say = (lines: string[]) => host.say(lines.map((l) => `${name}：${l}`))
  if (GameState.hasFlag('game_clear') && GameState.hasFlag(DUNE_FLAGS.chart)) {
    if (!GameState.getFlag('rift_seed')) GameState.setFlag('rift_seed', Math.max(1, GameState.day()))
    host.say(
      [
        `${name}：星图背面还有一层。通关之后它才肯打开。`,
        `${name}：五层小路，每天的弯都不一样。你这次的路，我已经替你钉住了。`,
        `${name}：最深处有一只很少露面的伙伴。打赢，它会跟着你。`,
      ],
      () => host.travel('rift1', 5, 6),
    )
    return
  }
  if (GameState.hasFlag('chapter6_done') && !GameState.hasFlag('cloud_unlocked')) {
    GameState.addItem('star_glider', 1)
    GameState.setFlag('cloud_unlocked', true)
    Sfx.win()
    say([
      '我又算了一遍。第七颗星不在地上。',
      '它在云上。霜铃峰的风柱，刚好对着它。',
      '所以我做了这个。星砂布，竹骨，一架小翅膀。',
      '站在风柱边上，面朝风，按确认。掉下来会被云接住。……大概。',
    ])
    host.toast('获得了重要物品「星砂滑翔翼」')
    return
  }
  if (GameState.hasFlag('cloud_unlocked')) {
    say(['第七颗星在云上。', '霜铃峰北侧的风柱，面朝它按确认就能滑过去。'])
    return
  }
  if (GameState.hasFlag(DUNE_FLAGS.chart)) {
    say(['沙暴来的时候别往远处看，跟着避雷针的光走。', '落雷是四拍：亮、暗、暗、落。落的那一拍，别站在黄圈里。'])
    return
  }
  GameState.addItem('charge_bottle', 1)
  GameState.setFlag(DUNE_FLAGS.chart, true)
  Sfx.win()
  say([
    '你从峡谷那边来的吧。荒原上的雷，不是天气，是雷鸣隼在喊。',
    '菜单里多了一页「星图」。九座灯台，亮过的星我都标上了。',
    '这瓶蓄雷液给你。队伍里没有雷系伙伴的话，用它也能给避雷针充电。',
    '四根都亮了，雷心坑的路才会开。',
  ])
}

function twins(host: StoryHost, name: string): void {
  GameState.setFlag(DUNE_FLAGS.twins, true)
  host.say(
    [
      `${name}：……雷心还没开。`,
      '望：我们不打架。霜铃峰的冰，比这里的雷更需要人。',
      '朔：等你点亮第五颗星，到山上去找我们。',
      '（两个影子没入沙暴，朝北去了。）',
    ],
    () => host.refreshNpcs(),
  )
}

/**
 * 点亮一根避雷针。四根都亮时打开石门
 * @author zjh
 * @date 2026-10-16
 */
function rod(i: number): (host: StoryHost, name: string) => void {
  return (host, name) => {
    const say = (lines: string[], after?: () => void) => host.say(lines.map((l) => `${name}：${l}`), after)
    if (flag(rodFlag(i))) {
      say(['已经亮着了。'])
      return
    }
    if (!canChargeRod(GameState.party, GameState.itemCount('charge_bottle') > 0)) {
      say(['针是凉的。', '需要雷系的伙伴，或者穗的蓄雷瓶。'])
      return
    }
    GameState.setFlag(rodFlag(i), true)
    Sfx.confirm()
    if (rodsLit(flag)) {
      GameState.setFlag(DUNE_FLAGS.rods, true)
      say(['四根避雷针一起亮了。', '雷心坑的石门开了。落雷也安静了一点。'], () => host.redraw())
      return
    }
    const left = ROD_IDS.filter((n) => !flag(rodFlag(n))).length
    say([`这根亮了。还剩 ${left} 根。`])
  }
}

/**
 * 沙丘商队：沙暴中接护送；完成后提示去买货（商店由互动层打开）
 * @author zjh
 * @date 2026-10-27
 */
function caravan(host: StoryHost, name: string): void {
  if (GameState.hasFlag(CARAVAN_DONE)) {
    host.say([`${name}：货摊开着。满格电池和资质卡都有——沙路上用得着。`])
    return
  }
  const result = beginCaravan()
  if ('reason' in result) {
    host.say([`${name}：${result.reason.replace(/^队长：/, '')}`])
    return
  }
  host.say(
    result.lines,
    () => {
      host.toast(`沙丘商队 · 护送 0/${CARAVAN_NEED}`)
      host.refreshHud()
    },
  )
}

export const DUNE_STORIES = {
  dune_sui: sui,
  dune_twins: twins,
  dune_rod_1: rod(1),
  dune_rod_2: rod(2),
  dune_rod_3: rod(3),
  dune_rod_4: rod(4),
  dune_caravan: caravan,
}
