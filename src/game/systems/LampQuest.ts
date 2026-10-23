/**
 * 支线 S8-1「一家一盏灯」：第八章后帮小路把八盏小灯送给镇上人家，奖灯芯饰品
 * @author zjh
 * @date 2026-10-23
 */

import type { NpcDef } from '../data/maps'
import { GameState } from '../state/GameState'

/** 一户待送灯人家 */
export interface LampHome {
  id: string
  flag: string
  place: string
  npcIds: string[]
  reply: string
}

export const LAMP_HOMES: LampHome[] = [
  {
    id: 'ahe',
    flag: 'lamp_home_ahe',
    place: '阿禾',
    npcIds: ['elder'],
    reply: '小路的灯……放在窗台上正好。谢谢你，旅人。',
  },
  {
    id: 'mai',
    flag: 'lamp_home_mai',
    place: '杂货商麦',
    npcIds: ['shop'],
    reply: '夜里卖东西也亮堂了。这盏我挂柜台边。',
  },
  {
    id: 'granny',
    flag: 'lamp_home_granny',
    place: '记忆婆婆',
    npcIds: ['granny'],
    reply: '暖乎乎的。想技能的时候，看着灯就不慌了。',
  },
  {
    id: 'na',
    flag: 'lamp_home_na',
    place: '寄存员纳',
    npcIds: ['storage'],
    reply: '寄存所角落终于不那么黑了。伙伴们也会喜欢。',
  },
  {
    id: 'lan',
    flag: 'lamp_home_lan',
    place: '疗愈师岚',
    npcIds: ['healer'],
    reply: '小屋里多一盏灯，伤药的颜色都看得更清楚。',
  },
  {
    id: 'tian',
    flag: 'lamp_home_tian',
    place: '农夫阿田',
    npcIds: ['town_farmer'],
    reply: '田埂边也要点灯？行啊，吓跑偷番茄的岩甲虫。',
  },
  {
    id: 'ling',
    flag: 'lamp_home_ling',
    place: '卖花姑娘铃',
    npcIds: ['town_florist'],
    reply: '花和灯摆一起，傍晚会更香。谢谢！',
  },
  {
    id: 'well',
    flag: 'lamp_home_well',
    place: '井边婶',
    npcIds: ['town_well'],
    reply: '井口有灯，夜里打水就不怕脚滑了。',
  },
]

export const LAMPS_DONE = 'side_lamps_done'
export const LAMPS_STARTED = 'side_lamps_started'
export const HOUSE_LAMP = 'house_lamp'
export const WICK_CHARM = 'wick_charm'

export const LAMP_HOME_FLAGS = LAMP_HOMES.map((h) => h.flag)

export function lampsDelivered(): number {
  return LAMP_HOME_FLAGS.filter((f) => GameState.hasFlag(f)).length
}

export function lampsLeft(): number {
  return LAMP_HOMES.length - lampsDelivered()
}

export function lampsActive(): boolean {
  return GameState.hasFlag(LAMPS_STARTED) && !GameState.hasFlag(LAMPS_DONE)
}

/**
 * 小路开启支线：发齐八盏小灯
 * @author zjh
 * @date 2026-10-23
 */
export function startLampQuest(): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag('chapter8_done')) return { reason: '（小路还在忙着做灯。）' }
  if (GameState.hasFlag(LAMPS_DONE)) {
    return { reason: '八户的灯都亮了。千灯节的时候，还会更热闹。' }
  }
  if (GameState.hasFlag(LAMPS_STARTED)) {
    return {
      reason: `还剩 ${lampsLeft()} 盏要送：阿禾、麦、婆婆、纳、岚、阿田、铃，还有井边婶。`,
    }
  }
  GameState.setFlag(LAMPS_STARTED, true)
  GameState.addItem(HOUSE_LAMP, LAMP_HOMES.length)
  return {
    lines: [
      '小路：我做了八盏小灯！钟楼亮了以后，我想让每家窗台都亮一点。',
      '小路：帮我送给阿禾、麦叔叔、记忆婆婆、寄存的纳、小屋里的岚、阿田、铃，还有井边婶好不好？',
      `（得到了小灯 ×${LAMP_HOMES.length}。）`,
    ],
  }
}

/** 是否可向该 NPC 送灯 */
export function canDeliverLamp(npc: NpcDef): LampHome | null {
  if (!lampsActive() || GameState.itemCount(HOUSE_LAMP) <= 0) return null
  const home = LAMP_HOMES.find((h) => h.npcIds.includes(npc.id))
  if (!home || GameState.hasFlag(home.flag)) return null
  return home
}

/**
 * 送达一盏
 * @author zjh
 * @date 2026-10-23
 */
export function deliverLamp(home: LampHome, npcName: string): { lines: string[]; justDone: boolean } {
  GameState.setFlag(home.flag, true)
  GameState.consumeItem(HOUSE_LAMP)
  const left = lampsLeft()
  const lines = [`（把小路的小灯交给了${home.place}。）`, `${npcName}：${home.reply}`]
  if (left === 0) {
    GameState.setFlag(LAMPS_DONE, true)
    GameState.addItem(WICK_CHARM, 1)
    lines.push('（八户窗台都亮了。小路塞给你一枚灯芯饰——灵系招式会更亮一点。）')
    return { lines, justDone: true }
  }
  lines.push(`（还剩 ${left} 盏要送。背包里还有小灯 ×${GameState.itemCount(HOUSE_LAMP)}。）`)
  return { lines, justDone: false }
}
