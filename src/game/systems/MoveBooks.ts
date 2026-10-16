/**
 * 技能书：岩崩只能教给岩系、或招式表里本来就有岩崩的伙伴
 * @author zjh
 * @date 2026-10-16
 */

import { MAX_MOVES, SPECIES, battleName, fullSlot, type CreatureInstance } from '../data/creatures'

/**
 * 学不会时返回原因，学得会返回 null
 * @author zjh
 * @date 2026-10-16
 */
export function rockSlideReason(c: CreatureInstance): string | null {
  const sp = SPECIES[c.speciesId]
  const listed = sp.learnset.some((e) => e.moveId === 'rock_slide')
  if (sp.type !== 'stone' && !listed) return '学不会岩崩'
  if (c.moves.some((m) => m.id === 'rock_slide')) return '已经会岩崩了'
  if (c.moves.length >= MAX_MOVES) return '技能已经满了'
  return null
}

/** 学会岩崩。学不会时返回原因，不改技能 */
export function teachRockSlide(c: CreatureInstance): string {
  const reason = rockSlideReason(c)
  if (reason) return `${battleName(c)}：${reason}`
  c.moves.push(fullSlot('rock_slide'))
  return `${battleName(c)} 学会了岩崩！`
}
