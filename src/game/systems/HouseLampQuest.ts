/**
 * 支线 S8-1「一家一盏灯」：第八章后收集 8 根灯芯，送给小镇八户，奖灯芯饰品（灵系 ×1.05）
 * @author zjh
 * @date 2026-10-23
 */

import type { NpcDef } from '../data/maps'
import { GameState } from '../state/GameState'

/** 可送达的一户 */
export interface HouseDef {
  id: string
  flag: string
  /** 匹配 NPC.id */
  npcIds: string[]
  place: string
  reply: string
}

export const HOUSES: HouseDef[] = [
  {
    id: 'ahe',
    flag: 'lamp_house_ahe',
    npcIds: ['elder'],
    place: '阿禾',
    reply: '一盏新灯……小路教你的？谢谢。镇子会记得这光。',
  },
  {
    id: 'kid',
    flag: 'lamp_house_kid',
    npcIds: ['kid', 'town_sendoff'],
    place: '小路',
    reply: '这盏是我教你做的！挂在窗边，晚上也不会怕黑！',
  },
  {
    id: 'shop',
    flag: 'lamp_house_shop',
    npcIds: ['shop'],
    place: '麦',
    reply: '摊前亮堂了，客人好找货。谢啦，旅人。',
  },
  {
    id: 'granny',
    flag: 'lamp_house_granny',
    npcIds: ['granny'],
    place: '记忆婆婆',
    reply: '老了，眼睛花。有这盏灯，记招式也不那么费劲了。',
  },
  {
    id: 'storage',
    flag: 'lamp_house_storage',
    npcIds: ['storage'],
    place: '纳',
    reply: '寄存所夜里也要照看伙伴。灯来了，它们睡得安稳。',
  },
  {
    id: 'healer',
    flag: 'lamp_house_healer',
    npcIds: ['healer'],
    place: '岚',
    reply: '小屋窗台上正好缺一盏。伤药的气味，配着灯，会暖一些。',
  },
  {
    id: 'farmer',
    flag: 'lamp_house_farmer',
    npcIds: ['town_farmer'],
    place: '阿田',
    reply: '田埂边挂一盏，夜里看番茄也清楚！哈哈哈！',
  },
  {
    id: 'florist',
    flag: 'lamp_house_florist',
    npcIds: ['town_florist'],
    place: '铃',
    reply: '花摊有了灯，晨曦花晚上也会亮一点点。谢谢你～',
  },
]

/** 野外可捡的灯芯点（id 与道具 house_wick_N 对应） */
export const WICK_SPOTS = [
  { id: '1', flag: 'got_house_wick_1', mapId: 'town', x: 2, y: 5, line: '井边草丛里卷着一根软灯芯。' },
  { id: '2', flag: 'got_house_wick_2', mapId: 'town', x: 13, y: 9, line: '告示板后掉落一根灯芯。' },
  { id: '3', flag: 'got_house_wick_3', mapId: 'meadow', x: 5, y: 8, line: '小路边的石头缝里夹着灯芯。' },
  { id: '4', flag: 'got_house_wick_4', mapId: 'meadow', x: 14, y: 5, line: '高草里露出一小截灯芯。' },
  { id: '5', flag: 'got_house_wick_5', mapId: 'cabin', x: 2, y: 2, line: '小屋壁炉旁抽屉里的备用灯芯。' },
  { id: '6', flag: 'got_house_wick_6', mapId: 'cabin', x: 7, y: 2, line: '窗台下压着一根未用的灯芯。' },
  { id: '7', flag: 'got_house_wick_7', mapId: 'pass', x: 5, y: 17, line: '山道入口的石缝里塞着灯芯。' },
  { id: '8', flag: 'got_house_wick_8', mapId: 'pass', x: 4, y: 9, line: '温泉旁晒着的灯芯，还带着热气。' },
] as const

export const LAMPS_DONE = 'side_lamps_done'
export const LAMPS_STARTED = 'side_lamps_started'
export const HOUSE_WICK = 'house_wick'
export const WICK_CHARM = 'wick_charm'

export const HOUSE_FLAGS = HOUSES.map((h) => h.flag)

export function lampsDelivered(): number {
  return HOUSE_FLAGS.filter((f) => GameState.hasFlag(f)).length
}

export function wicksPicked(): number {
  return WICK_SPOTS.filter((s) => GameState.hasFlag(s.flag)).length
}

export function lampsActive(): boolean {
  return GameState.hasFlag('chapter8_done') && !GameState.hasFlag(LAMPS_DONE)
}

/** 开始支线（书架旁的灯芯筐 / 小路说明） */
export function beginLamps(): { lines: string[] } {
  GameState.setFlag(LAMPS_STARTED, true)
  return {
    lines: [
      '小路在筐边留了字条：',
      '「帮我把灯芯做成小灯，送给镇上八户人家吧！灯芯散在镇子、草地、小屋和山道。」',
      '「送齐八盏，我把妈妈教的『灯芯饰』送给你。」',
    ],
  }
}

/**
 * 捡灯芯
 * @author zjh
 * @date 2026-10-23
 */
export function pickHouseWick(spotId: string): { lines: string[] } | { reason: string } {
  if (!GameState.hasFlag('chapter8_done')) return { reason: '（灯芯还软着，现在捡不起来。）' }
  const spot = WICK_SPOTS.find((s) => s.id === spotId)
  if (!spot) return { reason: '没有这根灯芯。' }
  if (GameState.hasFlag(spot.flag)) return { reason: '这里已经捡过了。' }
  GameState.setFlag(spot.flag, true)
  GameState.setFlag(LAMPS_STARTED, true)
  GameState.addItem(HOUSE_WICK, 1)
  return {
    lines: [spot.line, `拿到了灯芯。（灯芯 ${wicksPicked()}/${WICK_SPOTS.length} · 已送 ${lampsDelivered()}/${HOUSES.length} 户）`],
  }
}

/**
 * 该 NPC 是否可送灯（需持有至少一根灯芯）
 * @author zjh
 * @date 2026-10-23
 */
export function canDeliverLamp(npc: NpcDef): HouseDef | null {
  if (!lampsActive() || !GameState.hasFlag(LAMPS_STARTED)) return null
  if (GameState.itemCount(HOUSE_WICK) <= 0) return null
  const house = HOUSES.find((h) => h.npcIds.includes(npc.id))
  if (!house || GameState.hasFlag(house.flag)) return null
  return house
}

/**
 * 送达一户
 * @author zjh
 * @date 2026-10-23
 */
export function deliverLamp(house: HouseDef, npcName: string): { lines: string[]; justDone: boolean } {
  GameState.consumeItem(HOUSE_WICK)
  GameState.setFlag(house.flag, true)
  const left = HOUSES.length - lampsDelivered()
  const lines = [`（把小灯交给了${house.place}。）`, `${npcName}：${house.reply}`]
  if (left === 0) {
    GameState.setFlag(LAMPS_DONE, true)
    GameState.addItem(WICK_CHARM, 1)
    lines.push('（八户都亮了。小路托人捎来「灯芯饰」——灵系招式会稍稍更亮。）')
    return { lines, justDone: true }
  }
  lines.push(`（还剩 ${left} 户要送。灯芯还剩 ${GameState.itemCount(HOUSE_WICK)} 根。）`)
  return { lines, justDone: false }
}
