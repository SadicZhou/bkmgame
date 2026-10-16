/**
 * 特性在战斗各时机的结算钩子（特性定义见 data/abilities.ts）
 * @author zjh
 * @date 2026-10-14
 */

import { ABILITIES } from '../data/abilities'
import { SPECIES, battleName, type CreatureInstance, type MoveDef } from '../data/creatures'
import {
  actorOf,
  dealDamage,
  other,
  restoreHp,
  say,
  sideAnim,
  volOf,
  type BattleState,
  type Side,
} from './BattleCore'
import { changeStages, tryApplyStatus, tryApplyVolatile } from './StatusEffects'

function abilityName(c: CreatureInstance): string {
  return ABILITIES[c.abilityId]?.name ?? ''
}

/** 亲密度 ≥ 220 的「同心」加成 */
function kindredMod(c: CreatureInstance): number {
  return c.abilityId === 'kindred' && c.friendship >= 220 ? 1.05 : 1
}

/**
 * 攻击方威力修正：焰心/激流/茂盛、水泡、回响
 * @author zjh
 * @date 2026-10-14
 */
export function attackerPowerMod(s: BattleState, c: CreatureInstance, move: MoveDef): number {
  let m = 1
  const pinch = c.hp < c.maxHp / 3
  if (pinch && c.abilityId === 'blaze_heart' && move.type === 'flame') m *= 1.3
  if (pinch && c.abilityId === 'torrent_heart' && move.type === 'tide') m *= 1.3
  if (pinch && c.abilityId === 'overgrow' && move.type === 'leaf') m *= 1.3
  if (c.abilityId === 'bubble' && move.type === 'tide') m *= 1.2
  if (c.abilityId === 'echo') m *= 1 + Math.min(0.3, volOf(s, c).echo * 0.1)
  return m * kindredMod(c)
}

/**
 * 防守方伤害修正：坚甲、毛绒、熔甲、同心
 * @author zjh
 * @date 2026-10-14
 */
export function defenderDamageMod(c: CreatureInstance, move: MoveDef, typeMult: number): number {
  let m = 1
  if (c.abilityId === 'hard_shell' && typeMult > 1) m *= 0.8
  if (c.abilityId === 'fluffy') {
    if (move.contact) m *= 0.75
    if (move.type === 'flame') m *= 1.25
  }
  if (c.abilityId === 'magma_armor' && move.type === 'tide') m *= 0.75
  return m / kindredMod(c)
}

/** 速度修正：迅捷、同心 */
export function speedMod(c: CreatureInstance): number {
  return (c.abilityId === 'swift' ? 1.1 : 1) * kindredMod(c)
}

/** 会心率：基础 1/16，羽刃 1/8，好运翻倍 */
export function critRate(c: CreatureInstance, move: MoveDef): number {
  let rate = move.special === 'high_crit' ? 1 / 8 : 1 / 16
  if (c.abilityId === 'lucky') rate *= 2
  return rate
}

/** 闪避修正（命中率倍率）：雪隐 */
export function evasionMod(s: BattleState, c: CreatureInstance): number {
  return c.abilityId === 'snow_cloak' && s.weather === 'snow' ? 0.9 : 1
}

/**
 * 出场时：威吓、顺风
 * @author zjh
 * @date 2026-10-14
 */
export function onEnter(s: BattleState, side: Side): void {
  const c = actorOf(s, side)
  if (!c || c.hp <= 0) return
  if (c.abilityId === 'intimidate') {
    const foe = actorOf(s, other(side))
    say(s, `${battleName(c)} 的「威吓」！`)
    changeStages(s, other(side), foe, { atk: -1 })
  } else if (c.abilityId === 'tailwind_born') {
    say(s, `${battleName(c)} 乘着「顺风」！`)
    changeStages(s, side, c, { spd: 1 })
  }
}

/**
 * 被接触类招式命中后：静电、火焰体、冰肤
 * @author zjh
 * @date 2026-10-14
 */
export function onContact(s: BattleState, attackerSide: Side, attacker: CreatureInstance, defender: CreatureInstance): void {
  if (attacker.hp <= 0 || attacker.status) return
  const table: Record<string, { chance: number; status: 'paralyze' | 'burn' | 'freeze' }> = {
    static: { chance: 0.25, status: 'paralyze' },
    flame_body: { chance: 0.25, status: 'burn' },
    ice_skin: { chance: 0.15, status: 'freeze' },
  }
  const hook = table[defender.abilityId]
  if (!hook || Math.random() >= hook.chance) return
  say(s, `${battleName(defender)} 的「${abilityName(defender)}」！`)
  tryApplyStatus(s, attackerSide, attacker, hook.status, false)
}

/**
 * 招式命中后：许愿（会心后加速）、微光（灵系附带混乱）
 * @author zjh
 * @date 2026-10-14
 */
