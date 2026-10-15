/**
 * 伙伴实例：生成、能力值计算、技能槽、经验曲线
 * 物种 / 技能 / 属性数据分别在 species.ts / moves.ts / types.ts。
 * @author zjh
 * @date 2026-10-14
 */

import { MOVES, STRUGGLE_ID, type MoveDef, type StatusId } from './moves'
import { NATURE_IDS, natureMultiplier, type NatureId } from './natures'
import { RARITY_INFO, SPECIES } from './species'
import {
  AWAKEN_LEVEL,
  awakenBonus,
  rollTalent,
  talentGrade,
  talentMultiplier,
  type Rng,
  type Talent,
} from '../systems/Talent'

export { SPECIES, DEX_ORDER, UNIQUE_ORDER, STARTERS, RARITY_INFO } from './species'
export type { CreatureSpecies, Rarity } from './species'
export { MOVES } from './moves'
export type { MoveDef } from './moves'
export { TYPE_LABEL, typeMultiplier } from './types'
export type { ElementType } from './types'

/** 技能槽：技能 id + 剩余 PP */
export interface MoveSlot {
  id: string
  pp: number
}

/** 收服记录（唯一精灵证书用） */
export interface CaughtInfo {
  day: number
  mapId: string
  weather: string
}

export interface CreatureInstance {
  uid: string
  speciesId: string
  nickname?: string
  level: number
  exp: number
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  moves: MoveSlot[]
  talent: Talent
  nature: NatureId
  abilityId: string
  /** 是否已鉴定（显示具体资质） */
  appraised: boolean
  /** 是否已天赋觉醒 */
  awakened: boolean
  shiny: boolean
  /** 强壮个体（遭遇时 +2 级、资质下限 +5） */
  strong?: boolean
  /** 亲密度 0~255 */
  friendship: number
  /** 已使用资质果次数 */
  fruitUsed?: number
  /** 主状态异常（战斗外保留，回血点解除） */
  status?: StatusId | null
  caughtInfo?: CaughtInfo
}

/** 单只伙伴最多掌握的技能数 */
export const MAX_MOVES = 4
export const MAX_LEVEL = 50

let uidSeq = 1

export function newUid(): string {
  return `c${uidSeq++}-${Date.now().toString(36)}`
}

/** 能力值计算所需的最小信息 */
type StatSource = Pick<CreatureInstance, 'speciesId' | 'level' | 'talent' | 'nature' | 'awakened'>

/**
 * 能力值 = 种族值 × 等级成长 × 资质 × 性格 × 觉醒
 * @author zjh
 * @date 2026-10-14
 */
export function calcStats(c: StatSource): { maxHp: number; atk: number; def: number; spd: number } {
  const s = SPECIES[c.speciesId]
  const scale = 1 + (c.level - 1) * 0.08
  const awaken = c.awakened ? awakenBonus(talentGrade(c.talent)) : 1
  const stat = (base: number, key: 'hp' | 'atk' | 'def' | 'spd') =>
    Math.max(1, Math.round(base * scale * talentMultiplier(c.talent[key]) * natureMultiplier(c.nature, key) * awaken))
  return {
    maxHp: stat(s.baseHp, 'hp'),
    atk: stat(s.baseAtk, 'atk'),
    def: stat(s.baseDef, 'def'),
    spd: stat(s.baseSpd, 'spd'),
  }
}

/**
 * 计算某等级应掌握的技能（取学招表中最近学会的 4 个）
 * @author zjh
 * @date 2026-10-14
 */
export function movesAtLevel(speciesId: string, level: number): string[] {
  const learned: string[] = []
  for (const e of SPECIES[speciesId].learnset) {
    if (e.level <= level && !learned.includes(e.moveId)) learned.push(e.moveId)
  }
  return learned.slice(-MAX_MOVES)
}

export function fullSlot(id: string): MoveSlot {
  return { id, pp: MOVES[id]?.pp ?? 1 }
}

/** 生成选项 */
export interface CreateOptions {
  /** 额外资质下限（与稀有度下限取大） */
  talentFloor?: number
  shiny?: boolean
  strong?: boolean
  nature?: NatureId
  rng?: Rng
}

/**
 * 生成伙伴实例：掷资质、性格、特性
 * @author zjh
 * @date 2026-10-14
 */
export function createCreature(speciesId: string, level = 5, opts: CreateOptions = {}): CreatureInstance {
  const rng = opts.rng ?? Math.random
  const sp = SPECIES[speciesId]
  let floor = Math.max(RARITY_INFO[sp.rarity].talentFloor, opts.talentFloor ?? 0, opts.shiny ? 10 : 0)
  if (opts.strong) floor += 5
  const talent = rollTalent(Math.min(20, floor), rng)
  const nature = opts.nature ?? NATURE_IDS[Math.floor(rng() * NATURE_IDS.length)]
  const hidden = opts.shiny || sp.rarity === 'guardian'
  const abilityId = hidden ? sp.hiddenAbility : sp.abilities[Math.floor(rng() * 2)]
  const lv = Math.max(1, Math.min(MAX_LEVEL, level))
  const base = { speciesId, level: lv, talent, nature, awakened: false }
  const stats = calcStats(base)
  return {
    uid: newUid(),
    ...base,
    exp: 0,
    hp: stats.maxHp,
    ...stats,
    moves: movesAtLevel(speciesId, lv).map(fullSlot),
    abilityId,
    appraised: false,
    shiny: !!opts.shiny,
    strong: opts.strong || undefined,
    friendship: sp.rarity === 'starter' ? 70 : 30,
    status: null,
  }
}

/** 获取实例技能定义列表 */
export function getMoves(c: CreatureInstance): MoveDef[] {
  return c.moves.map((s) => MOVES[s.id]).filter(Boolean)
}

/** 是否所有技能 PP 耗尽（需要挣扎） */
export function outOfPp(c: CreatureInstance): boolean {
  return c.moves.every((s) => s.pp <= 0)
}

export const STRUGGLE = MOVES[STRUGGLE_ID]

/**
 * 升级所需经验：Lv15 以前与 v2 一致，之后逐渐变陡（等级上限 50）
 * @author zjh
 * @date 2026-10-14
 */
export function expToNext(level: number): number {
  const base = 20 + level * 10
  return level <= 15 ? base : Math.round(base + (level - 15) ** 2 * 4)
}

/** 是否达到觉醒条件 */
export function canAwaken(c: CreatureInstance): boolean {
  const g = talentGrade(c.talent)
  return !c.awakened && c.level >= AWAKEN_LEVEL && (g === 'A' || g === 'S')
}

export function displayName(c: CreatureInstance): string {
  return c.nickname ?? SPECIES[c.speciesId].name
}

/** 带「强壮的 / 异色」前缀的战斗名 */
export function battleName(c: CreatureInstance): string {
  const prefix = c.strong ? '强壮的 ' : ''
  return `${prefix}${displayName(c)}${c.shiny ? '✦' : ''}`
}

/** 贴图 key：异色使用独立调色板 */
export function spriteKey(c: Pick<CreatureInstance, 'speciesId' | 'shiny'>): string {
  return `spr-${c.speciesId}${c.shiny ? '-shiny' : ''}`
}

/** 从存档恢复时同步序号，避免 uid 碰撞 */
export function syncUidSeq(list: CreatureInstance[]): void {
  for (const c of list) {
    const m = /^c(\d+)/.exec(c.uid)
    if (m) uidSeq = Math.max(uidSeq, Number(m[1]) + 1)
  }
}
