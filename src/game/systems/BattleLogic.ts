/**
 * 回合制战斗流程（纯逻辑，无渲染）：出招顺序、技能结算、倒下与换人、回合结束效果、经验与奖励
 * 数值计算见 BattleCalc；状态见 StatusEffects；特性见 AbilityHooks；敌方选招见 BattleAI。
 * @author zjh
 * @date 2026-10-14
 */

import {
  MOVES,
  SPECIES,
  STRUGGLE,
  battleName,
  type CreatureInstance,
  type MoveDef,
} from '../data/creatures'
import { ITEMS, PARTY_LIMIT, catchChance } from '../data/items'
import type { ElementType } from '../data/types'
import { WEATHER_INFO, type Weather } from '../data/weather'
import { guaranteedEscape, isType, onContact, onEnter, onFaint, onHit, onTurnEnd, tryEndure } from './AbilityHooks'
import { chooseEnemyMove } from './BattleAI'
import { calcDamage, effectiveSpeed, rollHit } from './BattleCalc'
import {
  activeEnemy,
  activePlayer,
  actorOf,
  dealDamage,
  other,
  resetVolatile,
  restoreHp,
  say,
  sideAnim,
  volOf,
  type BattleKind,
  type BattleState,
  type Side,
} from './BattleCore'
import { addFriendship, grantExp } from './Growth'
import { beforeMove, changeStages, tryApplyStatus, tryApplyVolatile } from './StatusEffects'

export { activeEnemy, activePlayer } from './BattleCore'
export type { BattleAnim, BattleFrame, BattleKind, BattleState, SideSnap, PendingLearn } from './BattleCore'

/** 非活跃伙伴分到的经验比例 */
const SHARE_RATE = 0.3

export interface BattleOptions {
  trainerName?: string
  weather?: Weather | null
  night?: boolean
  token?: boolean
  /** 玩家徽记属性 */
  badges?: ElementType[]
}

/**
 * 开始战斗：入场提示、天气提示、出场特性
 * @author zjh
 * @date 2026-10-14
 */
export function startBattle(
  party: CreatureInstance[],
  enemies: CreatureInstance[],
  kind: BattleKind,
  opts: BattleOptions = {},
): BattleState {
  const s: BattleState = {
    kind,
    playerParty: party,
    enemyParty: enemies,
    activeIndex: Math.max(0, party.findIndex((c) => c.hp > 0)),
    enemyIndex: 0,
    trainerName: opts.trainerName,
    frames: [],
    over: false,
    fled: false,
    won: false,
    caught: null,
    caughtToStorage: false,
    coinsEarned: 0,
    weather: opts.weather ?? null,
    weatherTurns: 0,
    mapWeather: opts.weather ?? null,
    night: !!opts.night,
    token: !!opts.token,
    badges: opts.badges ?? [],
    vol: {},
    pendingLearns: [],
    turn: 1,
  }
  const enemy = enemies[0]
  if (kind === 'wild') say(s, `野生的 ${battleName(enemy)} 跳了出来！`, 'swapEnemy')
  else if (kind === 'unique') say(s, `${battleName(enemy)} 出现在你面前！`, 'swapEnemy')
  else say(s, `${opts.trainerName ?? '对手'} 派出了 ${battleName(enemy)}！`, 'swapEnemy')
  if (enemy.shiny) say(s, '✦ 它的身体闪闪发光！')
  if (kind === 'unique' && s.token) say(s, '异象信物亮了起来，它被光芒吸引住了！')
  if (s.weather) say(s, `${WEATHER_INFO[s.weather].icon} 场地天气：${WEATHER_INFO[s.weather].label}`, 'weather')
  say(s, `去吧，${battleName(activePlayer(s))}！`, 'swapPlayer')
  onEnter(s, 'player')
  onEnter(s, 'enemy')
  return s
}

function effectText(mult: number, crit: boolean): string {
  let t = ''
  if (crit) t += ' 会心一击！'
  if (mult > 1) t += ' 效果拔群！'
  if (mult < 1) t += ' 效果一般…'
  return t
}

/** 结算胜利金币 */
function rewardCoins(s: BattleState): number {
  const levels = s.enemyParty.reduce((sum, c) => sum + c.level, 0)
  if (s.kind === 'wild') return levels * 6
  if (s.kind === 'trainer') return levels * 12
  if (s.kind === 'unique') return levels * 10
  return levels * 20
}

/**
 * 分配经验：在场伙伴全额，其他存活伙伴按比例；收集待学技能
 * @author zjh
 * @date 2026-10-14
 */