export function onHit(s: BattleState, attackerSide: Side, attacker: CreatureInstance, defender: CreatureInstance, move: MoveDef, crit: boolean): void {
  if (crit && attacker.abilityId === 'wish' && attacker.hp > 0) {
    say(s, `${battleName(attacker)} 的「许愿」！`)
    changeStages(s, attackerSide, attacker, { spd: 1 })
  }
  if (attacker.abilityId === 'glimmer' && move.type === 'spirit' && defender.hp > 0 && Math.random() < 0.2) {
    tryApplyVolatile(s, other(attackerSide), defender, 'confused', false)
  }
}

/**
 * 回合结束：自愈、花香
 * @author zjh
 * @date 2026-10-14
 */
export function onTurnEnd(s: BattleState, side: Side, c: CreatureInstance): void {
  if (c.hp <= 0) return
  if (c.abilityId !== 'regen' && c.abilityId !== 'bloom_scent') return
  const healed = restoreHp(c, c.maxHp / 16)
  if (healed > 0) say(s, `${battleName(c)} 的「${abilityName(c)}」回复了 ${healed} HP。`, sideAnim(side, 'heal', 'healEnemy'))
  if (c.abilityId === 'bloom_scent' && c.status && Math.random() < 0.3) {
    c.status = null
    say(s, `花香让 ${battleName(c)} 的异常状态消失了！`)
  }
}

/** 林语每隔几回合响一次 */
export const FOREST_VOICE_EVERY = 3

/**
 * 全场回合结束：林语（场上有该特性的伙伴时，每 3 回合清空双方能力阶级）
 * @author zjh
 * @date 2026-10-15
 */
export function onRoundEnd(s: BattleState): void {
  const sides: Side[] = ['player', 'enemy']
  if (s.turn % 2 === 0) {
    const striker = sides.map((side) => actorOf(s, side)).find((c) => c.hp > 0 && c.abilityId === 'sky_bolt')
    if (striker) {
      const victimSide: Side = s.turn % 4 === 0 ? 'enemy' : 'player'
      const victim = actorOf(s, victimSide)
      if (victim.hp > 0) {
        const d = dealDamage(victim, Math.max(1, Math.floor(victim.maxHp / 10)))
        say(s, `${battleName(striker)} 的「落雷」击中了 ${battleName(victim)}！（-${d}）`, sideAnim(victimSide, 'hurtPlayer', 'hurtEnemy'))
      }
    }
  }
  if (s.turn % FOREST_VOICE_EVERY !== 0) return
  const singer = sides.map((side) => actorOf(s, side)).find((c) => c.hp > 0 && c.abilityId === 'forest_voice')
  if (singer) {
    say(s, `${battleName(singer)} 的「林语」！回声响彻全场，双方的能力变化都消失了。`)
    for (const side of sides) {
      const c = actorOf(s, side)
      volOf(s, c).stages = { atk: 0, def: 0, spd: 0 }
    }
  }
  const rumbler = sides.map((side) => actorOf(s, side)).find((c) => c.hp > 0 && c.abilityId === 'stone_rumble')
  if (!rumbler) return
  say(s, `${battleName(rumbler)} 的「地鸣」！峡谷跟着震了一下。`)
  for (const side of sides) {
    const c = actorOf(s, side)
    if (c.hp <= 0 || isType(c, 'stone')) continue
    const d = dealDamage(c, Math.max(1, Math.floor(c.maxHp / 12)))
    say(s, `落石砸中了 ${battleName(c)}！（-${d}）`, sideAnim(side, 'hurtPlayer', 'hurtEnemy'))
  }
}

/**
 * 致命伤害前：守护者残留 1 HP（每场一次）。返回是否触发
 * @author zjh
 * @date 2026-10-14
 */
export function tryEndure(s: BattleState, c: CreatureInstance, incoming: number): boolean {
  if (c.abilityId !== 'guardian' || incoming < c.hp) return false
  const vol = volOf(s, c)
  if (vol.guardianUsed) return false
  vol.guardianUsed = true
  return true
}

/**
 * 倒下时：涅槃复活（每场一次）或余烬反击。返回 true 表示已复活
 * @author zjh
 * @date 2026-10-14
 */
export function onFaint(s: BattleState, side: Side, c: CreatureInstance): boolean {
  const vol = volOf(s, c)
  if (c.abilityId === 'rebirth' && !vol.rebirthUsed) {
    vol.rebirthUsed = true
    c.hp = Math.max(1, Math.floor(c.maxHp / 2))
    say(s, `${battleName(c)} 的「涅槃」！它从火焰中重生了！`, sideAnim(side, 'heal', 'healEnemy'))
    return true
  }
  if (c.abilityId === 'ember_last') {
    const foe = actorOf(s, other(side))
    if (foe.hp > 0) {
      const dmg = dealDamage(foe, foe.maxHp / 8)
      say(s, `${battleName(c)} 的「余烬」灼伤了 ${battleName(foe)}！（-${dmg}）`, sideAnim(other(side), 'hurtPlayer', 'hurtEnemy'))
    }
  }
  return false
}

/** 野生战逃跑必定成功：胆怯 */
export function guaranteedEscape(c: CreatureInstance): boolean {
  return c.abilityId === 'timid'
}

/** 是否拥有某属性（用于天气伤害免疫） */
export function isType(c: CreatureInstance, type: string): boolean {
  return SPECIES[c.speciesId].type === type
}
