/**
 * 成长系统：经验结算、升级学招、进化、旧存档数据规整
 * @author zjh
 * @date 2026-10-14
 */

import {
  MAX_MOVES,
  MOVES,
  SPECIES,
  calcStats,
  displayName,
  expToNext,
  movesAtLevel,
  type CreatureInstance,
} from '../data/creatures'

/** 成长过程中产生的事件，供战斗场景播放提示/动画 */
export interface GrowthEvent {
  kind: 'exp' | 'levelUp' | 'learn' | 'evolve'
  text: string
}

/**
 * 按新物种 / 新等级重算能力值，保持当前 HP 损失量不变
 * @author zjh
 * @date 2026-10-14
 */
function refreshStats(c: CreatureInstance): void {
  const lost = Math.max(0, c.maxHp - c.hp)
  const stats = calcStats(c.speciesId, c.level)
  c.maxHp = stats.maxHp
  c.atk = stats.atk
  c.def = stats.def
  c.spd = stats.spd
  c.hp = c.hp <= 0 ? 0 : Math.max(1, c.maxHp - lost)
}

/**
 * 学会新招式：未满 4 个直接加入，否则替换威力最低的招式
 * @author zjh
 * @date 2026-10-14
 */
function learnMove(c: CreatureInstance, moveId: string): GrowthEvent | null {
  const moves = c.moves ?? movesAtLevel(c.speciesId, c.level)
  if (moves.includes(moveId)) return null
  const name = displayName(c)
  const newMove = MOVES[moveId]
  if (moves.length < MAX_MOVES) {
    c.moves = [...moves, moveId]
    return { kind: 'learn', text: `${name} 学会了 ${newMove.name}！` }
  }
  let weakest = 0
  moves.forEach((id, i) => {
    if (MOVES[id].power < MOVES[moves[weakest]].power) weakest = i
  })
  const forgotten = MOVES[moves[weakest]]
  if (forgotten.power >= newMove.power) return null
  c.moves = moves.map((id, i) => (i === weakest ? moveId : id))
  return { kind: 'learn', text: `${name} 忘掉了 ${forgotten.name}，学会了 ${newMove.name}！` }
}

/**
 * 战斗结算经验：可能连续升级、学招、进化
 * @author zjh
 * @date 2026-10-14
 */
export function grantExp(c: CreatureInstance, amount: number): GrowthEvent[] {
  const events: GrowthEvent[] = []
  if (c.hp <= 0 || amount <= 0) return events
  c.moves = c.moves ?? movesAtLevel(c.speciesId, c.level)
  c.exp += amount
  events.push({ kind: 'exp', text: `${displayName(c)} 获得 ${amount} 经验！` })

  while (c.exp >= expToNext(c.level)) {
    c.exp -= expToNext(c.level)
    c.level += 1
    refreshStats(c)
    events.push({ kind: 'levelUp', text: `${displayName(c)} 升到了 ${c.level} 级！` })

    const species = SPECIES[c.speciesId]
    if (species.evolvesTo && species.evolveLevel && c.level >= species.evolveLevel) {
      const oldName = displayName(c)
      c.speciesId = species.evolvesTo
      refreshStats(c)
      events.push({
        kind: 'evolve',
        text: `咦？${oldName} 的样子……进化成了 ${SPECIES[c.speciesId].name}！`,
      })
    }

    for (const entry of SPECIES[c.speciesId].learnset) {
      if (entry.level === c.level) {
        const ev = learnMove(c, entry.moveId)
        if (ev) events.push(ev)
      }
    }
  }
  return events
}

/**
 * 读档后规整伙伴数据：补齐招式字段、修正越界 HP
 * @author zjh
 * @date 2026-10-14
 */
export function normalizeCreature(c: CreatureInstance): CreatureInstance {
  const copy = { ...c }
  if (!SPECIES[copy.speciesId]) copy.speciesId = 'flarehorn'
  if (!copy.moves?.length) copy.moves = movesAtLevel(copy.speciesId, copy.level)
  copy.moves = copy.moves.filter((id) => MOVES[id])
  copy.hp = Math.max(0, Math.min(copy.hp, copy.maxHp))
  return copy
}

/** 回满队伍 HP（含倒下的伙伴） */
export function healParty(party: CreatureInstance[]): void {
  for (const c of party) c.hp = c.maxHp
}