function distributeExp(s: BattleState, defeated: CreatureInstance): void {
  const base = SPECIES[defeated.speciesId].expYield * (0.8 + defeated.level * 0.12)
  const full = Math.round(base * (s.kind === 'wild' ? 1 : 1.5))
  s.playerParty.forEach((c, i) => {
    if (c.hp <= 0) return
    const active = i === s.activeIndex
    for (const ev of grantExp(c, active ? full : Math.round(full * SHARE_RATE))) {
      if (!active && ev.kind === 'exp') continue
      if (ev.kind === 'wantLearn' && ev.moveId) s.pendingLearns.push({ uid: c.uid, moveId: ev.moveId })
      const anim = !active
        ? 'none'
        : ev.kind === 'evolve'
          ? 'evolve'
          : ev.kind === 'awaken'
            ? 'awaken'
            : ev.kind === 'levelUp'
              ? 'levelUp'
              : 'none'
      say(s, ev.text, anim)
    }
  })
}

function finishWin(s: BattleState): void {
  s.over = true
  s.won = true
  s.coinsEarned = rewardCoins(s)
  addFriendship(activePlayer(s), 1)
  say(s, `战斗胜利！获得 ${s.coinsEarned} 枚焰币。`)
}

function onEnemyFainted(s: BattleState): void {
  const enemy = activeEnemy(s)
  say(s, `${battleName(enemy)} 倒下了！`, 'faintEnemy')
  distributeExp(s, enemy)
  const next = s.enemyParty.findIndex((c, i) => i > s.enemyIndex && c.hp > 0)
  if (next < 0) {
    finishWin(s)
    return
  }
  s.enemyIndex = next
  resetVolatile(s, activeEnemy(s))
  say(s, `${s.trainerName ?? '对手'} 派出了 ${battleName(activeEnemy(s))}！`, 'swapEnemy')
  onEnter(s, 'enemy')
}

function onPlayerFainted(s: BattleState): void {
  const fallen = activePlayer(s)
  say(s, `${battleName(fallen)} 倒下了！`, 'faintPlayer')
  resetVolatile(s, fallen)
  const next = s.playerParty.findIndex((c) => c.hp > 0)
  if (next < 0) {
    s.over = true
    s.won = false
    say(s, '队伍全灭……眼前一黑。')
    return
  }
  s.activeIndex = next
  say(s, `换上 ${battleName(activePlayer(s))}！`, 'swapPlayer')
  onEnter(s, 'player')
}

/**
 * 检查双方是否倒下（含涅槃复活、余烬反击引起的连锁）
 * @author zjh
 * @date 2026-10-14
 */
function checkFaints(s: BattleState): void {
  for (let guard = 0; guard < 4 && !s.over; guard++) {
    const e = activeEnemy(s)
    const p = activePlayer(s)
    if (e.hp > 0 && p.hp > 0) return
    if (e.hp <= 0 && !onFaint(s, 'enemy', e)) onEnemyFainted(s)
    if (s.over) return
    const p2 = activePlayer(s)
    if (p2.hp <= 0 && !onFaint(s, 'player', p2)) onPlayerFainted(s)
  }
}

/**
 * 结算技能附加效果（攻击技按概率触发；变化技必定触发）
 * @author zjh
 * @date 2026-10-14
 */
function applyEffect(s: BattleState, side: Side, user: CreatureInstance, target: CreatureInstance, move: MoveDef, damage: number): void {
  const e = move.effect
  if (!e) return
  const isStatus = move.category === 'status'
  if (!isStatus && Math.random() * 100 >= e.chance) return
  const whoSide = e.target === 'self' ? side : other(side)
  const who = e.target === 'self' ? user : target
  if (e.status) tryApplyStatus(s, whoSide, who, e.status, isStatus)
  if (e.volatile) tryApplyVolatile(s, whoSide, who, e.volatile, isStatus)
  if (e.stages) changeStages(s, whoSide, who, e.stages)
  if (e.healRatio) {
    const ratio = move.id === 'synthesis' && s.weather === 'sunny' ? 0.66 : e.healRatio
    const healed = restoreHp(user, user.maxHp * ratio)
    say(s, healed > 0 ? `${battleName(user)} 回复了 ${healed} HP！` : `${battleName(user)} 的 HP 已经是满的。`, healed > 0 ? sideAnim(side, 'heal', 'healEnemy') : 'none')
  }
  if (e.drainRatio && damage > 0) {
    const healed = restoreHp(user, Math.max(1, damage * e.drainRatio))
    if (healed > 0) say(s, `${battleName(user)} 吸取了 ${healed} HP！`, sideAnim(side, 'heal', 'healEnemy'))
  }
  if (e.recoilRatio && damage > 0) {
    const hurt = dealDamage(user, Math.max(1, damage * e.recoilRatio))
    say(s, `${battleName(user)} 受到了反作用力伤害！（-${hurt}）`, sideAnim(side, 'hurtPlayer', 'hurtEnemy'))
  }
}

