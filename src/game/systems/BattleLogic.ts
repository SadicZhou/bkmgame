/**
 * 回合制战斗结算（纯逻辑，无渲染）
 * 每条提示都会生成一帧快照 BattleFrame，场景按顺序播放即可得到正确的血条与动画时序。
 * @author zjh
 * @date 2026-10-14
 */

import {
  SPECIES,
  displayName,
  expToNext,
  getMoves,
  typeMultiplier,
  type CreatureInstance,
  type MoveDef,
} from '../data/creatures'
import { ITEMS, PARTY_LIMIT, catchChance } from '../data/items'
import { grantExp } from './Growth'

export type BattleKind = 'wild' | 'trainer' | 'boss'

export type BattleAnim =
  | 'none'
  | 'hitEnemy'
  | 'hitPlayer'
  | 'faintEnemy'
  | 'faintPlayer'
  | 'swapPlayer'
  | 'swapEnemy'
  | 'throw'
  | 'catchOk'
  | 'catchFail'
  | 'heal'
  | 'levelUp'
  | 'evolve'

/** 单方快照 */
export interface SideSnap {
  speciesId: string
  name: string
  level: number
  hp: number
  maxHp: number
  exp: number
  expNext: number
}

/** 一条提示 + 当时双方状态 */
export interface BattleFrame {
  text: string
  anim: BattleAnim
  mult?: number
  player: SideSnap
  enemy: SideSnap
}

export interface BattleState {
  kind: BattleKind
  playerParty: CreatureInstance[]
  enemyParty: CreatureInstance[]
  activeIndex: number
  enemyIndex: number
  trainerName?: string
  /** 待播放帧，场景取走后清空 */
  frames: BattleFrame[]
  over: boolean
  fled: boolean
  won: boolean
  caught: CreatureInstance | null
  coinsEarned: number
}

/** 非活跃伙伴分到的经验比例 */
const SHARE_RATE = 0.3

function snap(c: CreatureInstance): SideSnap {
  return {
    speciesId: c.speciesId,
    name: displayName(c),
    level: c.level,
    hp: c.hp,
    maxHp: c.maxHp,
    exp: c.exp,
    expNext: expToNext(c.level),
  }
}

export function activePlayer(s: BattleState): CreatureInstance {
  return s.playerParty[s.activeIndex]
}

export function activeEnemy(s: BattleState): CreatureInstance {
  return s.enemyParty[s.enemyIndex]
}

/** 记录一帧 */
function say(s: BattleState, text: string, anim: BattleAnim = 'none', mult?: number): void {
  s.frames.push({ text, anim, mult, player: snap(activePlayer(s)), enemy: snap(activeEnemy(s)) })
}

/**
 * 开始战斗
 * @author zjh
 * @date 2026-10-14
 */
export function startBattle(
  party: CreatureInstance[],
  enemies: CreatureInstance[],
  kind: BattleKind,
  trainerName?: string,
): BattleState {
  const activeIndex = Math.max(0, party.findIndex((c) => c.hp > 0))
  const s: BattleState = {
    kind,
    playerParty: party,
    enemyParty: enemies,
    activeIndex,
    enemyIndex: 0,
    trainerName,
    frames: [],
    over: false,
    fled: false,
    won: false,
    caught: null,
    coinsEarned: 0,
  }
  const enemy = enemies[0]
  if (kind === 'wild') say(s, `野生的 ${displayName(enemy)} 跳了出来！`, 'swapEnemy')
  else say(s, `${trainerName ?? '对手'} 派出了 ${displayName(enemy)}！`, 'swapEnemy')
  say(s, `去吧，${displayName(activePlayer(s))}！`, 'swapPlayer')
  return s
}

/**
 * 计算一次招式伤害：等级、攻防比、属性克制、本系加成、会心与浮动
 * @author zjh
 * @date 2026-10-14
 */
export function calcDamage(
  attacker: CreatureInstance,
  defender: CreatureInstance,
  move: MoveDef,
): { dmg: number; mult: number; crit: boolean } {
  const atkType = SPECIES[attacker.speciesId].type
  const defType = SPECIES[defender.speciesId].type
  const mult = typeMultiplier(move.type, defType)
  const stab = move.type === atkType ? 1.2 : 1
  const crit = Math.random() < 1 / 16
  const raw =
    ((2 * attacker.level) / 5 + 2) * move.power * (attacker.atk / Math.max(1, defender.def))
  const dmg = Math.max(
    1,
    Math.round((raw / 12) * mult * stab * (crit ? 1.5 : 1) * (0.9 + Math.random() * 0.2)),
  )
  return { dmg, mult, crit }
}

/**
 * 敌方选招：训练家/BOSS 较聪明（偏好打出最高期望伤害），野生随机
 * @author zjh
 * @date 2026-10-14
 */
