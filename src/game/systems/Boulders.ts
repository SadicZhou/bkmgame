/**
 * 推石规则（纯函数）：巨石位置存在旗标里（"x,y" 或 sunk）
 * @author zjh
 * @date 2026-10-16
 */

import { BOULDERS, GATE, PLATES, type BoulderDef } from '../data/canyonMap'
import type { TileKind } from '../data/maps'

export const boulderFlag = (id: string) => `boulder_${id}`

export interface BoulderPos {
  x: number
  y: number
  sunk: boolean
}

type GetFlag = (k: string) => unknown

/** 当前坐标；没被推过时用初始位置 */
export function boulderAt(def: BoulderDef, getFlag: GetFlag): BoulderPos {
  const raw = getFlag(boulderFlag(def.id))
  if (raw === 'sunk') return { x: def.hole?.x ?? def.x, y: def.hole?.y ?? def.y, sunk: true }
  if (typeof raw === 'string') {
    const [x, y] = raw.split(',').map(Number)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y, sunk: false }
  }
  return { x: def.x, y: def.y, sunk: false }
}

export function allBoulders(getFlag: GetFlag): { def: BoulderDef; pos: BoulderPos }[] {
  return BOULDERS.map((def) => ({ def, pos: boulderAt(def, getFlag) }))
}

/** 还在挡路的巨石 */
export function boulderBlocks(x: number, y: number, getFlag: GetFlag): boolean {
  return allBoulders(getFlag).some((b) => !b.pos.sunk && b.pos.x === x && b.pos.y === y)
}

/** 两块踏板都压着石头时石门打开 */
export function gateOpen(getFlag: GetFlag): boolean {
  const standing = allBoulders(getFlag).filter((b) => !b.pos.sunk)
  return PLATES.every((p) => standing.some((b) => b.pos.x === p.x && b.pos.y === p.y))
}

/** 裂缝已填 / 石门已开：这格墙可以走 */
export function wallOpened(x: number, y: number, getFlag: GetFlag): boolean {
  if (gateOpen(getFlag) && x === GATE.x && y === GATE.y) return true
  return allBoulders(getFlag).some((b) => b.pos.sunk && b.def.hole?.x === x && b.def.hole?.y === y)
}

export interface PushResult {
  ok: boolean
  reason?: string
  sunk?: boolean
  x?: number
  y?: number
}

/**
 * 能否把面前这格的石头推向 (dx,dy)
 * @param walkable 目标格的地形（墙仅在正好是这块石头的裂缝时允许）
 * @author zjh
 * @date 2026-10-16
 */
export function tryPush(
  x: number,
  y: number,
  dx: number,
  dy: number,
  getFlag: GetFlag,
  walkable: (tx: number, ty: number) => TileKind | null,
  blocked: (tx: number, ty: number) => boolean,
): PushResult {
  const found = allBoulders(getFlag).find((b) => !b.pos.sunk && b.pos.x === x && b.pos.y === y)
  if (!found) return { ok: false }
  const nx = x + dx
  const ny = y + dy
  const hole = found.def.hole
  const intoHole = !!hole && hole.x === nx && hole.y === ny
  const tile = walkable(nx, ny)
  if (!intoHole && (!tile || tile === 'wall' || tile === 'water' || tile === 'rock' || tile === 'warp')) {
    return { ok: false, reason: '这边推不过去。' }
  }
  if (boulderBlocks(nx, ny, getFlag) || blocked(nx, ny)) return { ok: false, reason: '前面有东西挡着。' }
  return { ok: true, sunk: intoHole, x: nx, y: ny, reason: found.def.id }
}

/** 把石头写进旗标。reason 字段在 ok 时是石头 id */
export function commitPush(id: string, result: PushResult, setFlag: (k: string, v: string) => void): void {
  if (!result.ok || result.x === undefined || result.y === undefined) return
  setFlag(boulderFlag(id), result.sunk ? 'sunk' : `${result.x},${result.y}`)
}

/** 推回原位（人站在初始格上的石头跳过） */
export function resetBoulders(getFlag: GetFlag, setFlag: (k: string, v: string) => void, occupied: (x: number, y: number) => boolean): number {
  let n = 0
  for (const def of BOULDERS) {
    if (occupied(def.x, def.y)) continue
    const pos = boulderAt(def, getFlag)
    if (pos.sunk || pos.x !== def.x || pos.y !== def.y) {
      setFlag(boulderFlag(def.id), `${def.x},${def.y}`)
      n++
    }
  }
  return n
}
