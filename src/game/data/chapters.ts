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
  {
    bossFlag: 'deer_beaten',
    card: { title: '第三章完 · 回音', subtitle: '羁绊系统开放 · 新的旅途：千岩峡谷' },
    notes: [
      '黑色灯罩从古树顶端滑落，林心古树亮起了温暖的绿光。',
      '林语鹿的鹿角铃铛一齐响起，回声传遍了整片林子——蓬尾鼠、旋叶蝠、伞灵菇此起彼伏地回应着。',
      '林语鹿用鹿角轻轻碰了碰你的伙伴。',
      '苔：（跑过来）听！整片林子都在唱歌！',
      '苔：……旅人，你的伙伴刚才看你的眼神，跟林语鹿看古树一模一样。',
      '苔：那是「羁绊」。以前阿禾旅长教过我——现在，你也能看见了。',
    ],
    badge: 'leaf',
    unlockFlags: ['chapter3_done', 'canyon_unlocked'],
    ending: false,
  },
  {
    bossFlag: 'rhino_beaten',
    card: { title: '第四章完 · 磐谷', subtitle: '新的旅途：星砂荒原' },
    notes: [
      '磐角犀用角轻轻推开最后一块钻机零件，岩灯台亮了起来。',
      '峡谷的摇晃停了。锤音镇那边，传来久违的叮叮当当——全镇的锤子又敲响了。',
      '砧低下头，对磐角犀说：对不起，也谢谢你。',
    ],
    badge: 'stone',
    unlockFlags: ['chapter4_done', 'dunes_unlocked'],
    items: ['dust_badge'],
    ending: false,
  },
  {
    bossFlag: 'falcon_beaten',
    card: { title: '第五章完 · 星砂', subtitle: '新的旅途：霜铃峰' },
    notes: [
      '锁链烧断了。雷鸣隼振翅飞上一圈，雷心坑安静下来。',
      '沙暴散开的地方，露出通往霜铃峰的方向，天上挂着一层极光。',
      '星图上，第五颗星亮了。',
    ],
    badge: 'volt',
    unlockFlags: ['chapter5_done', 'frost_unlocked'],
    items: ['star_charm'],
    ending: false,
  },
  {
    bossFlag: 'crane_beaten',
    card: { title: '第六章完 · 霜铃', subtitle: '新的旅途：云阶浮岛' },
    notes: [
      '冰柱碎开。霜铃鹤展翅，峰顶的冰铃一起响了起来。',
      '心火极光从霜铃峰铺开，晨曦小镇的夜空也亮了。',
      '望第一次伸手去碰伙伴身上的火，笑出了声。',
    ],
    badge: 'frost',
    unlockFlags: ['chapter6_done', 'heart_aurora'],
    ending: false,
  },
  {
    bossFlag: 'roc_beaten',
    notes: [
      '岚翼鹏展翅，五座岛之间的风重新连上了。',
      '它低下头。六座已亮的灯和云上这一座，连成一只鸟的形状。',
    ],
    badge: 'gale',
    unlockFlags: ['badge_gale'],
    ending: false,
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
