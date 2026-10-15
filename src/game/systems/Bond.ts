/**
 * 羁绊系统（第三章通关后开放）：亲密度阶段、成长规则与战斗中的阶段效果
 * 规则见 docs/planning/03-伙伴图鉴.md 第 4 节：
 * - 熟悉（≥70）：每场战斗一次，受到致命伤害时 10% 咬牙撑住（残留 1 HP）
 * - 信赖（≥150）：会心率 +5%
 * - 心火相连（≥220）：同心特性生效；羁绊技留待初始伙伴最终形态
 * @author zjh
 * @date 2026-10-15
 */

import type { CreatureInstance } from '../data/creatures'
import { volOf, type BattleState } from './BattleCore'

/** 羁绊系统开放旗标（第三章通关） */
export const BOND_FLAG = 'chapter3_done'

/** 亲密度变化量 */
export const FRIENDSHIP_GAIN = {
  /** 战斗胜利（在场伙伴） */
  win: 2,
  /** 首发每走 walkSteps 步 */
  walk: 1,
  walkSteps: 128,
  /** 在大地图 / 战斗中用回复道具 */
  heal: 3,
  /** 全灭（全队） */
  wipe: -5,
} as const

export interface BondStage {
  id: 'stranger' | 'familiar' | 'trust' | 'heart'
  name: string
  min: number
  effect: string
}

export const BOND_STAGES: BondStage[] = [
  { id: 'stranger', name: '初识', min: 0, effect: '还在互相了解。' },
  { id: 'familiar', name: '熟悉', min: 70, effect: '每场战斗一次，受到致命伤害时有 10% 咬牙撑住（残留 1 HP）。' },
  { id: 'trust', name: '信赖', min: 150, effect: '会心率 +5%。' },
  { id: 'heart', name: '心火相连', min: 220, effect: '心意相通：「同心」特性生效，未来可领悟羁绊技。' },
]

/** 撑住的概率 */
const ENDURE_CHANCE = 0.1
/** 信赖的会心率加成 */
const TRUST_CRIT = 0.05

/** 亲密度所处阶段 */
export function bondStage(friendship: number): BondStage {
  return [...BOND_STAGES].reverse().find((s) => friendship >= s.min) ?? BOND_STAGES[0]
}

/** 下一阶段（已满返回 null） */
export function nextBondStage(friendship: number): BondStage | null {
  return BOND_STAGES.find((s) => s.min > friendship) ?? null
}

/** 心形条：10 格，每格约 25.5 点 */
export function bondBar(friendship: number): string {
  const n = Math.min(10, Math.floor(friendship / 25.5))
  return '♥'.repeat(n) + '♡'.repeat(10 - n)
}

/** 该伙伴在本场战斗中是否享受羁绊效果（羁绊已开放、且是玩家自己的伙伴） */
function bonded(s: BattleState, c: CreatureInstance): boolean {
  return !!s.bond && s.playerParty.includes(c)
}

/**
 * 熟悉：致命伤害前每场一次 10% 撑住
 * @author zjh
 * @date 2026-10-15
 */
export function tryBondEndure(s: BattleState, c: CreatureInstance, incoming: number, rng: () => number = Math.random): boolean {
  if (incoming < c.hp || c.hp <= 1 || !bonded(s, c)) return false
  if (c.friendship < BOND_STAGES[1].min) return false
  const vol = volOf(s, c)
  if (vol.bondUsed) return false
  vol.bondUsed = true
  return rng() < ENDURE_CHANCE
}

/** 信赖：会心率加成 */
export function bondCritBonus(s: BattleState, c: CreatureInstance): number {
  return bonded(s, c) && c.friendship >= BOND_STAGES[2].min ? TRUST_CRIT : 0
}
