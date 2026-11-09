/**
 * 支线 S0-2「小镇送信」：阿禾拜托把 4 封短信送给镇里人家，奖急救喷雾 ×3
 * @author zjh
 * @date 2026-11-09
 */

import type { NpcDef } from '../data/maps'
import { GameState } from '../state/GameState'

export interface TownMailDef {
  id: string
  flag: string
  npcIds: string[]
  place: string
  reply: string
}

/** 四户：绕镇走一圈的教学对象 */
export const TOWN_MAILS: TownMailDef[] = [
  {
    id: 'farmer',
    flag: 'town_mail_farmer',
    npcIds: ['town_farmer'],
    place: '阿田',
    reply: '阿禾的字！他说番茄熟了可以分我？哈哈哈，谢啦旅人！',
  },
  {
    id: 'florist',
    flag: 'town_mail_florist',
    npcIds: ['town_florist'],
    place: '铃',
    reply: '一封香香的信……阿禾说晨曦花开了要记得告诉旅人。谢谢你～',
  },
  {
    id: 'shop',
    flag: 'town_mail_shop',
    npcIds: ['shop'],
    place: '麦',
    reply: '阿禾还记得我进货日？行，喷雾给你留着，有需要来摊上。',
  },
  {
    id: 'granny',
    flag: 'town_mail_granny',
    npcIds: ['granny'],
    place: '记忆婆婆',
    reply: '阿禾这孩子……还惦记着让我少操心。信我收下了，谢谢你。',
  },
]

export const TOWN_MAIL_STARTED = 'side_town_mail_started'
export const TOWN_MAIL_DONE = 'side_town_mail_done'
export const TOWN_MAIL_FLAGS = TOWN_MAILS.map((m) => m.flag)
export const TOWN_MAIL_REWARD_ITEM = 'potion'
export const TOWN_MAIL_REWARD_COUNT = 3

export function townMailsDelivered(): number {
  return TOWN_MAIL_FLAGS.filter((f) => GameState.hasFlag(f)).length
}

export function townMailsLeft(): number {
  return TOWN_MAILS.length - townMailsDelivered()
}

export function townMailActive(): boolean {
  return GameState.hasFlag(TOWN_MAIL_STARTED) && !GameState.hasFlag(TOWN_MAIL_DONE)
}

/**
 * 阿禾处接取 / 催进度 / 领奖
 * @author zjh
 * @date 2026-11-09
 */
export function talkTownMailElder():
  | { kind: 'start'; lines: string[] }
  | { kind: 'wait'; lines: string[] }
  | { kind: 'reward'; lines: string[] }
  | { kind: 'skip' } {
  if (GameState.hasFlag(TOWN_MAIL_DONE)) return { kind: 'skip' }
  if (!GameState.hasFlag(TOWN_MAIL_STARTED)) {
    GameState.setFlag(TOWN_MAIL_STARTED, true)
    return {
      kind: 'start',
      lines: [
        '欢迎来到晨曦小镇，焰迹旅人。',
        '正好有四封短信，想麻烦你在镇子里走一圈——认人、认路，都从这一步开始。',
        '分别交给阿田、卖花的铃、杂货商麦，还有记忆婆婆。',
        '送齐了再回来，我备了急救喷雾。之后东边青苔草地找巡护员苔，他会放你进山道。',
      ],
    }
  }
  const left = townMailsLeft()
  if (left > 0) {
    return {
      kind: 'wait',
      lines: [
        `还有 ${left} 封没送到。阿田在田边，铃守花摊，麦在杂货摊，婆婆在西南角。`,
        '镇不大，慢慢走就好。',
      ],
    }
  }
  GameState.setFlag(TOWN_MAIL_DONE, true)
  GameState.addItem(TOWN_MAIL_REWARD_ITEM, TOWN_MAIL_REWARD_COUNT)
  return {
    kind: 'reward',
    lines: [
      '四封都送到了？你脚步很稳。',
      `这 ${TOWN_MAIL_REWARD_COUNT} 罐急救喷雾收下。东边草地见了苔，可别忘了伤药。`,
    ],
  }
}

/**
 * 该 NPC 是否可送达镇内短信
 * @author zjh
 * @date 2026-11-09
 */
export function canDeliverTownMail(npc: NpcDef): TownMailDef | null {
  if (!townMailActive()) return null
  const mail = TOWN_MAILS.find((m) => m.npcIds.includes(npc.id))
  if (!mail || GameState.hasFlag(mail.flag)) return null
  return mail
}

/**
 * 送达一封镇内短信
 * @author zjh
 * @date 2026-11-09
 */
export function deliverTownMail(mail: TownMailDef, npcName: string): { lines: string[]; allDone: boolean } {
  GameState.setFlag(mail.flag, true)
  const left = townMailsLeft()
  const lines = [`（把阿禾的短信交给了${mail.place}。）`, `${npcName}：${mail.reply}`]
  if (left === 0) {
    lines.push('（四封都送到了。回旅长阿禾那里领谢礼吧。）')
    return { lines, allDone: true }
  }
  lines.push(`（还剩 ${left} 封信。）`)
  return { lines, allDone: false }
}
