/**
 * 支线 S5-3「沙丘商队」：沙暴中护送商队穿过 3 次沙暴（各打一场野生战），完成后可开商队商店
 * @author zjh
 * @date 2026-10-27
 */

import { createCreature, type CreatureInstance } from '../data/creatures'
import { GameState } from '../state/GameState'

export const CARAVAN_DONE = 'side_caravan_done'
export const CARAVAN_ACTIVE = 'side_caravan_active'
export const CARAVAN_COUNT = 'caravan_storms'
/** 需护送的沙暴次数 */
export const CARAVAN_NEED = 3

/** 商队商店：满格电池 + 资质卡 */
export const CARAVAN_STOCK = [
  { id: 'pp_honey', price: 180 },
  { id: 'talent_fruit', price: 280 },
] as const

export function caravanStormsDone(): number {
  return Number(GameState.getFlag(CARAVAN_COUNT) || 0)
}

/** 荒原是否正在沙暴（灯芯饰同款旗标） */
export function duneStormActive(): boolean {
  return Number(GameState.getFlag('dune_storm') || 0) > 0
}

export function caravanActive(): boolean {
  return GameState.hasFlag(CARAVAN_ACTIVE) && !GameState.hasFlag(CARAVAN_DONE)
}

/**
 * 沙暴中接护送
 * @author zjh
 * @date 2026-10-27
 */
export function beginCaravan(): { lines: string[] } | { reason: string } {
  if (GameState.hasFlag(CARAVAN_DONE)) return { reason: '商队已经安顿下来了。要看看货吗？' }
  if (GameState.hasFlag(CARAVAN_ACTIVE)) {
    return {
      reason: `还在护送中（${caravanStormsDone()}/${CARAVAN_NEED}）。等沙暴散了会有伙伴冲出来，打赢再跟下一场沙暴。`,
    }
  }
  if (!duneStormActive()) {
    return { reason: '队长：等沙暴卷起来再来。风沙里我们才敢动货。' }
  }
  GameState.setFlag(CARAVAN_ACTIVE, true)
  GameState.setFlag(CARAVAN_COUNT, 0)
  GameState.setFlag('side_caravan_started', true)
  return {
    lines: [
      '队长：好！跟着驼铃走。',
      '队长：沙暴散的时候，沙里常有东西扑上来——帮我们挡三回。',
      '队长：三回之后，驼队的货摊给你开。',
    ],
  }
}

/**
 * 一场沙暴结束：护送进度 +1，并提示要打野生战
 * @author zjh
 * @date 2026-10-27
 */
export function noteCaravanStormEnd(): { count: number; justDone: boolean } | null {
  if (!caravanActive()) return null
  const count = caravanStormsDone() + 1
  GameState.setFlag(CARAVAN_COUNT, count)
  if (count >= CARAVAN_NEED) {
    GameState.setFlag(CARAVAN_DONE, true)
    GameState.clearFlag(CARAVAN_ACTIVE)
    return { count: CARAVAN_NEED, justDone: true }
  }
  return { count, justDone: false }
}

/**
 * 护送战：沙鳍鲨（沙暴伙伴）
 * @author zjh
 * @date 2026-10-27
 */
export function makeCaravanFoe(rng: () => number = Math.random): CreatureInstance {
  const level = 27 + Math.floor(rng() * 4)
  return createCreature('dunefin', level, { rng, strong: rng() < 0.4 })
}