function enemyChooseMove(s: BattleState): MoveDef {
  const enemy = activeEnemy(s)
  const moves = getMoves(enemy)
  const smart = s.kind !== 'wild' && Math.random() < (s.kind === 'boss' ? 0.8 : 0.6)
  if (!smart) return moves[Math.floor(Math.random() * moves.length)]
  const targetType = SPECIES[activePlayer(s).speciesId].type
  const selfType = SPECIES[enemy.speciesId].type
  const score = (m: MoveDef) =>
    m.power * typeMultiplier(m.type, targetType) * (m.type === selfType ? 1.2 : 1)
  return moves.reduce((best, m) => (score(m) > score(best) ? m : best), moves[0])
}

function effectText(mult: number, crit: boolean): string {
  let t = ''
  if (crit) t += ' 会心一击！'
  if (mult > 1) t += ' 效果拔群！'
  if (mult < 1) t += ' 效果一般…'
  return t
}

function livingIndex(party: CreatureInstance[]): number {
  return party.findIndex((c) => c.hp > 0)
}

/** 结算胜利金币 */
function rewardCoins(s: BattleState): number {
  const levels = s.enemyParty.reduce((sum, c) => sum + c.level, 0)
  if (s.kind === 'wild') return levels * 6
  if (s.kind === 'trainer') return levels * 12
  return levels * 20
}

/**
 * 分配经验：在场伙伴全额，其他存活伙伴按比例
 * @author zjh
 * @date 2026-10-14
 */
function distributeExp(s: BattleState, defeated: CreatureInstance): void {
  const base = SPECIES[defeated.speciesId].expYield * (0.8 + defeated.level * 0.12)
  const bonus = s.kind === 'wild' ? 1 : 1.5
  const full = Math.round(base * bonus)
  s.playerParty.forEach((c, i) => {
    if (c.hp <= 0) return
    const amount = i === s.activeIndex ? full : Math.round(full * SHARE_RATE)
    for (const ev of grantExp(c, amount)) {
      if (i !== s.activeIndex && ev.kind === 'exp') continue
      const anim: BattleAnim =
        ev.kind === 'evolve' ? 'evolve' : ev.kind === 'levelUp' ? 'levelUp' : 'none'
      say(s, ev.text, i === s.activeIndex ? anim : 'none')
    }
  })
}

/** 胜利收尾 */
function finishWin(s: BattleState): void {
  s.over = true
  s.won = true
  s.coinsEarned = rewardCoins(s)
  say(s, `战斗胜利！获得 ${s.coinsEarned} 枚焰币。`)
}

/**
 * 对手倒下后的处理：经验、换下一只或胜利
 * @author zjh
 * @date 2026-10-14
 */
function onEnemyFainted(s: BattleState): void {
  const enemy = activeEnemy(s)
  say(s, `${displayName(enemy)} 倒下了！`, 'faintEnemy')
  distributeExp(s, enemy)
  const next = s.enemyParty.findIndex((c, i) => i > s.enemyIndex && c.hp > 0)
  if (next >= 0) {
    s.enemyIndex = next
    say(s, `${s.trainerName ?? '对手'} 派出了 ${displayName(activeEnemy(s))}！`, 'swapEnemy')
    return
  }
  finishWin(s)
}

/** 我方当前伙伴倒下后的处理：自动换人或全灭 */
function onPlayerFainted(s: BattleState): void {
  const fallen = activePlayer(s)
  say(s, `${displayName(fallen)} 倒下了！`, 'faintPlayer')
  const next = livingIndex(s.playerParty)
  if (next < 0) {
    s.over = true
    s.won = false
    say(s, '队伍全灭……眼前一黑。')
    return
  }
  s.activeIndex = next
  say(s, `换上 ${displayName(activePlayer(s))}！`, 'swapPlayer')
}

function doAttack(s: BattleState, side: 'player' | 'enemy', move: MoveDef): void {
  const attacker = side === 'player' ? activePlayer(s) : activeEnemy(s)
  const defender = side === 'player' ? activeEnemy(s) : activePlayer(s)
  const { dmg, mult, crit } = calcDamage(attacker, defender, move)
  defender.hp = Math.max(0, defender.hp - dmg)
  say(
    s,
    `${displayName(attacker)} 使用 ${move.name}！${effectText(mult, crit)}`,
    side === 'player' ? 'hitEnemy' : 'hitPlayer',
    mult,
  )
  if (defender.hp <= 0) {
    if (side === 'player') onEnemyFainted(s)
    else onPlayerFainted(s)
  }
}

/** 敌方回合（我方执行非攻击行动后调用） */
function enemyTurn(s: BattleState): void {
  if (s.over || activeEnemy(s).hp <= 0 || activePlayer(s).hp <= 0) return
  doAttack(s, 'enemy', enemyChooseMove(s))
}

/**
 * 玩家出招：按速度决定先后
 * @author zjh
 * @date 2026-10-14
 */
