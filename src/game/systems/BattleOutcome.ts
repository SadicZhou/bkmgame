/**
 * 训练家 / 守护兽战的剧情结算：连战衔接、连战失败回滚、章节收尾（徽记、解锁、章节卡或结局）
 * BattleScene.finish() 只需调用 settleStoryBattle，按返回的去向切场景。
 * @author zjh
 * @date 2026-10-15
 */

import { chapterEndFor, grantChapterRewards } from '../data/chapters'
import type { ChapterCardData } from '../scenes/ChapterScene'
import { GameState, type PendingBattle } from '../state/GameState'

export interface StoryOutcome {
  notes: string[]
  /** 战后去向；为空则按默认回世界 */
  next?: { scene: 'Chapter'; data: ChapterCardData } | { scene: 'Ending' }
}

/**
 * 结算剧情战结果
 * @author zjh
 * @date 2026-10-15
 */
export function settleStoryBattle(pending: PendingBattle, won: boolean): StoryOutcome {
  if (!won) {
    for (const f of pending.chainResetFlags ?? []) GameState.clearFlag(f)
    GameState.chainNpcId = null
    return { notes: pending.chainResetFlags?.length ? ['（连战失败了……下次要从头再来。）'] : [] }
  }

  GameState.chainNpcId = pending.chainNpcId ?? null
  if (!pending.isBoss) return { notes: [] }

  const end = chapterEndFor(pending.flagOnWin)
  if (!end) return { notes: [] }
  const notes = [...end.notes, ...grantChapterRewards(end, GameState)]
  if (end.ending) return { notes, next: { scene: 'Ending' } }
  if (end.card) {
    return { notes, next: { scene: 'Chapter', data: { ...end.card, badge: end.badge } } }
  }
  return { notes }
}
