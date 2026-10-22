/**
 * 世界步进调度：玩家每走一步，统一推进时钟、天气、异象、小事件、遇敌
 * WorldScene 只负责根据返回结果播放表现。
 * @author zjh
 * @date 2026-10-14
 */

import { createCreature, type CreatureInstance } from '../data/creatures'
import { ENCOUNTERS, tableFor, type EncounterSource } from '../data/encounters'
import { MAPS, openTiles } from '../data/maps'
import type { MinorEventId, PhenomenonDef } from '../data/phenomena'
import { GameState } from '../state/GameState'
import { FRIENDSHIP_GAIN } from './Bond'
import { encounterRate, hasRare, pickEncounter, type EncounterContext } from './Encounter'
import { addFriendship } from './Growth'
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
 * 组装遭遇判定上下文；该地图没有此来源的遭遇表时返回 null
 * @author zjh
 * @date 2026-10-15
 */
function encounterCtx(mapId: string, source: EncounterSource): EncounterContext | null {
  const base = ENCOUNTERS[mapId]
  const table = base ? tableFor(base, source) : null
  const w = GameState.world
  const lead = GameState.party.find((c) => c.hp > 0)
  if (!table || !lead) return null
  const minor = w.minor.mapId === mapId ? w.minor : null
  return {
    table,
    weather: mapId === 'dunes' && Number(GameState.getFlag('dune_storm') || 0) > 0 ? 'sand' : GameState.weatherAt(mapId),
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
    strongHerd: minor?.id === 'strong_herd',
    hasFlag: GameState.hasFlag,
    shinyMod:
      (GameState.itemCount('star_charm') > 0 ? 1.5 : 1) *
      (GameState.itemCount('travel_journal') > 0 || GameState.hasFlag('dex_complete') ? 2 : 1) *
      (GameState.hasFlag('unique_complete') ? 2 : 1),
    goldRod: GameState.itemCount('gold_rod') > 0,
  }
}

/** 钓鱼上钩的结果（体长计算需要知道是否强壮个体） */
export interface FishCatch {
  enemy: CreatureInstance
  strong: boolean
}

/** 抽出物种并生成野生伙伴，同时更新稀有保底 */
function spawnFrom(mapId: string, ctx: EncounterContext): FishCatch | undefined {
  const w = GameState.world
  const pick = pickEncounter(ctx)
  if (!pick) return undefined
  w.stepsSinceEncounter = 0
  if (hasRare(ctx.table)) w.rarePity[mapId] = pick.rare ? 0 : (w.rarePity[mapId] ?? 0) + 1
  return { enemy: createCreature(pick.speciesId, pick.level, { strong: pick.strong, shiny: pick.shiny }), strong: pick.strong }
}

/**
 * 掷一次野外遇敌（草丛 / 冰面），返回生成的野生伙伴
 * @author zjh
 * @date 2026-10-14
 */
function rollEncounter(mapId: string, source: 'grass' | 'ice'): CreatureInstance | undefined {
  const ctx = encounterCtx(mapId, source)
  if (!ctx || Math.random() >= encounterRate(ctx)) return undefined
  return spawnFrom(mapId, ctx)?.enemy
}

/**
 * 钓鱼上钩：直接从钓竿遭遇表抽取（不受安全步数影响；驱兽香仍会赶走弱小的伙伴）
 * @author zjh
 * @date 2026-10-15
 */
export function rollFishing(mapId: string, rod: 'rod' | 'goodRod'): FishCatch | undefined {
  const ctx = encounterCtx(mapId, rod)
  return ctx ? spawnFrom(mapId, ctx) : undefined
}

/** 地图是否有该钓竿的遭遇表 */
export function hasFishing(mapId: string, rod: 'rod' | 'goodRod'): boolean {
  return !!ENCOUNTERS[mapId]?.[rod]?.length
}

/**
 * 推进一步
 * @author zjh
 * @date 2026-10-14
 */
export function stepWorld(mapId: string, x: number, y: number, encounterSource: 'grass' | 'ice' | null): StepResult {
  const map = MAPS[mapId]
  const w = GameState.world
  const env = phenomenonEnv()
  const active = activePhenomenon(w)
  const lockedWeather = active ? w.weatherByMap[active.mapId] : undefined
  const res: StepResult = { clock: advanceClock(w, !!map?.outdoor) }
  if (active && lockedWeather) w.weatherByMap[active.mapId] = lockedWeather
  const lead = GameState.party[0]
  if (lead && w.totalSteps % FRIENDSHIP_GAIN.walkSteps === 0) addFriendship(lead, FRIENDSHIP_GAIN.walk)

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
  if (encounterSource && !res.goal && !res.crystal) res.encounter = rollEncounter(mapId, encounterSource)
  return res
}
