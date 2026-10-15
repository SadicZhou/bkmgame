/**
 * v3.1 存档补齐：v3.0 已击败熔鬃狮 / 沧澜鲸的存档，读档时补发章节徽记与解锁；
 * 连战打到一半的存档回滚到连战开始前（可重复执行）
 * @author zjh
 * @date 2026-10-15
 */

import { CHAPTER_ENDS, grantChapterRewards, type FlagStore } from '../data/chapters'

/** 连战旗标对：[第一战, 第二战] */
const CHAIN_PAIRS: [string, string][] = [['scout1_beaten', 'scout2_beaten']]

/**
 * 补齐章节奖励；返回需要在进入世界时提示一次的说明（无需补齐时为空）
 * @author zjh
 * @date 2026-10-15
 */
export function migrateChapters(store: FlagStore & { clearFlag(k: string): void }): string[] {
  const notes: string[] = []
  // 连战中途刷新：第一战的胜利不算数，下次从头打
  for (const [first, second] of CHAIN_PAIRS) {
    if (store.getFlag(first) && !store.getFlag(second)) store.clearFlag(first)
  }
  for (const end of CHAPTER_ENDS) {
    if (!store.getFlag(end.bossFlag)) continue
    if (end.unlockFlags.every((f) => store.getFlag(f))) continue
    notes.push(...grantChapterRewards(end, store))
    if (end.unlockFlags.includes('lake_unlocked')) notes.push('雾泉湖畔已解锁：从青苔草地南口出发吧。')
  }
  return notes
}
