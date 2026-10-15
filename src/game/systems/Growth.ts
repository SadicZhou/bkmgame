/**
 * 成长系统：经验结算、升级学招（槽满时交给玩家选择）、进化、天赋觉醒、亲密度、旧存档规整
 * @author zjh
 * @date 2026-10-14
 */

import {
  MAX_LEVEL,
  MAX_MOVES,
  MOVES,
  SPECIES,
  calcStats,
  canAwaken,
  displayName,
  expToNext,
  fullSlot,
  movesAtLevel,
  type CreatureInstance,
  type MoveSlot,
} from '../data/creatures'
import { NATURES, NATURE_IDS, type NatureId } from '../data/natures'
import { STAT_KEYS, rollTalent, talentGrade, type Talent } from './Talent'

/** 成长过程中产生的事件，供场景播放提示/动画 */
export interface GrowthEvent {
  kind: 'exp' | 'levelUp' | 'learn' | 'wantLearn' | 'evolve' | 'awaken'
  text: string
  /** wantLearn：想学但技能槽已满的技能 */
  moveId?: string
  uid?: string
}

/**
 * 按新物种 / 新等级重算能力值，保持当前 HP 损失量不变
 * @author zjh
 * @date 2026-10-14
 */
export function refreshStats(c: CreatureInstance): void {
  const lost = Math.max(0, c.maxHp - c.hp)
  const stats = calcStats(c)
  c.maxHp = stats.maxHp
  c.atk = stats.atk
  c.def = stats.def
  c.spd = stats.spd
  c.hp = c.hp <= 0 ? 0 : Math.max(1, c.maxHp - lost)
}

/** 增加亲密度（受性格影响） */
export function addFriendship(c: CreatureInstance, amount: number): void {
  const rate = NATURES[c.nature]?.friendRate ?? 1
  c.friendship = Math.max(0, Math.min(255, c.friendship + Math.round(amount * rate)))
}

/**
 * 尝试学会技能：未满 4 个直接学会；已满时产生 wantLearn 事件交给玩家决定
 * @author zjh
 * @date 2026-10-14
 */
export function offerMove(c: CreatureInstance, moveId: string): GrowthEvent | null {
  if (!MOVES[moveId] || c.moves.some((s) => s.id === moveId)) return null
  const name = displayName(c)
  if (c.moves.length < MAX_MOVES) {
    c.moves.push(fullSlot(moveId))
    return { kind: 'learn', text: `${name} 学会了 ${MOVES[moveId].name}！` }
  }
  return {
    kind: 'wantLearn',
    text: `${name} 想学会 ${MOVES[moveId].name}，但技能已经满了……`,
    moveId,
    uid: c.uid,
  }
}

/**
 * 用新技能替换指定槽位
 * @author zjh
 * @date 2026-10-14
 */
export function replaceMove(c: CreatureInstance, slotIndex: number, moveId: string): string {
  const old = MOVES[c.moves[slotIndex]?.id]
  c.moves[slotIndex] = fullSlot(moveId)
  return `${displayName(c)} 忘掉了 ${old?.name ?? '旧技能'}，学会了 ${MOVES[moveId].name}！`
}

/**
 * 战斗结算经验：可能连续升级、学招、进化、觉醒
 * @author zjh
 * @date 2026-10-14
 */
export function grantExp(c: CreatureInstance, amount: number): GrowthEvent[] {
  const events: GrowthEvent[] = []
  if (c.hp <= 0 || amount <= 0 || c.level >= MAX_LEVEL) return events
  c.exp += amount
  events.push({ kind: 'exp', text: `${displayName(c)} 获得 ${amount} 经验！` })

  while (c.level < MAX_LEVEL && c.exp >= expToNext(c.level)) {
    c.exp -= expToNext(c.level)
    c.level += 1
    refreshStats(c)
    addFriendship(c, 3)
    events.push({ kind: 'levelUp', text: `${displayName(c)} 升到了 ${c.level} 级！` })

    const species = SPECIES[c.speciesId]
    if (species.evolvesTo && species.evolveLevel && c.level >= species.evolveLevel) {
      const oldName = displayName(c)
      c.speciesId = species.evolvesTo
      refreshStats(c)
      events.push({ kind: 'evolve', text: `咦？${oldName} 的样子……进化成了 ${SPECIES[c.speciesId].name}！` })
    }

    for (const entry of SPECIES[c.speciesId].learnset) {
      if (entry.level !== c.level) continue
      const ev = offerMove(c, entry.moveId)
      if (ev) events.push(ev)
    }

    const awaken = tryAwaken(c)
    if (awaken) events.push(awaken)
  }
  if (c.level >= MAX_LEVEL) c.exp = 0
  return events
}

