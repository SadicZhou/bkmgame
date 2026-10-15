/**
 * 战后结算（不含表现）：写回金币 / 旗标 / 图鉴 / 寄存所，处理异象、全灭、剧情战去向
 * BattleScene 只负责把返回的提示播完，再跳到返回的场景。
 * @author zjh
 * @date 2026-10-15
 */

import { battleName } from '../../data/creatures'
import { PHENOMENON_BY_ID, PHENOMENON_RULES } from '../../data/phenomena'
import { WEATHER_INFO } from '../../data/weather'
import { GameState, RESPAWN, type PendingBattle } from '../../state/GameState'
import type { BattleState } from '../../systems/BattleLogic'
import { settleStoryBattle, type StoryOutcome } from '../../systems/BattleOutcome'
import { endPhenomenon } from '../../systems/Phenomenon'

/** 战斗结束后要去的场景（不填为回到大地图） */
export type BattleNext = StoryOutcome['next']

export interface BattleSettlement {
  notes: string[]
  next: BattleNext
}

/** 异象战结果：收服 → 永久结束；击倒 → 冷却；逃走 / 全灭 → 异象仍在 */
function settlePhenomenon(b: BattleState, pending: PendingBattle): string[] {
  const id = pending.phenomenonId
  const world = GameState.world
  if (!id || world.phenomenon.activeId !== id) return []
  const def = PHENOMENON_BY_ID[id]
  const enemy = b.enemyParty[0]
  if (b.caught) {
    endPhenomenon(world, 'caught')
    return [`✧ ${def.name} 平息了。异象录点亮了新的一页！`]
  }
  if (b.won) {
    endPhenomenon(world, 'failed')
    return [`${battleName(enemy)} 化作光点消散了……${PHENOMENON_RULES.cooldownDays} 天内这里不会再出现「${def.name}」。`]
  }
  return [`${battleName(enemy)} 仍在原地注视着你。异象尚未结束。`]
}

/** 收服登记：收服证书（天 / 地图 / 天气）、寄存所、图鉴 */
function settleCatch(b: BattleState, pending: PendingBattle): string[] {
  for (const c of b.playerParty) GameState.markCaught(c.speciesId)
  if (!b.caught) return []
  b.caught.caughtInfo = {
    day: GameState.day(),
    mapId: pending.returnMapId,
    weather: pending.weather ? WEATHER_INFO[pending.weather].label : '—',
  }
  if (b.caughtToStorage) GameState.storage.push(b.caught)
  GameState.markCaught(b.caught.speciesId)
  return [`${battleName(b.caught)} 已登记到图鉴！`]
}

/**
 * 战斗结束：胜利 / 逃跑回原地，全灭回复活点并遗失一半焰币；剧情战决定下一个场景
 * @author zjh
 * @date 2026-10-15
 */
export function settleBattle(b: BattleState, pending: PendingBattle): BattleSettlement {
  const notes = [...settleCatch(b, pending), ...settlePhenomenon(b, pending)]
  let next: BattleNext

  if (b.won || b.fled) {
    if (b.won) {
      GameState.coins += b.coinsEarned
      if (pending.flagOnWin) GameState.setFlag(pending.flagOnWin, true)
    }
    GameState.mapId = pending.returnMapId
    GameState.playerX = pending.returnX
    GameState.playerY = pending.returnY
    const story = settleStoryBattle(pending, b.won)
    notes.push(...story.notes)
    next = story.next
  } else {
    notes.push(...settleStoryBattle(pending, false).notes)
    const lost = Math.floor(GameState.coins / 2)
    GameState.coins -= lost
    GameState.healAll()
    GameState.mapId = RESPAWN.mapId
    GameState.playerX = RESPAWN.x
    GameState.playerY = RESPAWN.y
    notes.push(`你慌忙带着伙伴回到了旅人小屋……（遗失了 ${lost} 焰币）`)
  }

  GameState.pendingBattle = null
  GameState.facing = 'down'
  return { notes, next }
}
