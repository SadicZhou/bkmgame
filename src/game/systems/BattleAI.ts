/**
 * 敌方选招 AI（见 docs/planning/06 第 8 节）
 * 野生：随机（变化技权重减半）；训练家：多数时候选最高期望伤害，对手无状态时偶尔用状态技；
 * 守护兽 / 唯一精灵：最高期望伤害，低血量时优先回复或强化。
 * @author zjh
 * @date 2026-10-14
 */

import { MOVES, SPECIES, outOfPp, typeMultiplier, type CreatureInstance, type MoveDef } from '../data/creatures'
import { activeEnemy, activePlayer, type BattleState } from './BattleCore'
import { STAB, movePower } from './BattleCalc'

/** 选招结果：技能槽下标；-1 表示挣扎 */
export type EnemyChoice = number

/** 期望伤害分（只用于比较） */
function expectedScore(user: CreatureInstance, target: CreatureInstance, move: MoveDef): number {
  if (move.category === 'status') return 0
  const acc = move.accuracy < 0 ? 1 : move.accuracy / 100
  const stab = move.type === SPECIES[user.speciesId].type ? STAB : 1
  return movePower(user, move) * typeMultiplier(move.type, SPECIES[target.speciesId].type) * stab * acc
}

function inflictsStatus(m: MoveDef): boolean {
  return m.category === 'status' && m.effect?.target === 'foe' && !!(m.effect.status || m.effect.volatile)
}

function selfSupport(m: MoveDef): boolean {
  return m.category === 'status' && (m.effect?.target === 'self' || m.special === 'aqua_ring' || m.special === 'frost_wall')
}

/** 加权随机 */
function weightedPick(items: { i: number; w: number }[]): number {
  const total = items.reduce((sum, x) => sum + x.w, 0)
  let r = Math.random() * total
  for (const x of items) {
    r -= x.w
    if (r < 0) return x.i
  }
  return items[items.length - 1].i
}

/**
 * 敌方选择本回合技能
 * @author zjh
 * @date 2026-10-14
 */
export function chooseEnemyMove(s: BattleState): EnemyChoice {
  const user = activeEnemy(s)
  const target = activePlayer(s)
  if (outOfPp(user)) return -1

  const usable = user.moves
    .map((slot, i) => ({ i, move: MOVES[slot.id], pp: slot.pp }))
    .filter((x) => x.move && x.pp > 0)

  const best = () => usable.reduce((a, b) => (expectedScore(user, target, b.move) > expectedScore(user, target, a.move) ? b : a)).i

  if (s.kind === 'wild') {
    return weightedPick(usable.map((x) => ({ i: x.i, w: x.move.category === 'status' ? 0.5 : 1 })))
  }

  if (s.kind === 'trainer') {
    const statusMoves = usable.filter((x) => inflictsStatus(x.move))
    if (!target.status && statusMoves.length && Math.random() < 0.3) return statusMoves[0].i
    return Math.random() < 0.7 ? best() : usable[Math.floor(Math.random() * usable.length)].i
  }

  // 守护兽 / 唯一精灵
  const support = usable.filter((x) => selfSupport(x.move))
  if (user.hp < user.maxHp * 0.4 && support.length && Math.random() < 0.5) return support[0].i
  const statusMoves = usable.filter((x) => inflictsStatus(x.move))
  if (!target.status && statusMoves.length && Math.random() < 0.25) return statusMoves[0].i
  return Math.random() < 0.85 ? best() : usable[Math.floor(Math.random() * usable.length)].i
}
