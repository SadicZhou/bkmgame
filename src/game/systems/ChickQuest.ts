/**
 * 支线 S7-1「迷路的雏鸟」：从羽毛岛抱雏鸟，滑翔送到各岛巢穴，奖技能书顺风
 * @author zjh
 * @date 2026-10-22
 */

import { GameState } from '../state/GameState'
import { MAPS } from '../data/maps'

/** 一只待送回的雏鸟 */
export interface ChickDef {
  id: string
  /** 巢所在地图 */
  nestMap: string
  homeFlag: string
  pickFlag: string
  /** 短称呼 */
  label: string
}

export const CHICKS: ChickDef[] = [
  { id: 'start', nestMap: 'cloudstart', homeFlag: 'chick_home_start', pickFlag: 'chick_picked_start', label: '起风岛' },
  { id: 'mill', nestMap: 'cloudmill', homeFlag: 'chick_home_mill', pickFlag: 'chick_picked_mill', label: '风车岛' },
  { id: 'bridge', nestMap: 'cloudbridge', homeFlag: 'chick_home_bridge', pickFlag: 'chick_picked_bridge', label: '断桥岛' },
  { id: 'shrine', nestMap: 'cloudshrine', homeFlag: 'chick_home_shrine', pickFlag: 'chick_picked_shrine', label: '神殿' },
]

export const CHICKS_DONE_FLAG = 'side_chicks_done'
export const CHICK_CARRY_FLAG = 'chick_carry'

export function chickById(id: string): ChickDef | undefined {
  return CHICKS.find((c) => c.id === id)
}

/** 怀里揣着的雏鸟 id */
export function carryingChick(): string | null {
  const v = GameState.getFlag(CHICK_CARRY_FLAG)
  return typeof v === 'string' && v ? v : null
}

/** 已送回家几只 */
export function chicksHomeCount(): number {
  return CHICKS.filter((c) => GameState.hasFlag(c.homeFlag)).length
}

/** 还有几只在外 */
export function chicksLeft(): number {
  return CHICKS.length - chicksHomeCount()
}

/**
 * 抱起雏鸟；已抱着别的或已回家则返回原因
 * @author zjh
 * @date 2026-10-22
 */
export function pickChick(id: string): { ok: true; lines: string[] } | { ok: false; reason: string } {
  const chick = chickById(id)
  if (!chick) return { ok: false, reason: '没有这只雏鸟。' }
  if (GameState.hasFlag(chick.homeFlag)) return { ok: false, reason: '它已经在自己的巢里了。' }
  if (GameState.hasFlag(chick.pickFlag)) return { ok: false, reason: '它已经在你怀里了。' }
  const hold = carryingChick()
  if (hold) {
    const other = chickById(hold)
    return { ok: false, reason: `你怀里已经有一只要去${other?.label ?? ''}的雏鸟了。先送到巢再来。` }
  }
  GameState.setFlag(chick.pickFlag, true)
  GameState.setFlag(CHICK_CARRY_FLAG, id)
  GameState.setFlag('side_chicks', true)
  const nest = MAPS[chick.nestMap]?.name ?? chick.label
  return {
    ok: true,
    lines: [
      `（轻轻抱起一只发抖的雏鸟。它要回「${nest}」的巢。）`,
      '（站上风口滑翔过去，找到岛上的空巢，把小家伙放回去。）',
    ],
  }
}

/**
 * 在当前地图尝试放回巢中
 * @author zjh
 * @date 2026-10-22
 */
export function deliverChickAt(mapId: string): { lines: string[]; justDone: boolean } | null {
  const hold = carryingChick()
  if (!hold) {
    return {
      lines: ['空巢里铺着软软的云絮。', '（羽毛岛上还有迷路的雏鸟，可以抱来这里。）'],
      justDone: false,
    }
  }
  const chick = chickById(hold)
  if (!chick) return null
  if (chick.nestMap !== mapId) {
    const want = MAPS[chick.nestMap]?.name ?? chick.label
    return {
      lines: [`（怀里的雏鸟往${want}的方向扭头，不肯进这个巢。）`],
      justDone: false,
    }
  }
  GameState.setFlag(chick.homeFlag, true)
  GameState.clearFlag(chick.pickFlag)
  GameState.clearFlag(CHICK_CARRY_FLAG)
  const left = chicksLeft()
  const lines = [`（雏鸟扑进巢里，叽叽叫了两声，像在道谢。）`, `（迷路的雏鸟 ${chicksHomeCount()}/${CHICKS.length}）`]
  if (left === 0) {
    lines.push('（四只都回家了。回羽毛岛找鸟妈妈领谢礼吧。）')
    return { lines, justDone: true }
  }
  lines.push(`（还剩 ${left} 只。回羽毛岛再抱一只。）`)
  return { lines, justDone: false }
}

/**
 * 鸟妈妈发奖：技能书顺风
 * @author zjh
 * @date 2026-10-22
 */
export function claimChickReward(): { lines: string[]; gotBook: boolean } | null {
  if (chicksLeft() > 0 || GameState.hasFlag(CHICKS_DONE_FLAG)) return null
  GameState.setFlag(CHICKS_DONE_FLAG, true)
  GameState.addItem('book_tailwind', 1)
  return {
    gotBook: true,
    lines: [
      '谢谢你把孩子们送回来。风里少了它们，岛都安静得不像话。',
      '这本「顺风」给你——风系伙伴学会后，能推着大家更快出手。',
    ],
  }
}

/** HUD 短句：怀里有雏鸟时 */
export function chickHudLine(): string | null {
  const hold = carryingChick()
  if (!hold) return null
  const chick = chickById(hold)
  if (!chick) return null
  return `♡ 雏鸟→${MAPS[chick.nestMap]?.name ?? chick.label}`
}
