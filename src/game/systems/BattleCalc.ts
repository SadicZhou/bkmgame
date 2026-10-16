/**
 * 战斗数值计算：速度、命中、伤害（见 docs/planning/06 第 3 节）
 * @author zjh
 * @date 2026-10-14
 */

import { SPECIES, typeMultiplier, type CreatureInstance, type MoveDef } from '../data/creatures'
import { GameState } from '../state/GameState'
import { BADGE_POWER } from '../data/badges'
import { weatherPowerMod } from '../data/weather'
import { attackerPowerMod, critRate, defenderDamageMod, evasionMod, speedMod } from './AbilityHooks'
import { volOf, type BattleState } from './BattleCore'
import { bondCritBonus } from './Bond'
import { stageMultiplier } from './StatusEffects'
import type { Rng } from './Talent'

/** 本系加成 */
export const STAB = 1.2

/**
 * 徽记加成：攻击方在玩家队伍里、且持有该招式属性的徽记时 ×1.1
 * @author zjh
 * @date 2026-10-15
 */
export function badgePowerMod(s: BattleState, attacker: CreatureInstance, move: MoveDef): number {
  if (!s.badges?.includes(move.type)) return 1
  return s.playerParty.includes(attacker) ? BADGE_POWER : 1
}

/**
 * 实际速度：能力阶段、麻痹减半、特性
 * @author zjh
 * @date 2026-10-14
 */
/** 风铃坠：带着它时，玩家一方的实际速度 ×1.05 */
export const WIND_CHIME_SPEED = 1.05

export function effectiveSpeed(s: BattleState, c: CreatureInstance): number {
  const para = c.status === 'paralyze' ? 0.5 : 1
  const charm = s.playerParty.includes(c) && GameState.itemCount('wind_chime') > 0 ? WIND_CHIME_SPEED : 1
  return c.spd * stageMultiplier(volOf(s, c).stages.spd) * para * speedMod(c) * charm
}

/**
 * 命中判定：必中技、下雪必中的暴风雪、雾天 −5%、雪隐
 * @author zjh
 * @date 2026-10-14
 */
export function rollHit(s: BattleState, move: MoveDef, defender: CreatureInstance, rng: Rng = Math.random): boolean {
  if (move.accuracy < 0) return true
  if (move.special === 'snow_sure_hit' && s.weather === 'snow') return true
  let acc = move.accuracy / 100
  if (s.weather === 'fog') acc -= 0.05
  acc *= evasionMod(s, defender)
  return rng() < acc
}

/** 实际威力（心火共鸣随亲密度变化） */
export function movePower(attacker: CreatureInstance, move: MoveDef): number {
  if (move.special === 'friendship_power') return Math.round(30 + (25 * attacker.friendship) / 255)
  return move.power
}

export interface DamageResult {
  dmg: number
  mult: number
  crit: boolean
}

/**
 * 伤害 = v2 基础伤害 × 本系 × 克制 × 会心 × 能力阶段 × 灼烧 × 特性 × 天气/夜晚 × 霜壁 × 随机(0.9~1.1)
 * @author zjh
 * @date 2026-10-14
 */
export function calcDamage(
  s: BattleState,
  attacker: CreatureInstance,
  defender: CreatureInstance,
  move: MoveDef,
  rng: Rng = Math.random,
): DamageResult {
  const atkType = SPECIES[attacker.speciesId].type
  const defType = SPECIES[defender.speciesId].type
  const mult = typeMultiplier(move.type, defType)
  const stab = move.type === atkType ? STAB : 1
  const crit = rng() < critRate(attacker, move) + bondCritBonus(s, attacker)

  const atkStage = volOf(s, attacker).stages.atk
  const defStage = volOf(s, defender).stages.def
  // 会心无视对己不利的阶段
  const atkMul = stageMultiplier(crit ? Math.max(0, atkStage) : atkStage)
  const defMul = stageMultiplier(crit ? Math.min(0, defStage) : defStage)
  const burn = attacker.status === 'burn' ? 0.75 : 1

  const atk = attacker.atk * atkMul * burn
  const def = Math.max(1, defender.def * defMul)
  const raw = ((2 * attacker.level) / 5 + 2) * movePower(attacker, move) * (atk / def)

  const night = s.night && move.type === 'spirit' ? 1.1 : 1
  const wall = volOf(s, defender).frostWall > 0 ? 0.5 : 1
  const total =
    (raw / 12) *
    mult *
    stab *
    (crit ? 1.5 : 1) *
    attackerPowerMod(s, attacker, move) *
    badgePowerMod(s, attacker, move) *
    defenderDamageMod(defender, move, mult) *
    weatherPowerMod(s.weather, move.type) *
    night *
    wall *
    (0.9 + rng() * 0.2)
  return { dmg: Math.max(1, Math.round(total)), mult, crit }
}