/**
 * 变化技：特殊技（潮愈/霜壁/沙暴/吹散）+ 通用效果
 * @author zjh
 * @date 2026-10-14
 */
function useStatusMove(s: BattleState, side: Side, user: CreatureInstance, target: CreatureInstance, move: MoveDef): void {
  const name = battleName(user)
  say(s, `${name} 使用 ${move.name}！`)
  if (move.effect?.target === 'foe' && !rollHit(s, move, target)) {
    say(s, '但是没有命中……', 'miss')
    return
  }
  const vol = volOf(s, user)
  switch (move.special) {
    case 'aqua_ring':
      vol.aquaRing = 5
      say(s, `${name} 被温柔的水环包围了！`, sideAnim(side, 'buffPlayer', 'buffEnemy'))
      return
    case 'frost_wall':
      vol.frostWall = 3
      say(s, `${name} 竖起了一道霜壁！`, sideAnim(side, 'buffPlayer', 'buffEnemy'))
      return
    case 'sandstorm':
      s.weather = 'sand'
      s.weatherTurns = 5
      say(s, '狂风卷起了沙暴！', 'weather')
      return
    case 'defog': {
      const foeVol = volOf(s, target)
      for (const k of ['atk', 'def', 'spd'] as const) foeVol.stages[k] = Math.min(0, foeVol.stages[k])
      s.weather = null
      s.weatherTurns = 0
      say(s, '一阵风吹散了场上的一切！', 'weather')
      return
    }
  }
  applyEffect(s, side, user, target, move, 0)
}

/**
 * 执行一方的技能（slotIndex = -1 表示挣扎）
 * @author zjh
 * @date 2026-10-14
 */
function executeMove(s: BattleState, side: Side, slotIndex: number): void {
  const user = actorOf(s, side)
  const target = actorOf(s, other(side))
  if (s.over || user.hp <= 0) return
  const vol = volOf(s, user)
  if (beforeMove(s, side, user) === 'skip') {
    vol.lastMove = null
    checkFaints(s)
    return
  }

  let move: MoveDef
  if (slotIndex < 0) {
    move = STRUGGLE
    say(s, `${battleName(user)} 已经没有可用的技能了！`)
  } else {
    const slot = user.moves[slotIndex]
    move = MOVES[slot.id]
    slot.pp = Math.max(0, slot.pp - 1)
  }
  vol.echo = vol.lastMove === move.id ? vol.echo + 1 : 0
  vol.lastMove = move.id

  if (move.category === 'status') {
    useStatusMove(s, side, user, target, move)
    checkFaints(s)
    return
  }

  const name = battleName(user)
  if (!rollHit(s, move, target)) {
    say(s, `${name} 使用 ${move.name}！但是没有命中……`, 'miss')
    return
  }
  const { dmg, mult, crit } = calcDamage(s, user, target, move)
  const endured = tryEndure(s, target, dmg)
  const dealt = dealDamage(target, endured ? target.hp - 1 : dmg)
  say(s, `${name} 使用 ${move.name}！${effectText(mult, crit)}`, sideAnim(side, 'hitEnemy', 'hitPlayer'), mult)
  if (endured) say(s, `${battleName(target)} 的「守护者」让它撑住了！`)

  if (target.status === 'freeze' && move.type === 'flame' && target.hp > 0) {
    target.status = null
    say(s, `${battleName(target)} 身上的冰被烧化了！`)
  }
  if (move.contact) onContact(s, side, user, target)
  onHit(s, side, user, target, move, crit)
  applyEffect(s, side, user, target, move, dealt)
  if (move.id === STRUGGLE.id) {
    const hurt = dealDamage(user, Math.max(1, user.maxHp / 4))
    say(s, `${name} 受到了挣扎的反作用力！（-${hurt}）`, sideAnim(side, 'hurtPlayer', 'hurtEnemy'))
  }
  checkFaints(s)
}

/**
 * 回合结束：灼烧、寄生、潮愈、沙暴、自愈/花香、霜壁与招式天气倒计时
 * @author zjh
 * @date 2026-10-14
 */
