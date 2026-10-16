/**
 * 第七章云阶：风车顺逆、风道滑行、滑翔落点
 * 旗标在场时为顺风，没有旗标为逆风。
 * @author zjh
 * @date 2026-10-16
 */

export const MILL_A = 'cloud_mill_a'
export const MILL_B = 'cloud_mill_b'
export const MILL_C = 'cloud_mill_c'
export const MILLS_SOLVED = 'cloud_mills_solved'

const MILL_KEY = { a: MILL_A, b: MILL_B, c: MILL_C } as const

export type MillId = keyof typeof MILL_KEY

/** 风车岛风道：y=3，x=4、5、6。入口在左，出口在右 */
export const LANE_Y = 3
export const LANE_X0 = 4
export const LANE_X1 = 6
export const LANE_ENTRY = 3
export const LANE_EXIT = 7

export function millKey(id: MillId): string {
  return MILL_KEY[id]
}

/** 这一截风道跟哪一架风车 */
export function millAt(x: number): MillId {
  return x <= LANE_X0 ? 'a' : 'b'
}

/**
 * 拨一次风车。三架都顺时写上 cloud_mills_solved
 * @author zjh
 * @date 2026-10-16
 */
export function toggleMill(id: MillId, has: (k: string) => boolean, set: (k: string, v?: boolean) => void, clear: (k: string) => void): boolean {
  const key = millKey(id)
  const next = !has(key)
  if (next) set(key, true)
  else clear(key)
  const all = (['a', 'b', 'c'] as const).every((m) => (m === id ? next : has(millKey(m))))
  if (all) set(MILLS_SOLVED, true)
  else clear(MILLS_SOLVED)
  return next
}

/**
 * 走进风道时停在哪一格。没走进风道返回 null
 * @author zjh
 * @date 2026-10-16
 */
export function cloudWindEnd(x: number, y: number, dx: number, dy: number, on: (mill: MillId) => boolean): { x: number; y: number } | null {
  if (dy !== 0 || dx === 0) return null
  const nx = x + dx
  if (y !== LANE_Y || nx < LANE_X0 || nx > LANE_X1) return null
  if (!on(millAt(nx))) return { x: LANE_ENTRY, y: LANE_Y }
  let cx = nx
  while (cx >= LANE_X0 && cx <= LANE_X1 && on(millAt(cx))) cx += 1
  return { x: Math.min(cx, LANE_EXIT), y: LANE_Y }
}

/** 第七章之后，滑翔翼能落到这些地方的出生点 */
export const GLIDE_SPOTS: { name: string; mapId: string; flag: string }[] = [
  { name: '余烬山道', mapId: 'pass', flag: 'chapter1_done' },
  { name: '雾泉湖畔', mapId: 'lake', flag: 'lake_unlocked' },
  { name: '回音林', mapId: 'forest', flag: 'forest_unlocked' },
  { name: '锤音镇', mapId: 'hammer', flag: 'canyon_unlocked' },
  { name: '星砂荒原', mapId: 'dunes', flag: 'dunes_unlocked' },
  { name: '霜铃峰', mapId: 'frostpeak', flag: 'frost_unlocked' },
  { name: '云阶·起风岛', mapId: 'cloudstart', flag: 'cloud_unlocked' },
]
