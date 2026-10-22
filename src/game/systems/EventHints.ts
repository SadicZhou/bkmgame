/**
 * 异象 / 小事件给玩家看的提示文案（告示板、HUD、toast）
 * @author zjh
 * @date 2026-10-22
 */

import { SPECIES } from '../data/creatures'
import { MAPS } from '../data/maps'
import { MINOR_EVENTS, type MinorEventId } from '../data/phenomena'
import type { WorldSave } from './WorldClock'

/** 小事件进行中的附加说明（按种类） */
export function minorDetail(w: WorldSave): string {
  const m = w.minor
  if (!m.id) return ''
  switch (m.id) {
    case 'migration':
      return m.speciesId ? `大量${SPECIES[m.speciesId].name}出没` : MINOR_EVENTS.migration.desc
    case 'shimmer':
      return '异色更容易出现'
    case 'crystal':
      return '地图上有发光的心火结晶，踩上去就能捡'
    case 'merchant':
      return '找头顶「商」字的行商，可买资质卡与技能书'
    case 'strong_herd':
      return '强壮个体出现率升至四成'
    case 'gathering':
      return '已击败的训练家可立刻再战，焰币翻倍'
    default:
      return MINOR_EVENTS[m.id].desc
  }
}

/**
 * 告示板用的小事件整行；没有进行中的小事件时返回 null
 * @author zjh
 * @date 2026-10-22
 */
export function minorBoardLine(w: WorldSave): string | null {
  const m = w.minor
  if (!m.id || !m.mapId) return null
  const def = MINOR_EVENTS[m.id]
  const where = MAPS[m.mapId]?.name ?? m.mapId
  const detail = minorDetail(w)
  return `【${def.name}】${where}：${detail}。（还剩约 ${m.stepsLeft} 步）`
}

/**
 * HUD 第二行小事件摘要；没有时返回 null
 * @author zjh
 * @date 2026-10-22
 */
export function minorHudLine(w: WorldSave, currentMapId: string): string | null {
  const m = w.minor
  if (!m.id || !m.mapId) return null
  const def = MINOR_EVENTS[m.id]
  const here = m.mapId === currentMapId
  const where = here ? '此地' : MAPS[m.mapId]?.name ?? m.mapId
  return `◇ ${def.name}·${where} · 剩${m.stepsLeft}步`
}

/**
 * 小事件开始时的短 toast
 * @author zjh
 * @date 2026-10-22
 */
export function minorStartedToast(id: MinorEventId, mapId: string, speciesId?: string): string {
  const def = MINOR_EVENTS[id]
  const where = MAPS[mapId]?.name ?? mapId
  if (id === 'migration' && speciesId) return `【${def.name}】${where}出现大量${SPECIES[speciesId].name}！`
  if (id === 'merchant') return `【${def.name}】行商在${where}摆摊了，去找头顶「商」字的人。`
  if (id === 'gathering') return `【${def.name}】${where}的训练家聚在一起，可以立刻再战！`
  if (id === 'strong_herd') return `【${def.name}】${where}的伙伴看起来特别壮。`
  if (id === 'crystal') return `【${def.name}】${where}出现了发光的结晶。`
  if (id === 'shimmer') return `【${def.name}】${where}闪着奇异的光……`
  return `【${def.name}】${where}`
}

/**
 * 小事件结束时的 toast
 * @author zjh
 * @date 2026-10-22
 */
export function minorEndedToast(id: MinorEventId): string {
  const name = MINOR_EVENTS[id].name
  switch (id) {
    case 'merchant':
      return `【${name}】行商收摊走了。`
    case 'gathering':
      return `【${name}】训练家们散了。`
    case 'crystal':
      return `【${name}】结晶的光熄灭了。`
    case 'strong_herd':
      return `【${name}】强壮的浪潮退去了。`
    case 'shimmer':
      return `【${name}】奇异的光渐渐淡了。`
    case 'migration':
      return `【${name}】迁徙的队伍走远了。`
    default:
      return `【${name}】结束了。`
  }
}
