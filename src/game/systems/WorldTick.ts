/**
 * 世界步进调度：玩家每走一步，统一推进时钟、天气、异象、小事件、遇敌
 * WorldScene 只负责根据返回结果播放表现。
 * @author zjh
 * @date 2026-10-14
 */

import { createCreature, type CreatureInstance } from '../data/creatures'
import { ENCOUNTERS } from '../data/encounters'
import { MAPS, openTiles } from '../data/maps'
import type { MinorEventId, PhenomenonDef } from '../data/phenomena'
import { GameState } from '../state/GameState'
import { encounterRate, hasRare, pickEncounter } from './Encounter'
import {
  activePhenomenon,
  collectCrystalAt,
  collectGoalAt,
  rollMinor,
  rollPhenomenon,
  tickMinor,
  tickPhenomenon,
  type CrystalReward,
  type GoalProgress,
  type MinorStart,
  type PhenomenonEnv,
} from './Phenomenon'
import { advanceClock, isNight, type ClockEvents } from './WorldClock'

export interface StepResult {
  clock: ClockEvents
  phenomenonStarted?: PhenomenonDef
  phenomenonFaded?: PhenomenonDef
  minorStarted?: MinorStart
  minorEnded?: MinorEventId
  goal?: GoalProgress
  crystal?: CrystalReward
  encounter?: CreatureInstance
}

/** 异象判定所需环境（读取全局状态） */
export function phenomenonEnv(): PhenomenonEnv {
  return {
    hasFlag: (k) => !!GameState.getFlag(k),
    unlockedMaps: GameState.unlockedOutdoorMaps(),
    openTiles: (mapId) => (MAPS[mapId] ? openTiles(MAPS[mapId]) : []),
  }
}

/**
 * 掷一次野外遇敌，返回生成的野生伙伴
 * @author zjh
 * @date 2026-10-14
 */
function rollEncounter(mapId: string): CreatureInstance | undefined {
  const table = ENCOUNTERS[mapId]
  const w = GameState.world
  const lead = GameState.party.find((c) => c.hp > 0)
  if (!table || !lead) return undefined
  const minor = w.minor.mapId === mapId ? w.minor : null
  const ctx = {
    table,
    weather: GameState.weatherAt(mapId),
    night: isNight(w.totalSteps),
    leadLevel: lead.level,
    leadAbility: lead.abilityId,
    stepsSince: w.stepsSinceEncounter,
    lureActive: w.lureSteps > 0,
    repelActive: w.repelSteps > 0,
    caught: GameState.dex.caught,
    rarePity: w.rarePity[mapId] ?? 0,
    migrationSpecies: minor?.id === 'migration' ? minor.speciesId : undefined,
    shimmer: minor?.id === 'shimmer',
  }
  if (Math.random() >= encounterRate(ctx)) return undefined
  const pick = pickEncounter(ctx)
  if (!pick) return undefined
  w.stepsSinceEncounter = 0
  if (hasRare(table)) w.rarePity[mapId] = pick.rare ? 0 : (w.rarePity[mapId] ?? 0) + 1
  return createCreature(pick.speciesId, pick.level, { strong: pick.strong, shiny: pick.shiny })
}

/**
 * 推进一步
 * @author zjh
 * @date 2026-10-14
 */
export function stepWorld(mapId: string, x: number, y: number, onEncounterTile: boolean): StepResult {
  const map = MAPS[mapId]
  const w = GameState.world
  const env = phenomenonEnv()
  const active = activePhenomenon(w)
  const lockedWeather = active ? w.weatherByMap[active.mapId] : undefined
  const res: StepResult = { clock: advanceClock(w, !!map?.outdoor) }
  if (active && lockedWeather) w.weatherByMap[active.mapId] = lockedWeather

  res.phenomenonFaded = tickPhenomenon(w, env) ?? undefined
  res.minorEnded = tickMinor(w) ?? undefined
  if (map?.outdoor) {
    res.phenomenonStarted = rollPhenomenon(w, env) ?? undefined
    res.minorStarted = rollMinor(w, env) ?? undefined
  }

  res.goal = collectGoalAt(w, mapId, x, y) ?? undefined
  const crystal = collectCrystalAt(w, mapId, x, y)
  if (crystal) {
    res.crystal = crystal
    if (crystal.kind === 'coins') GameState.coins += crystal.amount
    else GameState.addItem(crystal.itemId)
  }

  w.stepsSinceEncounter += 1
  if (onEncounterTile && !res.goal && !res.crystal) res.encounter = rollEncounter(mapId)
  return res
}
