/**
 * 战后结算（不含表现）：写回金币 / 旗标 / 图鉴 / 寄存所，处理异象、全灭、剧情战去向
 * BattleScene 只负责把返回的提示播完，再跳到返回的场景。
 * @author zjh
 * @date 2026-10-15
 */

import { battleName } from '../../data/creatures'
import { ITEMS } from '../../data/items'
import { PHENOMENON_BY_ID, PHENOMENON_RULES } from '../../data/phenomena'
import { WEATHER_INFO } from '../../data/weather'
import { GameState, RESPAWN, type PendingBattle } from '../../state/GameState'
import type { BattleState } from '../../systems/BattleLogic'
import { settleStoryBattle, type StoryOutcome } from '../../systems/BattleOutcome'
import { FRIENDSHIP_GAIN } from '../../systems/Bond'
import { addFriendship } from '../../systems/Growth'
import { syncNightRelay } from '../../systems/Night'
import { openTowerStairs } from '../../systems/Tower'
import { grantGuardian, UNIQUE_DONE_FLAG, uniqueDexComplete } from '../../systems/Postgame'
import { endPhenomenon } from '../../systems/Phenomenon'
import { rematchCountKey, winDayKey } from '../../systems/Rematch'
import { dayOf } from '../../systems/WorldClock'

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
    const notes = [`✧ ${def.name} 平息了。异象录点亮了新的一页！`]
    if (uniqueDexComplete(world.phenomenon.caught) && !GameState.hasFlag(UNIQUE_DONE_FLAG)) {
      GameState.setFlag(UNIQUE_DONE_FLAG, true)
      notes.push('异象录全亮了！世间的异色伙伴似乎更容易遇见了。')
    }
    return notes
  }
  if (b.won) {
    endPhenomenon(world, 'failed')
    return [`${battleName(enemy)} 化作光点消散了……${PHENOMENON_RULES.cooldownDays} 天内这里不会再出现「${def.name}」。`]
  }
  return [`${battleName(enemy)} 仍在原地注视着你。异象尚未结束。`]
}

/** 收服登记：收服证书（天 / 地图 / 天气）、寄存所、图鉴 */
function settleCatch(b: BattleState, pending: PendingBattle): string[] {
  if (pending.allyParty) return []
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

  if (b.won || b.fled || pending.allyParty) {
    if (b.won) {
      GameState.coins += b.coinsEarned
      if (pending.flagOnWin) {
        GameState.setFlag(pending.flagOnWin, true)
        if (pending.kind === 'trainer') GameState.setFlag(winDayKey(pending.flagOnWin), dayOf(GameState.world.totalSteps))
        if (pending.rematch) {
          const k = rematchCountKey(pending.flagOnWin)
          GameState.setFlag(k, Number(GameState.getFlag(k) ?? 0) + 1)
        }
      }
      for (const f of pending.winFlags ?? []) GameState.setFlag(f, true)
      for (const id of pending.winItems ?? []) {
        if (GameState.itemCount(id) > 0) continue
        GameState.addItem(id, 1)
        GameState.notices.push(`获得了重要物品「${ITEMS[id]?.name ?? id}」`)
      }
      if (pending.winLines?.length) GameState.notices.push(...pending.winLines)
      if (pending.recruit && pending.enemies[0]) {
        const lines = grantGuardian(pending.enemies[0].speciesId, pending.enemies[0].level, {
          has: (k) => !!GameState.getFlag(k),
          set: (k) => GameState.setFlag(k, true),
          add: (c) => GameState.addCreature(c),
          mark: (id) => GameState.markCaught(id),
        })
        if (lines.length) GameState.notices.push(...lines)
      }
      openTowerStairs(
        (k) => !!GameState.getFlag(k),
        (k) => GameState.setFlag(k, true),
      )
      if (syncNightRelay((k) => !!GameState.getFlag(k), (k) => GameState.setFlag(k, true))) {
        GameState.notices.push('五盏路灯都亮了。钟楼下，有个人在等你。')
      }
    } else if (pending.allyParty) {
      notes.push(`${pending.allyName ?? '同伴'}的伙伴累倒了……休息一下，再来挑战吧。`)
    }
    GameState.mapId = pending.returnMapId
    GameState.playerX = pending.returnX
    GameState.playerY = pending.returnY
    const story = settleStoryBattle(pending, b.won)
    notes.push(...story.notes)
    next = story.next
  } else if (pending.stayOnLoss) {
    for (const f of pending.lossFlags ?? []) GameState.setFlag(f, true)
    if (pending.lossLines?.length) GameState.notices.push(...pending.lossLines)
    notes.push(...settleStoryBattle(pending, false).notes)
    GameState.mapId = pending.returnMapId
    GameState.playerX = pending.returnX
    GameState.playerY = pending.returnY
    next = undefined
  } else {
    for (const c of GameState.party) addFriendship(c, FRIENDSHIP_GAIN.wipe)
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
