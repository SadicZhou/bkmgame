/**
 * 四音石谜题（纯逻辑）：按「大地 → 流水 → 林叶 → 飞鸟」顺序敲响；敲错全部熄灭；进度存进旗标，读档保留
 * @author zjh
 * @date 2026-10-15
 */

import { ECHO_STONES, FOREST_FLAGS, stoneLitFlag } from '../data/forestMap'

/** 已点亮音石数的旗标 */
export const STONE_STEP_FLAG = 'forest_stone_step'

/** lit 亮起一块 · solved 四块全亮 · wrong 敲错全灭 · already 这块已经亮着 · done 谜题早已解开 */
export type StoneResult = 'lit' | 'solved' | 'wrong' | 'already' | 'done'

/** 读写旗标所需的最小接口（便于单元测试） */
export interface StoneStore {
  getFlag(k: string): unknown
  setFlag(k: string, v?: boolean | number): void
  clearFlag(k: string): void
}

/** 当前已点亮的音石数 */
export function stoneStep(store: StoneStore): number {
  return Number(store.getFlag(STONE_STEP_FLAG) ?? 0) || 0
}

/** 熄灭全部音石并清零进度 */
function resetStones(store: StoneStore): void {
  for (const s of ECHO_STONES) store.clearFlag(stoneLitFlag(s.id))
  store.setFlag(STONE_STEP_FLAG, 0)
}

/**
 * 敲响一块音石
 * @author zjh
 * @date 2026-10-15
 */
export function pressStone(store: StoneStore, stoneId: string): StoneResult {
  if (store.getFlag(FOREST_FLAGS.stonesSolved)) return 'done'
  if (store.getFlag(stoneLitFlag(stoneId))) return 'already'
  const step = stoneStep(store)
  if (ECHO_STONES[step]?.id !== stoneId) {
    resetStones(store)
    return 'wrong'
  }
  store.setFlag(stoneLitFlag(stoneId), true)
  store.setFlag(STONE_STEP_FLAG, step + 1)
  if (step + 1 < ECHO_STONES.length) return 'lit'
  store.setFlag(FOREST_FLAGS.stonesSolved, true)
  return 'solved'
}
