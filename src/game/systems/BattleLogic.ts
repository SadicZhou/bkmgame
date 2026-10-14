/**
 * 回合制战斗结算（无动画逻辑）
 * @author zjh
 * @date 2026-10-14
 */

import type { CreatureInstance, MoveDef } from '../data/creatures'
import {
  SPECIES,
  displayName,
  grantExp,
  typeMultiplier,
} from '../data/creatures'

export type BattleKind = 'wild' | 'trainer'

export interface BattleState {
  kind: BattleKind
  playerParty: CreatureInstance[]
  enemy: CreatureInstance
  activeIndex: number
  trainerName?: string
  log: string[]
  over: boolean
  fled: boolean
  won: boolean
}

export function startBattle(
  party: CreatureInstance[],
  enemy: CreatureInstance,
  kind: BattleKind,
  trainerName?: string,
): BattleState {
  const activeIndex = party.findIndex((c) => c.hp > 0)
  return {
    kind,
    playerParty: party,
    enemy,
    activeIndex: Math.max(0, activeIndex),
    trainerName,
    log: [
      kind === 'wild'
        ? `野生的 ${displayName(enemy)} 出现了！`
        : `${trainerName ?? '对手'} 派出了 ${displayName(enemy)}！`,
    ],
    over: false,
    fled: false,
    won: false,
  }
}

function livingIndex(party: CreatureInstance[], prefer = 0): number {
  if (party[prefer]?.hp > 0) return prefer
  return party.findIndex((c) => c.hp > 0)
}

/**
 * 计算一次招式伤害
 * @author zjh
 * @date 2026-10-14
 */
export function calcDamage(
  attacker: CreatureInstance,
  defender: CreatureInstance,
  move: MoveDef,
): { dmg: number; mult: number } {
  const atkSp = SPECIES[attacker.speciesId]
  const defSp = SPECIES[defender.speciesId]
  const mult = typeMultiplier(move.type, defSp.type)
  const raw =
    ((2 * attacker.level) / 5 + 2) * move.power * (attacker.atk / Math.max(1, defender.def))
  const dmg = Math.max(1, Math.round((raw / 12) * mult * (0.9 + Math.random() * 0.2)))
  void atkSp
  return { dmg, mult }
}

function enemyChooseMove(enemy: CreatureInstance): MoveDef {
  const moves = SPECIES[enemy.speciesId].moves
  return moves[Math.floor(Math.random() * moves.length)]
}

function appendEnemyTurn(state: BattleState): void {
  if (state.enemy.hp <= 0 || state.over) return
  const player = state.playerParty[state.activeIndex]
  if (!player || player.hp <= 0) return

  const move = enemyChooseMove(state.enemy)
  const { dmg, mult } = calcDamage(state.enemy, player, move)
  player.hp = Math.max(0, player.hp - dmg)
  let msg = `${displayName(state.enemy)} 使用 ${move.name}！造成 ${dmg} 伤害。`
  if (mult > 1) msg += ' 效果拔群！'
  if (mult < 1) msg += ' 效果一般…'
  state.log.push(msg)

  if (player.hp <= 0) {
    state.log.push(`${displayName(player)} 倒下了！`)
    const next = livingIndex(state.playerParty, state.activeIndex)
    if (next < 0) {
      state.over = true
      state.won = false
      state.log.push('队伍全灭……回到小镇休整吧。')
    } else {
      state.activeIndex = next
      state.log.push(`换上 ${displayName(state.playerParty[next])}！`)
    }
  }
}

/**
 * 玩家出招
 * @author zjh
 * @date 2026-10-14
 */
export function playerFight(state: BattleState, moveIndex: number): void {
  if (state.over) return
  const player = state.playerParty[state.activeIndex]
  const moves = SPECIES[player.speciesId].moves
  const move = moves[Math.min(moveIndex, moves.length - 1)]

  const playerFirst = player.spd >= state.enemy.spd

  const doPlayer = () => {
    const { dmg, mult } = calcDamage(player, state.enemy, move)
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg)
    let msg = `${displayName(player)} 使用 ${move.name}！造成 ${dmg} 伤害。`
    if (mult > 1) msg += ' 效果拔群！'
    if (mult < 1) msg += ' 效果一般…'
    state.log.push(msg)
    if (state.enemy.hp <= 0) {
      state.log.push(`${displayName(state.enemy)} 倒下了！`)
      const yieldExp = Math.round(
        SPECIES[state.enemy.speciesId].expYield * (0.8 + state.enemy.level * 0.12),
      )
      const growth = grantExp(player, yieldExp)
      state.log.push(...growth)
      state.over = true
      state.won = true
      if (state.kind === 'wild' && Math.random() < 0.35 && state.playerParty.length < 4) {
        // 野生遇敌有机会收服（简化：直接加入队伍副本）
        const caught = {
          ...state.enemy,
          uid: `${state.enemy.uid}-caught`,
          hp: Math.max(1, Math.floor(state.enemy.maxHp * 0.4)),
        }
        // 敌人已倒地：收服用满血半血表示“安抚后”
        caught.hp = Math.max(1, Math.floor(caught.maxHp / 2))
        state.playerParty.push(caught)
        state.log.push(`安抚成功！${displayName(caught)} 加入了队伍。`)
      }
    }
  }

  if (playerFirst) {
    doPlayer()
    if (!state.over) appendEnemyTurn(state)
  } else {
    appendEnemyTurn(state)
    if (!state.over && player.hp > 0) doPlayer()
  }
}

export function playerSwitch(state: BattleState, index: number): boolean {
  if (state.over) return false
  if (index === state.activeIndex) {
    state.log.push('已经在场上了。')
    return false
  }
  const target = state.playerParty[index]
  if (!target || target.hp <= 0) {
    state.log.push('无法换上倒下的伙伴。')
    return false
  }
  state.activeIndex = index
  state.log.push(`换上 ${displayName(target)}！`)
  appendEnemyTurn(state)
  return true
}

export function playerRun(state: BattleState): boolean {
  if (state.over) return false
  if (state.kind === 'trainer') {
    state.log.push('训练家对战无法逃跑！')
    return false
  }
  const player = state.playerParty[state.activeIndex]
  const chance = 0.45 + (player.spd - state.enemy.spd) * 0.03
  if (Math.random() < Math.max(0.25, Math.min(0.9, chance))) {
    state.fled = true
    state.over = true
    state.log.push('成功逃走了！')
    return true
  }
  state.log.push('逃跑失败！')
  appendEnemyTurn(state)
  return false
}

export function healParty(party: CreatureInstance[]): void {
  for (const c of party) {
    c.hp = c.maxHp
  }
}
