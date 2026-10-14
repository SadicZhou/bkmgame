/**
 * 测试辅助：可复现的随机源、固定序列随机源
 * @author zjh
 * @date 2026-10-14
 */

/** mulberry32 种子随机数，保证测试可复现 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 依次返回给定值，用完后一直返回最后一个 */
export function sequence(...values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}
