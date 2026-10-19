/**
 * 终章：镇口送行、水闸、四音石、推石、绯的拜托
 * @author zjh
 * @date 2026-10-19
 */

import { GameState } from '../../state/GameState'
import { openTowerStairs, pressNote } from '../../systems/Tower'
import type { StoryFn, StoryHost } from './StoryEvents'

/**
 * 第八章之后，小路和阿禾在镇口送你进塔
 * @author zjh
 * @date 2026-10-19
 */
function sendoff(host: StoryHost): void {
  host.say(
    [
      '小路：旅人！我们送你！',
      '阿禾：我跟你一起去。这一次，我不会再晚到。',
      '每个人手里都举着一盏灯。灯海的尽头，是灰烬之塔。',
    ],
    () => host.travel('tower1', 5, 5),
  )
}

/**
 * 拉开第 3 层的水闸
 * @author zjh
 * @date 2026-10-19
 */
function sluice(host: StoryHost): void {
  if (GameState.hasFlag('tower_sluice')) return
  GameState.setFlag('tower_sluice', true)
  host.say(['水闸拉开了。积水退回墙边，路通了。'], () => host.refreshNpcs())
}

/**
 * 按顺序敲音石
 * @author zjh
 * @date 2026-10-19
 */
function note(n: number): StoryFn {
  return (host) => {
    const msg = pressNote(
      n,
      (k) => GameState.hasFlag(k),
      (k, on) => (on ? GameState.setFlag(k, true) : GameState.clearFlag(k)),
    )
    openTowerStairs(
      (k) => GameState.hasFlag(k),
      (k) => GameState.setFlag(k, true),
    )
    host.say([msg])
  }
}

/**
 * 推开挡楼梯的石头
 * @author zjh
 * @date 2026-10-19
 */
function rock(host: StoryHost): void {
  if (GameState.hasFlag('tower_rock_moved')) return
  GameState.setFlag('tower_rock_moved', true)
  openTowerStairs(
    (k) => GameState.hasFlag(k),
    (k) => GameState.setFlag(k, true),
  )
  host.refreshNpcs()
  host.say(['石头让开了。楼梯露出来。'])
}

/**
 * 绯请你别只是打败墨尘
 * @author zjh
 * @date 2026-10-19
 */
function fei(host: StoryHost): void {
  if (GameState.hasFlag('tower_floor_9')) {
    host.say(['绯：去吧。别打败他。让他看见。'])
    return
  }
  host.say(
    [
      '绯：我在这里等你很久了。',
      '绯：首领就在上面。他一个人坐在灯台旁边，一整晚都没说话。',
      '绯：……旅人，帮我一个忙。别打败他。让他看见。',
    ],
    () => {
      GameState.setFlag('tower_floor_9', true)
      host.toast('上面的门开了。')
    },
  )
}

export const TOWER_STORIES: Record<string, StoryFn> = {
  town_sendoff: sendoff,
  tower_sluice: sluice,
  tower_note_1: note(1),
  tower_note_2: note(2),
  tower_note_3: note(3),
  tower_note_4: note(4),
  tower_rock: rock,
  tower_fei: fei,
}
