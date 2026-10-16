/**
 * 折叠滑板：不消耗的载具。野外展开后移动更快，室内收起，不能和伙伴骑乘一起用。
 * @author zjh
 * @date 2026-10-16
 */

/** 存档旗标：滑板正展开 */
export const BOARD_FLAG = 'board_out'
/** 道具 id */
export const BOARD_ID = 'fold_board'

/** 不能展开的原因；可以展开返回 null */
export function boardBlock(opts: { owned: boolean; outdoor: boolean; petRiding: boolean }): string | null {
  if (!opts.owned) return '还没有滑板。晨曦小镇的杂货铺有一辆。'
  if (!opts.outdoor) return '这里不方便展开滑板。'
  if (opts.petRiding) return '先从伙伴身上下来，再展开滑板。'
  return null
}

/** 展开时每格移动更快 */
export function boardSpeed(baseMs: number, on: boolean): number {
  return on ? Math.max(70, Math.round(baseMs * 0.62)) : baseMs
}
