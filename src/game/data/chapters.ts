/**
 * 章节收尾：击败章节守护兽后的徽记、解锁旗标、奖励道具，以及是否进入结局
 * @author zjh
 * @date 2026-10-15
 */

import { BADGES, type BadgeId } from './badges'
import { ITEMS } from './items'

export interface ChapterEnd {
  /** 守护兽战胜利写入的旗标 */
  bossFlag: string
  /** 章节卡：标题 / 副标题（为空则不显示） */
  card?: { title: string; subtitle: string }
  /** 战后说明 */
  notes: string[]
  badge: BadgeId
  /** 额外写入的旗标（解锁新区域等） */
  unlockFlags: string[]
  /** 奖励道具（重要物品，只发一次） */
  items?: string[]
  /** 是否播放通关结局 */
  ending: boolean
}

export const CHAPTER_ENDS: ChapterEnd[] = [
  {
    bossFlag: 'boss_beaten',
    card: { title: '第一章完 · 火种', subtitle: '新的旅途：雾泉湖畔' },
    notes: [
      '熔鬃狮安静下来，山巅的火种重新亮起温暖的光……',
      '火种旁的灯台上，被人盖了一半的黑色灯罩——这场躁动，是有人故意为之。',
    ],
    badge: 'flame',
    unlockFlags: ['chapter1_done', 'lake_unlocked'],
    ending: false,
  },
  {
    bossFlag: 'whale_beaten',
    notes: ['黑色灯罩从灯台上滑落，湖心的灯重新亮了起来。', '沧澜鲸用尾鳍在湖面上，轻轻写下了「谢谢」。'],
    badge: 'tide',
    unlockFlags: ['chapter2_done'],
    items: ['good_rod'],
    ending: true,
  },
]

/**
 * 根据战斗胜利旗标找到章节收尾配置；不是章节守护兽返回 null
 * @author zjh
 * @date 2026-10-15
 */
export function chapterEndFor(flag: string | undefined): ChapterEnd | null {
  if (!flag) return null
  return CHAPTER_ENDS.find((c) => c.bossFlag === flag) ?? null
}

/** 写入状态所需的最小接口（便于单元测试） */
export interface FlagStore {
  getFlag(k: string): unknown
  setFlag(k: string, v?: boolean): void
  itemCount(id: string): number
  addItem(id: string, n?: number): void
}

/**
 * 发放章节奖励（可重复调用，不会重复发道具）；返回获得物品的说明
 * @author zjh
 * @date 2026-10-15
 */
export function grantChapterRewards(end: ChapterEnd, store: FlagStore): string[] {
  const out: string[] = []
  const badge = BADGES[end.badge]
  if (!store.getFlag(badge.flag)) {
    store.setFlag(badge.flag, true)
    out.push(`获得了「${badge.name}」！（${badge.desc}）`)
  }
  for (const f of end.unlockFlags) store.setFlag(f, true)
  for (const id of end.items ?? []) {
    if (store.itemCount(id) > 0) continue
    store.addItem(id, 1)
    out.push(`获得了重要物品「${ITEMS[id]?.name ?? id}」！`)
  }
  return out
}