/**
 * 天赋觉醒：A/S 级到达 Lv25 时触发；S 级同时解锁隐藏特性
 * @author zjh
 * @date 2026-10-14
 */
export function tryAwaken(c: CreatureInstance): GrowthEvent | null {
  if (!canAwaken(c)) return null
  c.awakened = true
  const grade = talentGrade(c.talent)
  if (grade === 'S') c.abilityId = SPECIES[c.speciesId].hiddenAbility
  refreshStats(c)
  const flame = grade === 'S' ? '金色' : '蓝色'
  return { kind: 'awaken', text: `✦ 天赋觉醒！${displayName(c)} 体内的火种燃成了${flame}！` }
}

/** 旧存档中可能出现的伙伴结构（v2：moves 为字符串数组，无天赋字段） */
type LegacyCreature = Partial<Omit<CreatureInstance, 'moves'>> & {
  uid: string
  speciesId: string
  level: number
  hp: number
  maxHp: number
  moves?: (string | MoveSlot)[]
}

function isTalent(t: unknown): t is Talent {
  return !!t && typeof t === 'object' && STAT_KEYS.every((k) => typeof (t as Talent)[k] === 'number')
}

/**
 * 读档后规整伙伴：补齐 v3 字段（资质下限 8、随机性格、特性取 A）、技能槽 PP、越界 HP
 * @author zjh
 * @date 2026-10-14
 */
export function normalizeCreature(raw: LegacyCreature): CreatureInstance {
  const speciesId = SPECIES[raw.speciesId] ? raw.speciesId : 'flarehorn'
  const sp = SPECIES[speciesId]
  const level = Math.max(1, Math.min(MAX_LEVEL, raw.level || 1))
  const legacyMoves = (raw.moves ?? []).map((m) => (typeof m === 'string' ? fullSlot(m) : { ...m }))
  let moves = legacyMoves.filter((s) => MOVES[s.id]).slice(0, MAX_MOVES)
  if (!moves.length) moves = movesAtLevel(speciesId, level).map(fullSlot)
  for (const s of moves) s.pp = Math.max(0, Math.min(MOVES[s.id].pp, s.pp ?? MOVES[s.id].pp))

  const nature: NatureId = raw.nature && NATURE_IDS.includes(raw.nature) ? raw.nature : NATURE_IDS[Math.floor(Math.random() * NATURE_IDS.length)]
  const c: CreatureInstance = {
    uid: raw.uid,
    speciesId,
    nickname: raw.nickname,
    level,
    exp: Math.max(0, raw.exp ?? 0),
    hp: raw.hp,
    maxHp: raw.maxHp,
    atk: 1,
    def: 1,
    spd: 1,
    moves,
    talent: isTalent(raw.talent) ? { ...raw.talent } : rollTalent(8),
    nature,
    abilityId: raw.abilityId ?? sp.abilities[0],
    appraised: raw.appraised ?? false,
    awakened: raw.awakened ?? false,
    shiny: raw.shiny ?? false,
    strong: raw.strong,
    friendship: raw.friendship ?? Math.min(150, level * 5),
    fruitUsed: raw.fruitUsed ?? 0,
    status: raw.status ?? null,
    caughtInfo: raw.caughtInfo,
  }
  const ratio = raw.maxHp > 0 ? Math.max(0, Math.min(1, raw.hp / raw.maxHp)) : 1
  const stats = calcStats(c)
  Object.assign(c, stats)
  c.hp = raw.hp <= 0 ? 0 : Math.max(1, Math.round(stats.maxHp * ratio))
  return c
}

/** 完全恢复：HP、异常状态、PP */
export function healCreature(c: CreatureInstance): void {
  c.hp = c.maxHp
  c.status = null
  for (const s of c.moves) s.pp = MOVES[s.id]?.pp ?? s.pp
}

/** 回满队伍（含倒下的伙伴） */
export function healParty(party: CreatureInstance[]): void {
  for (const c of party) healCreature(c)
}
