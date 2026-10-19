/**
 * 通关后的恢复：冠军之路每场之间回复三成体力，倒下的伙伴不醒来
 * @author zjh
 * @date 2026-10-19
 */

/**
 * 回复最大体力的 30%
 * @author zjh
 * @date 2026-10-19
 */
export function healThird(party: { hp: number; maxHp: number }[]): number {
  let healed = 0
  for (const c of party) {
    if (c.hp <= 0 || c.hp >= c.maxHp) continue
    const gain = Math.max(1, Math.floor(c.maxHp * 0.3))
    const next = Math.min(c.maxHp, c.hp + gain)
    if (next !== c.hp) healed += 1
    c.hp = next
  }
  return healed
}

/** 灯灯走过的五处旧地 */
export const TRACE_FLAGS = ['trace_pass', 'trace_lake', 'trace_forest', 'trace_town', 'trace_tower'] as const

/**
 * 已经走过几处
 * @author zjh
 * @date 2026-10-19
 */
export function traceCount(has: (key: string) => boolean): number {
  return TRACE_FLAGS.filter((k) => has(k)).length
}