function endOfTurn(s: BattleState): void {
  for (const side of ['player', 'enemy'] as Side[]) {
    if (s.over) return
    const c = actorOf(s, side)
    if (c.hp <= 0) continue
    const vol = volOf(s, c)
    const name = battleName(c)
    const hurtAnim = sideAnim(side, 'hurtPlayer', 'hurtEnemy')
    if (c.status === 'burn') {
      const d = dealDamage(c, Math.max(1, c.maxHp / 16))
      say(s, `${name} 受到灼烧伤害！（-${d}）`, hurtAnim)
    }
    if (c.hp > 0 && vol.seeded) {
      const foe = actorOf(s, other(side))
      const d = dealDamage(c, Math.max(1, c.maxHp / 8))
      restoreHp(foe, d)
      say(s, `寄生种吸取了 ${name} 的体力！（-${d}）`, hurtAnim)
    }
    if (c.hp > 0 && vol.aquaRing > 0) {
      vol.aquaRing -= 1
      const healed = restoreHp(c, c.maxHp / 16)
      if (healed > 0) say(s, `水环为 ${name} 回复了 ${healed} HP。`, sideAnim(side, 'heal', 'healEnemy'))
    }
    if (c.hp > 0 && s.weather === 'sand' && !isType(c, 'stone')) {
      const d = dealDamage(c, Math.max(1, c.maxHp / 16))
      say(s, `沙暴击打着 ${name}！（-${d}）`, hurtAnim)
    }
    onTurnEnd(s, side, c)
    if (vol.frostWall > 0) {
      vol.frostWall -= 1
      if (vol.frostWall === 0) say(s, `${name} 的霜壁消失了。`)
    }
    checkFaints(s)
  }
  if (s.over) return
  if (s.weatherTurns > 0) {
    s.weatherTurns -= 1
    if (s.weatherTurns === 0) {
      s.weather = s.mapWeather
      say(s, '沙暴停息了。', 'weather')
    }
  }
  s.turn += 1
}

/** 携带异象信物时，唯一精灵第一回合被信物吸引、不会行动 */
function tokenHolds(s: BattleState): boolean {
  return s.kind === 'unique' && s.token && s.turn === 1
}

function sayTokenHold(s: BattleState): void {
  say(s, `${battleName(activeEnemy(s))} 出神地望着异象信物，没有行动……`)
}

/** 敌方单独行动一次（我方执行非攻击行动后） */
function enemyTurn(s: BattleState): void {
  if (s.over) return
  if (tokenHolds(s)) sayTokenHold(s)
  else if (activeEnemy(s).hp > 0 && activePlayer(s).hp > 0) executeMove(s, 'enemy', chooseEnemyMove(s))
  endOfTurn(s)
}

/**
 * 玩家出招：先比优先度，再比实际速度
 * @author zjh
 * @date 2026-10-14
 */
export function playerFight(s: BattleState, slotIndex: number): void {
  if (s.over) return
  const player = activePlayer(s)
  const enemy = activeEnemy(s)
  if (slotIndex >= 0 && (player.moves[slotIndex]?.pp ?? 0) <= 0) {
    say(s, '这个技能的 PP 已经用完了！')
    return
  }
  if (tokenHolds(s)) {
    executeMove(s, 'player', slotIndex)
    if (!s.over && activeEnemy(s) === enemy) sayTokenHold(s)
    endOfTurn(s)
    return
  }
  const pMove = slotIndex < 0 ? STRUGGLE : MOVES[player.moves[slotIndex].id]
  const eChoice = chooseEnemyMove(s)
  const eMove = eChoice < 0 ? STRUGGLE : MOVES[enemy.moves[eChoice].id]

  let playerFirst: boolean
  if (pMove.priority !== eMove.priority) playerFirst = pMove.priority > eMove.priority
  else {
    const ps = effectiveSpeed(s, player)
    const es = effectiveSpeed(s, enemy)
    playerFirst = ps > es || (ps === es && Math.random() < 0.5)
  }

  if (playerFirst) {
    executeMove(s, 'player', slotIndex)
    // 对手换了下一只时，新上场的对手本回合不再出手
    if (!s.over && activeEnemy(s) === enemy && activePlayer(s) === player) executeMove(s, 'enemy', eChoice)
  } else {
    executeMove(s, 'enemy', eChoice)
    if (!s.over && activePlayer(s) === player && activeEnemy(s) === enemy) executeMove(s, 'player', slotIndex)
  }
  endOfTurn(s)
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
  say(s, `回来吧，${battleName(activePlayer(s))}！`)
  resetVolatile(s, activePlayer(s))
  s.activeIndex = index
  say(s, `去吧，${battleName(target)}！`, 'swapPlayer')
  onEnter(s, 'player')
  enemyTurn(s)
  return true
}

