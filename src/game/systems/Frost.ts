/**
 * 第六章霜铃：寒冷值、冰面滑行、冰块推动
 * 纯函数，不读场景。剧本见 docs/story/06-第六章-霜铃.md
 * @author zjh
 * @date 2026-10-16
 */

import { SPECIES } from '../data/creatures'
import { isSolid, type TileKind } from '../data/maps'

export const FROST_FLAGS = {
  unlocked: 'frost_unlocked',
  slide: 'frost_slide_solved',
  twins: 'twins_beaten',
  crane: 'crane_beaten',
  chapter: 'chapter6_done',
  aurora: 'heart_aurora',
  metShio: 'frost_met_shio',
} as const

export const slideFlag = (id: string) => `frost_slide_${id}`
export const blockFlag = (id: string) => `frost_ice_${id}`

/** 寒冷值上限。满了以后每 10 步掉一次体力 */
export const COLD_MAX = 100
export const COLD_CHIP_EVERY = 10

export interface ColdTick {
  cold: number
  /** 满值后累计的步数 */
  fullSteps: number
  justFull: boolean
  chip: boolean
}

/**
 * 霜铃峰走一步。焰系首发时寒冷涨得慢一半
 * @author zjh
 * @date 2026-10-16
 */
export function tickCold(cold: number, fullSteps: number, flameLead: boolean): ColdTick {
  if (cold >= COLD_MAX) {
    const steps = fullSteps + 1
    return { cold: COLD_MAX, fullSteps: steps, justFull: false, chip: steps % COLD_CHIP_EVERY === 0 }
  }
  const gain = flameLead ? 0.5 : 1
  const next = Math.min(COLD_MAX, Math.round((cold + gain) * 2) / 2)
  return { cold: next, fullSteps: 0, justFull: next >= COLD_MAX, chip: false }
}

/** 篝火把寒冷清零 */
export function warmCold(): ColdTick {
  return { cold: 0, fullSteps: 0, justFull: false, chip: false }
}

/**
 * 满寒冷时掉 5% 体力，但不会因此倒下
 * @author zjh
 * @date 2026-10-16
 */
export function chipCold(party: { hp: number; maxHp: number }[]): number {
  let n = 0
  for (const c of party) {
    if (c.hp <= 1) continue
    const loss = Math.max(1, Math.floor(c.maxHp * 0.05))
    const before = c.hp
    c.hp = Math.max(1, c.hp - loss)
    if (c.hp < before) n += 1
  }
  return n
}

export function leadIsFlame(party: { speciesId: string; hp: number }[]): boolean {
  const lead = party.find((c) => c.hp > 0)
  return !!lead && SPECIES[lead.speciesId]?.type === 'flame'
}

export interface SlideEnd {
  x: number
  y: number
}

/**
 * 从当前位置沿方向滑到撞上障碍，或滑到非冰面（码头、小路）停下
 * @author zjh
 * @date 2026-10-16
 */
export function slideEnd(
  x: number,
  y: number,
  dx: number,
  dy: number,
  tileAt: (x: number, y: number) => TileKind | null,
  blocked: (x: number, y: number) => boolean,
): SlideEnd {
  let cx = x
  let cy = y
  for (let n = 0; n < 32; n++) {
    const nx = cx + dx
    const ny = cy + dy
    if (blocked(nx, ny)) return { x: cx, y: cy }
    const tile = tileAt(nx, ny)
    if (!tile || isSolid(tile)) return { x: cx, y: cy }
    cx = nx
    cy = ny
    if (tile !== 'ice') return { x: cx, y: cy }
  }
  return { x: cx, y: cy }
}

/** 冰湖上三处停靠点，站上去算解开该区 */
export const SLIDE_GOALS = [
  { id: '1', x: 5, y: 3 },
  { id: '2', x: 7, y: 5 },
  { id: '3', x: 12, y: 7 },
] as const

export interface IceBlockDef {
  id: string
  x: number
  y: number
}

/** 区 3 的冰块，推开后滑道才通 */
export const ICE_BLOCKS: IceBlockDef[] = [{ id: 'b1', x: 10, y: 7 }]

export function blockPos(def: IceBlockDef, getFlag: (k: string) => unknown): { x: number; y: number } {
  const raw = getFlag(blockFlag(def.id))
  if (typeof raw === 'string') {
    const [x, y] = raw.split(',').map(Number)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  return { x: def.x, y: def.y }
}

export function iceBlockAt(x: number, y: number, getFlag: (k: string) => unknown): IceBlockDef | null {
  for (const def of ICE_BLOCKS) {
    const pos = blockPos(def, getFlag)
    if (pos.x === x && pos.y === y) return def
  }
  return null
}

export interface PushResult {
  ok: boolean
  reason?: string
}

/**
 * 把面前的冰块推一格。推到墙、人或另一块冰上会失败
 * @author zjh
 * @date 2026-10-16
 */
export function tryPushIce(
  x: number,
  y: number,
  dx: number,
  dy: number,
  getFlag: (k: string) => unknown,
  tileAt: (x: number, y: number) => TileKind | null,
  blocked: (x: number, y: number) => boolean,
): PushResult & { id?: string; nx?: number; ny?: number } {
  const def = iceBlockAt(x, y, getFlag)
  if (!def) return { ok: false }
  const nx = x + dx
  const ny = y + dy
  const tile = tileAt(nx, ny)
  if (!tile || isSolid(tile) || blocked(nx, ny) || iceBlockAt(nx, ny, getFlag)) return { ok: false, reason: '这边推不过去。' }
  return { ok: true, id: def.id, nx, ny }
}
