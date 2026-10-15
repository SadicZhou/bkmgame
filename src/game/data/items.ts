/**
 * 道具数据：回复、复活、状态解除、PP 回复、收服、野外道具
 * @author zjh
 * @date 2026-10-14
 */

import type { StatusId } from './moves'

/** key：重要物品（剧情获得，不能出售、不能在战斗中使用） */
export type ItemKind = 'heal' | 'revive' | 'cure' | 'pp' | 'catch' | 'lure' | 'repel' | 'key'

export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  /**
   * heal：回复 HP 数值；revive：复活后 HP 比例；pp：每个技能回复量（0 = 回满）；
   * catch：收服倍率；lure / repel：持续步数
   */
  value: number
  price: number
  desc: string
}

export const ITEMS: Record<string, ItemDef> = {
  potion: { id: 'potion', name: '伤药', kind: 'heal', value: 25, price: 30, desc: '回复 1 只伙伴 25 点 HP。' },
  super_potion: { id: 'super_potion', name: '好伤药', kind: 'heal', value: 60, price: 80, desc: '回复 1 只伙伴 60 点 HP。' },
  revive: { id: 'revive', name: '复苏草', kind: 'revive', value: 0.5, price: 120, desc: '让倒下的伙伴恢复一半 HP。' },
  full_heal: { id: 'full_heal', name: '万灵药', kind: 'cure', value: 0, price: 120, desc: '解除 1 只伙伴的灼烧、麻痹、冻结。' },
  pp_fruit: { id: 'pp_fruit', name: 'PP 果', kind: 'pp', value: 10, price: 60, desc: '1 只伙伴的每个技能各回复 10 PP。' },
  pp_honey: { id: 'pp_honey', name: 'PP 蜜', kind: 'pp', value: 0, price: 200, desc: '1 只伙伴的所有技能 PP 回满。' },
  soothe_berry: { id: 'soothe_berry', name: '安抚果', kind: 'catch', value: 1, price: 50, desc: '野生战使用，安抚对手使其加入队伍。对手 HP 越低、处于异常状态时越容易成功。' },
  honey_berry: { id: 'honey_berry', name: '蜜安抚果', kind: 'catch', value: 1.8, price: 150, desc: '更香甜的安抚果，成功率约为普通安抚果的 1.8 倍。' },
  lure_bell: { id: 'lure_bell', name: '引兽铃', kind: 'lure', value: 100, price: 100, desc: '100 步内遇敌率 ×1.5，稀有伙伴出现率 ×2。' },
  repel: { id: 'repel', name: '驱兽香', kind: 'repel', value: 200, price: 80, desc: '200 步内，比首发等级低的野生伙伴不会靠近。' },
  old_rod: { id: 'old_rod', name: '旧钓竿', kind: 'key', value: 0, price: 0, desc: '泉守汐送的钓竿。面朝水面按确认就能钓鱼。' },
  good_rod: { id: 'good_rod', name: '好钓竿', kind: 'key', value: 0, price: 0, desc: '沧澜鲸的鳞片缠在竿头，能钓到更深处的伙伴。' },
}

/** 重要物品（背包末尾展示） */
export const KEY_ITEMS: string[] = ['old_rod', 'good_rod']

/** 商店货架顺序 */
export const SHOP_STOCK: string[] = [
  'potion',
  'super_potion',
  'revive',
  'full_heal',
  'pp_fruit',
  'pp_honey',
  'soothe_berry',
  'honey_berry',
  'lure_bell',
  'repel',
]

/** 背包展示顺序 */
export const ITEM_ORDER: string[] = [...SHOP_STOCK, ...KEY_ITEMS]

/** 队伍上限 */
export const PARTY_LIMIT = 6

/** 状态异常对收服的加成 */
const STATUS_CATCH_BONUS: Record<StatusId, number> = { paralyze: 1.5, freeze: 1.5, burn: 1.2 }

/** 收服计算的附加条件 */
export interface CatchContext {
  status?: StatusId | null
  /** 物种收服倍率（唯一精灵较低） */
  speciesRate?: number
  /** 持有异象信物 ×2 */
  token?: boolean
}

/**
 * 计算安抚成功率：对手 HP 越低越高；异常状态、异象信物提供加成
 * @author zjh
 * @date 2026-10-14
 */
export function catchChance(hp: number, maxHp: number, itemRate: number, ctx: CatchContext = {}): number {
  const ratio = maxHp > 0 ? hp / maxHp : 1
  const statusBonus = ctx.status ? STATUS_CATCH_BONUS[ctx.status] : 1
  const rate = itemRate * (ctx.speciesRate ?? 1) * statusBonus * (ctx.token ? 2 : 1)
  const base = (1 - ratio * 0.75) * 0.6 * rate + 0.1 * Math.min(1, ctx.speciesRate ?? 1)
  return Math.max(0.03, Math.min(0.95, base))
}
