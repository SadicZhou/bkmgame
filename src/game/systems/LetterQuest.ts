/**
 * 支线 S7-3「风羽的信」：把鸢的五封短信送给旧友，完成后白风羽在战斗开场为全队提速
 * @author zjh
 * @date 2026-10-22
 */

import type { NpcDef } from '../data/maps'
import { GameState } from '../state/GameState'
import { say, volOf, type BattleState } from './BattleCore'

/** 一封待送的信 */
export interface LetterDef {
  id: string
  /** 显示用称呼 */
  place: string
  flag: string
  /** 匹配 NPC.story */
  stories?: string[]
  /** 匹配 NPC.id */
  npcIds?: string[]
  /** 须先完成的旗标（避免挡首次赠礼） */
  requireFlag?: string
  /** 须先持有的道具 */
  requireItem?: string
  reply: string
}

export const LETTERS: LetterDef[] = [
  {
    id: 'moss_forest',
    place: '苔',
    flag: 'letter_moss',
    stories: ['forest_moss'],
    npcIds: ['forest_moss', 'forest_moss2'],
    requireFlag: 'forest_met_moss',
    reply: '鸢的字……他还记得我教他认蘑菇的事。谢谢你捎来。',
  },
  {
    id: 'moss_meadow',
    place: '苔',
    flag: 'letter_moss',
    npcIds: ['ranger'],
    requireFlag: 'ranger_beaten',
    reply: '鸢的字……他还记得我教他认蘑菇的事。谢谢你捎来。',
  },
  {
    id: 'peak',
    place: '峰',
    flag: 'letter_peak',
    stories: ['canyon_peak'],
    npcIds: ['canyon_peak'],
    requireItem: 'strength_gloves',
    reply: '哈！那小子还会写信？字歪歪扭扭的，倒是有劲。替我回他一声：下次比腕力。',
  },
  {
    id: 'shio',
    place: '汐',
    flag: 'letter_shio',
    stories: ['lake_shio'],
    requireFlag: 'whale_beaten',
    reply: '鸢……云上的风，终于肯落到湖边了。告诉他，温泉还替他留着。',
  },
  {
    id: 'hammer',
    place: '锤婆',
    flag: 'letter_hammer',
    stories: ['hammer_granny'],
    requireFlag: 'canyon_met_granny',
    reply: '这羽毛信……是鸢那孩子的。他小时候老往炉边凑。谢谢你，旅人。',
  },
  {
    id: 'elder',
    place: '雪伯',
    flag: 'letter_elder',
    stories: ['frost_elder'],
    requireItem: 'hearth_stone',
    reply: '云上的孩子还记得霜铃的铃。等冰铃再响的时候，也请他回来听一听。',
  },
]

export const LETTERS_DONE_FLAG = 'side_letters_done'

/** 五封信对应的旗标（苔在草地/回音林共用同一旗） */
export const LETTER_FLAGS = ['letter_moss', 'letter_peak', 'letter_shio', 'letter_hammer', 'letter_elder'] as const

/** 支线是否已开启（击败鸢并拿到白风羽） */
export function lettersActive(): boolean {
  return GameState.hasFlag('kite_beaten') && GameState.itemCount('white_feather') > 0
}

/** 已送达几封 */
export function lettersDelivered(): number {
  return LETTER_FLAGS.filter((f) => GameState.hasFlag(f)).length
}

/** 还差几封 */
export function lettersLeft(): number {
  return LETTER_FLAGS.length - lettersDelivered()
}

/**
 * 该 NPC 此刻是否可以送信
 * @author zjh
 * @date 2026-10-22
 */
export function canDeliverTo(npc: NpcDef): LetterDef | null {
  if (!lettersActive() || GameState.hasFlag(LETTERS_DONE_FLAG)) return null
  const letter = LETTERS.find(
    (l) =>
      (!!npc.story && l.stories?.includes(npc.story)) || l.npcIds?.includes(npc.id),
  )
  if (!letter || GameState.hasFlag(letter.flag)) return null
  if (letter.requireFlag && !GameState.hasFlag(letter.requireFlag)) return null
  if (letter.requireItem && GameState.itemCount(letter.requireItem) <= 0) return null
  return letter
}

/**
 * 送达一封；返回对话行（含完成提示）
 * @author zjh
 * @date 2026-10-22
 */
export function deliverLetter(letter: LetterDef, npcName: string): { lines: string[]; justDone: boolean } {
  GameState.setFlag(letter.flag, true)
  const left = lettersLeft()
  const lines = [`（把鸢的短信交给了${letter.place}。）`, `${npcName}：${letter.reply}`]
  if (left === 0) {
    GameState.setFlag(LETTERS_DONE_FLAG, true)
    lines.push('（五封信都送到了。白风羽微微发亮——出战时会为全队提速。）')
    return { lines, justDone: true }
  }
  lines.push(`（还剩 ${left} 封信要送。）`)
  return { lines, justDone: false }
}

/**
 * 战斗开场：支线完成后白风羽令全队速度 +1 阶
 * @author zjh
 * @date 2026-10-22
 */
export function applyWhiteFeather(s: BattleState): void {
  if (!GameState.hasFlag(LETTERS_DONE_FLAG) || GameState.itemCount('white_feather') <= 0) return
  let any = false
  for (const c of s.playerParty) {
    if (c.hp <= 0) continue
    const vol = volOf(s, c)
    const next = Math.min(3, vol.stages.spd + 1)
    if (next !== vol.stages.spd) {
      vol.stages.spd = next
      any = true
    }
  }
  if (any) say(s, '白风羽轻轻一颤，全队的速度提升了！', 'buffPlayer')
}
