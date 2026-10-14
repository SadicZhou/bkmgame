/**
 * 伙伴信息文本：评级、性格、特性、资质星级、技能与 PP（队伍 / 寄存所 / 战斗共用）
 * @author zjh
 * @date 2026-10-14
 */

import { ABILITIES } from '../data/abilities'
import {
  MOVES,
  RARITY_INFO,
  SPECIES,
  TYPE_LABEL,
  battleName,
  expToNext,
  type CreatureInstance,
} from '../data/creatures'
import { natureLabel } from '../data/natures'
import { STATUS_LABEL } from '../systems/StatusEffects'
import { GRADE_INFO, STAT_KEYS, talentGrade, talentStars, talentTotal } from '../systems/Talent'

const STAT_NAME = { hp: 'HP', atk: '攻', def: '防', spd: '速' } as const

/** 亲密度红心（0~5 颗） */
export function friendshipHearts(f: number): string {
  const n = Math.min(5, Math.floor(f / 51))
  return '♥'.repeat(n) + '♡'.repeat(5 - n)
}

/** 评级标签，如「天赋 A」，觉醒后带火苗 */
export function gradeTag(c: CreatureInstance): string {
  return `天赋 ${talentGrade(c.talent)}${c.awakened ? '🔥' : ''}`
}

/** 列表行标题：名字 + 等级 + 状态 */
export function rowLabel(c: CreatureInstance, prefix = ''): string {
  const status = c.status ? ` [${STATUS_LABEL[c.status]}]` : ''
  return `${prefix}${battleName(c)} Lv.${c.level}${status}`
}

/** 技能列表：名称(属性 威力) PP 剩余/上限 */
export function movesText(c: CreatureInstance): string {
  return c.moves
    .map((s) => {
      const m = MOVES[s.id]
      if (!m) return ''
      const pow = m.category === 'attack' ? `${m.power}` : '变'
      return `${m.name}(${TYPE_LABEL[m.type]}${pow} ${s.pp}/${m.pp})`
    })
    .join(' ')
}

/** 资质：鉴定前只显示评级，鉴定后显示星级 */
export function talentText(c: CreatureInstance): string {
  const grade = talentGrade(c.talent)
  const head = `${gradeTag(c)}（${GRADE_INFO[grade].label}）`
  if (!c.appraised) return `${head} · 资质未鉴定`
  const stars = STAT_KEYS.map((k) => `${STAT_NAME[k]}${talentStars(c.talent[k])}`).join(' ')
  return `${head} · 总和 ${talentTotal(c.talent)}/80\n${stars}`
}

/**
 * 完整详情（列表底部说明区）
 * @author zjh
 * @date 2026-10-14
 */
export function creatureDetail(c: CreatureInstance): string {
  const sp = SPECIES[c.speciesId]
  const rarity = RARITY_INFO[sp.rarity]
  const evo = sp.evolvesTo && sp.evolveLevel ? ` · ${sp.evolveLevel} 级进化` : ''
  const ability = ABILITIES[c.abilityId]?.name ?? '—'
  const flags = `${c.shiny ? '✦异色 ' : ''}${rarity.mark}${rarity.label}`
  return (
    `[${TYPE_LABEL[sp.type]}] ${flags} · ${natureLabel(c.nature)} · 特性 ${ability}\n` +
    `攻${c.atk} 防${c.def} 速${c.spd} · 经验 ${c.exp}/${expToNext(c.level)}${evo} · ${friendshipHearts(c.friendship)}\n` +
    `${talentText(c)}\n` +
    `技能：${movesText(c)}`
  )
}

/** 特性完整说明 */
export function abilityDetail(c: CreatureInstance): string {
  const a = ABILITIES[c.abilityId]
  return a ? `特性「${a.name}」：${a.desc}` : ''
}
