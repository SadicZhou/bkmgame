/**
 * 战斗核心类型与公共工具：战斗状态、临时状态（能力阶段/混乱/寄生…）、帧快照记录
 * 逻辑层每条提示都生成一帧 BattleFrame，场景按顺序播放即可得到正确的血条与动画时序。
 * @author zjh
 * @date 2026-10-14
 */

import {
  battleName,
  expToNext,
  spriteKey,
  type CreatureInstance,
} from '../data/creatures'
import type { StageKey, StatusId } from '../data/moves'
import type { Weather } from '../data/weather'

export type BattleKind = 'wild' | 'trainer' | 'boss' | 'unique'
export type Side = 'player' | 'enemy'

export type BattleAnim =
  | 'none'
  | 'hitEnemy'
  | 'hitPlayer'
  | 'hurtEnemy'
  | 'hurtPlayer'
  | 'miss'
  | 'faintEnemy'
  | 'faintPlayer'
  | 'swapPlayer'
  | 'swapEnemy'
  | 'throw'
  | 'catchOk'
  | 'catchFail'
  | 'heal'
  | 'healEnemy'
  | 'buffPlayer'
  | 'buffEnemy'
  | 'debuffPlayer'
  | 'debuffEnemy'
  | 'statusPlayer'
  | 'statusEnemy'
  | 'weather'
  | 'levelUp'
  | 'evolve'
  | 'awaken'

/** 单方快照 */
export interface SideSnap {
  speciesId: string
  sprite: string
  name: string
  level: number
  hp: number
  maxHp: number
  exp: number
  expNext: number
  status: StatusId | null
  confused: boolean
  shiny: boolean
}

/** 一条提示 + 当时双方状态 */
export interface BattleFrame {
  text: string
  anim: BattleAnim
  mult?: number
  player: SideSnap
  enemy: SideSnap
  weather: Weather | null
}

/** 场上临时状态：换下场后清零（guardianUsed / rebirthUsed 每场战斗只记一次） */
export interface Volatile {
  stages: Record<StageKey, number>
  confused: number
  seeded: boolean
  aquaRing: number
  frostWall: number
  lastMove: string | null
  echo: number
  guardianUsed: boolean
  rebirthUsed: boolean
}

/** 升级时想学但槽满的技能，战后交给玩家决定 */
export interface PendingLearn {
  uid: string
  moveId: string
}

export interface BattleState {
  kind: BattleKind
  playerParty: CreatureInstance[]
  enemyParty: CreatureInstance[]
  activeIndex: number
  enemyIndex: number
  trainerName?: string
  frames: BattleFrame[]
  over: boolean
  fled: boolean
  won: boolean
  caught: CreatureInstance | null
  /** 收服时队伍已满，需送往寄存所 */
  caughtToStorage: boolean
  coinsEarned: number
  /** 当前场地天气 */
  weather: Weather | null
  /** 招式召唤的天气剩余回合；0 表示地图天气（不倒计时） */
  weatherTurns: number
  /** 地图天气，招式天气结束后恢复 */
  mapWeather: Weather | null
  night: boolean
  /** 是否持有异象信物（收服 ×2） */
  token: boolean
  vol: Record<string, Volatile>
  pendingLearns: PendingLearn[]
  turn: number
}

export function freshVolatile(): Volatile {
  return {
    stages: { atk: 0, def: 0, spd: 0 },
    confused: 0,
    seeded: false,
    aquaRing: 0,
    frostWall: 0,
    lastMove: null,
    echo: 0,
    guardianUsed: false,
    rebirthUsed: false,
  }
}

/** 取（必要时创建）某只伙伴的临时状态 */
export function volOf(s: BattleState, c: CreatureInstance): Volatile {
  if (!s.vol[c.uid]) s.vol[c.uid] = freshVolatile()
  return s.vol[c.uid]
}

/** 换下场：清空能力阶段、混乱、寄生等，保留每场一次的标记 */
export function resetVolatile(s: BattleState, c: CreatureInstance): void {
  const old = s.vol[c.uid]
  s.vol[c.uid] = { ...freshVolatile(), guardianUsed: !!old?.guardianUsed, rebirthUsed: !!old?.rebirthUsed }
}

export function activePlayer(s: BattleState): CreatureInstance {
  return s.playerParty[s.activeIndex]
}

export function activeEnemy(s: BattleState): CreatureInstance {
  return s.enemyParty[s.enemyIndex]
}

export function actorOf(s: BattleState, side: Side): CreatureInstance {
  return side === 'player' ? activePlayer(s) : activeEnemy(s)
}

export function other(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player'
}

function snap(s: BattleState, c: CreatureInstance): SideSnap {
  return {
    speciesId: c.speciesId,
    sprite: spriteKey(c),
    name: battleName(c),
    level: c.level,
    hp: c.hp,
    maxHp: c.maxHp,
    exp: c.exp,
    expNext: expToNext(c.level),
    status: c.status ?? null,
    confused: (s.vol[c.uid]?.confused ?? 0) > 0,
    shiny: c.shiny,
  }
}

/** 记录一帧 */
export function say(s: BattleState, text: string, anim: BattleAnim = 'none', mult?: number): void {
  s.frames.push({
    text,
    anim,
    mult,
    player: snap(s, activePlayer(s)),
    enemy: snap(s, activeEnemy(s)),
    weather: s.weather,
  })
}

/** 按方向选择动画：对 player 侧 / enemy 侧 */
export function sideAnim(side: Side, playerAnim: BattleAnim, enemyAnim: BattleAnim): BattleAnim {
  return side === 'player' ? playerAnim : enemyAnim
}

/** 扣血（不低于 0），返回实际扣除量 */
export function dealDamage(c: CreatureInstance, amount: number): number {
  const before = c.hp
  c.hp = Math.max(0, c.hp - Math.max(0, Math.round(amount)))
  return before - c.hp
}

/** 回血（不超过上限），返回实际回复量 */
export function restoreHp(c: CreatureInstance, amount: number): number {
  if (c.hp <= 0) return 0
  const before = c.hp
  c.hp = Math.min(c.maxHp, c.hp + Math.max(0, Math.round(amount)))
  return c.hp - before
}