/** 是否允许逃跑 */
export function canRun(s: BattleState): boolean {
  return s.kind === 'wild' || s.kind === 'unique'
}

export function playerRun(s: BattleState): boolean {
  if (s.over) return false
  if (!canRun(s)) {
    say(s, '这场对战无法逃跑！')
    return false
  }
  const player = activePlayer(s)
  const diff = effectiveSpeed(s, player) - effectiveSpeed(s, activeEnemy(s))
  const chance = Math.max(0.3, Math.min(0.95, 0.5 + diff * 0.03))
  if (guaranteedEscape(player) || Math.random() < chance) {
    s.fled = true
    s.over = true
    say(s, guaranteedEscape(player) ? `${battleName(player)} 的「胆怯」让大家飞快地溜走了！` : '成功逃走了！')
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
    if (!canRun(s)) return { ok: false, reason: '不能安抚别人的伙伴！' }
    if (SPECIES[activeEnemy(s).speciesId].catchRate <= 0) return { ok: false, reason: '它不为所动……' }
    return { ok: true }
  }
  if (item.kind === 'lure' || item.kind === 'repel') return { ok: false, reason: '只能在野外使用' }
  const target = s.playerParty[targetIndex]
  if (!target) return { ok: false, reason: '没有目标' }
  return checkItemOnCreature(itemId, target)
}

/**
 * 道具对某只伙伴是否有效（战斗内外共用）
 * @author zjh
 * @date 2026-10-14
 */
export function checkItemOnCreature(itemId: string, target: CreatureInstance): ItemCheck {
  const item = ITEMS[itemId]
  switch (item.kind) {
    case 'heal':
      if (target.hp <= 0) return { ok: false, reason: '倒下的伙伴需要复苏草' }
      if (target.hp >= target.maxHp) return { ok: false, reason: 'HP 已经是满的' }
      return { ok: true }
    case 'revive':
      return target.hp > 0 ? { ok: false, reason: '它还没有倒下' } : { ok: true }
    case 'cure':
      return target.status ? { ok: true } : { ok: false, reason: '没有异常状态' }
    case 'pp':
      return target.moves.some((m) => m.pp < (MOVES[m.id]?.pp ?? 0)) ? { ok: true } : { ok: false, reason: 'PP 都是满的' }
    default:
      return { ok: false, reason: '现在不能使用' }
  }
}

/**
 * 对伙伴使用回复类道具（战斗内外共用），返回提示文本
 * @author zjh
 * @date 2026-10-14
 */
export function applyItemToCreature(itemId: string, target: CreatureInstance): string {
  const item = ITEMS[itemId]
  const name = battleName(target)
  switch (item.kind) {
    case 'heal': {
      const before = target.hp
      target.hp = Math.min(target.maxHp, target.hp + item.value)
      return `${name} 回复了 ${target.hp - before} 点 HP。`
    }
    case 'revive':
      target.hp = Math.max(1, Math.floor(target.maxHp * item.value))
      return `${name} 重新振作起来了！`
    case 'cure':
      target.status = null
      return `${name} 的异常状态消失了！`
    case 'pp':
      for (const m of target.moves) {
        const max = MOVES[m.id]?.pp ?? m.pp
        m.pp = item.value > 0 ? Math.min(max, m.pp + item.value) : max
      }
      return `${name} 的技能 PP 回复了！`
    default:
      return ''
  }
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
    const chance = catchChance(enemy.hp, enemy.maxHp, item.value, {
      status: enemy.status,
      speciesRate: SPECIES[enemy.speciesId].catchRate,
      token: s.token,
    })
    if (Math.random() < chance) {
      const caught: CreatureInstance = { ...structuredClone(enemy), uid: `${enemy.uid}-pal` }
      if (s.playerParty.length < PARTY_LIMIT) s.playerParty.push(caught)
      else s.caughtToStorage = true
      s.caught = caught
      s.over = true
      s.won = true
      say(s, `${battleName(caught)} 闻了闻，开心地${s.caughtToStorage ? '成为了你的伙伴' : '加入了队伍'}！`, 'catchOk')
      if (s.caughtToStorage) say(s, '（队伍已满，它被送往了伙伴寄存所。）')
      return
    }
    say(s, `${battleName(enemy)} 扭过头去，安抚失败了！`, 'catchFail')
    enemyTurn(s)
    return
  }

  const target = s.playerParty[targetIndex]
  const healAnim = item.kind === 'heal' && targetIndex === s.activeIndex ? 'heal' : 'none'
  say(s, applyItemToCreature(itemId, target), healAnim)
  enemyTurn(s)
}