export function playerFight(s: BattleState, moveIndex: number): void {
  if (s.over) return
  const player = activePlayer(s)
  const moves = getMoves(player)
  const move = moves[Math.min(moveIndex, moves.length - 1)]
  const enemyMove = enemyChooseMove(s)
  const enemyRef = activeEnemy(s)

  const playerFirst =
    player.spd > enemyRef.spd || (player.spd === enemyRef.spd && Math.random() < 0.5)

  if (playerFirst) {
    doAttack(s, 'player', move)
    // 对手换了下一只时，新上场的对手本回合不再出手
    if (!s.over && activeEnemy(s) === enemyRef && player.hp > 0) doAttack(s, 'enemy', enemyMove)
  } else {
    doAttack(s, 'enemy', enemyMove)
    if (!s.over && activePlayer(s) === player && player.hp > 0) doAttack(s, 'player', move)
  }
}

export function playerSwitch(s: BattleState, index: number): boolean {
  if (s.over) return false
  if (index === s.activeIndex) {
    say(s, '它已经在场上了。')
    return false
  }
  const target = s.playerParty[index]
  if (!target || target.hp <= 0) {
    say(s, '无法换上倒下的伙伴。')
    return false
  }
  say(s, `回来吧，${displayName(activePlayer(s))}！`)
  s.activeIndex = index
  say(s, `去吧，${displayName(target)}！`, 'swapPlayer')
  enemyTurn(s)
  return true
}

export function playerRun(s: BattleState): boolean {
  if (s.over) return false
  if (s.kind !== 'wild') {
    say(s, '这场对战无法逃跑！')
    return false
  }
  const player = activePlayer(s)
  const chance = 0.5 + (player.spd - activeEnemy(s).spd) * 0.03
  if (Math.random() < Math.max(0.3, Math.min(0.95, chance))) {
    s.fled = true
    s.over = true
    say(s, '成功逃走了！')
    return true
  }
  say(s, '没能逃掉！')
  enemyTurn(s)
  return true
}

/** 道具能否使用的检查结果 */
export interface ItemCheck {
  ok: boolean
  reason?: string
}

/**
 * 检查道具是否可对目标使用（不消耗回合，仅用于 UI 提示）
 * @author zjh
 * @date 2026-10-14
 */
export function checkItem(s: BattleState, itemId: string, targetIndex: number): ItemCheck {
  const item = ITEMS[itemId]
  if (!item) return { ok: false, reason: '未知道具' }
  if (item.kind === 'catch') {
    if (s.kind !== 'wild') return { ok: false, reason: '不能安抚别人的伙伴！' }
    if (!SPECIES[activeEnemy(s).speciesId].catchable) return { ok: false, reason: '它不为所动……' }
    if (s.playerParty.length >= PARTY_LIMIT) return { ok: false, reason: `队伍已满（最多 ${PARTY_LIMIT} 只）` }
    return { ok: true }
  }
  const target = s.playerParty[targetIndex]
  if (!target) return { ok: false, reason: '没有目标' }
  if (item.kind === 'heal') {
    if (target.hp <= 0) return { ok: false, reason: '倒下的伙伴需要复苏草' }
    if (target.hp >= target.maxHp) return { ok: false, reason: 'HP 已经是满的' }
    return { ok: true }
  }
  if (target.hp > 0) return { ok: false, reason: '它还没有倒下' }
  return { ok: true }
}

/**
 * 使用道具（调用前须先 checkItem；道具扣除由调用方负责）
 * @author zjh
 * @date 2026-10-14
 */
export function playerUseItem(s: BattleState, itemId: string, targetIndex: number): void {
  if (s.over) return
  const item = ITEMS[itemId]

  if (item.kind === 'catch') {
    const enemy = activeEnemy(s)
    say(s, `你轻轻抛出了 ${item.name}……`, 'throw')
    if (Math.random() < catchChance(enemy.hp, enemy.maxHp, item.value)) {
      const caught: CreatureInstance = { ...enemy, uid: `${enemy.uid}-pal`, moves: [...getMoves(enemy).map((m) => m.id)] }
      s.playerParty.push(caught)
      s.caught = caught
      s.over = true
      s.won = true
      say(s, `${displayName(caught)} 闻了闻，开心地加入了队伍！`, 'catchOk')
      return
    }
    say(s, `${displayName(enemy)} 扭过头去，安抚失败了！`, 'catchFail')
    enemyTurn(s)
    return
  }

  const target = s.playerParty[targetIndex]
  if (item.kind === 'heal') {
    const before = target.hp
    target.hp = Math.min(target.maxHp, target.hp + item.value)
    say(s, `${displayName(target)} 回复了 ${target.hp - before} 点 HP。`, targetIndex === s.activeIndex ? 'heal' : 'none')
  } else {
    target.hp = Math.max(1, Math.floor(target.maxHp * item.value))
    say(s, `${displayName(target)} 重新振作起来了！`)
  }
  enemyTurn(s)
}
